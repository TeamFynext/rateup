/**
 * One place for chatbots on every channel. WhatsApp, Instagram and Messenger chatbots are
 * all rows of WaAutomatedReply, told apart by `platform`.
 *
 * Every query is scoped to the org. WhatsApp chatbots also need the org's WhatsApp
 * subscription, as on the old WhatsApp route; Instagram and Messenger never did.
 */

import prisma from "../../utils/prisma.js";
import { getSubscriptionGate } from "../subscription/subscription.service.js";
import { subscriptionDenial, type SubscriptionDenial } from "../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { PlatformType } from "../../generated/prisma/enums.js";
import { CHATBOT_PLATFORMS, type ChatbotPlatform } from "./chatbotBlocks.js";

/**
 * The fields the list shows. The graph is sent by `getChatbot`, and by the list only when
 * asked for (`withGraph`), for callers that look for a chatbot by what it contains.
 */
export interface ChatbotSummary {
  id: string;
  name: string;
  platform: ChatbotPlatform;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  stepCount: number;
  whatsappSettingsPhoneId: string | null;
  /** Conversations it has started, and how many reached the end. */
  runs: { started: number; completed: number };
  matchData?: unknown;
}

/** What blocks a channel for this org, if anything. */
export type ChannelLock = SubscriptionDenial;

/**
 * Whether the org may use WhatsApp chatbots, with the same checks as the old WhatsApp route's
 * getVerifySubscriptionHandler: no subscription or no WhatsApp feature blocks everything; an
 * expired one blocks writes only.
 */
export async function whatsappLock(
  orgId: string,
  { write }: { write: boolean },
): Promise<ChannelLock | null> {
  return subscriptionDenial(
    await getSubscriptionGate(orgId),
    [SubscriptionFeaturePathName.Whatsapp],
    { write },
  );
}

/** The lock on one channel; only WhatsApp has one today. */
export async function channelLock(
  orgId: string,
  platform: ChatbotPlatform,
  options: { write: boolean },
): Promise<ChannelLock | null> {
  return platform === PlatformType.WHATSAPP ? whatsappLock(orgId, options) : null;
}

/** The blocks a chatbot sends or asks, leaving out its start block. */
function stepCount(matchData: unknown): number {
  const nodes = (matchData as { json?: { nodes?: Array<{ type?: unknown }> } } | null)?.json?.nodes;
  return Array.isArray(nodes) ? nodes.filter((node) => node?.type !== "startNode").length : 0;
}

/**
 * The org's chatbots, newest first, on one channel or all. Channels the org can't use are
 * left out and named in `locked`, so the page can offer to connect or upgrade instead of
 * failing.
 */
export async function listChatbots(
  orgId: string,
  platform?: ChatbotPlatform,
  { withGraph = false, search }: { withGraph?: boolean; search?: string } = {},
) {
  const wanted = platform ? [platform] : [...CHATBOT_PLATFORMS];
  const locked: Partial<Record<ChatbotPlatform, ChannelLock>> = {};
  for (const p of wanted) {
    const lock = await channelLock(orgId, p, { write: false });
    if (lock) locked[p] = lock;
  }
  const open = wanted.filter((p) => !locked[p]);

  const rows = open.length
    ? await prisma.waAutomatedReply.findMany({
        where: {
          orgId,
          platform: { in: open },
          ...(search && { name: { contains: search, mode: "insensitive" } }),
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          platform: true,
          createdAt: true,
          updatedAt: true,
          isActive: true,
          matchData: true,
          whatsappSettingsPhoneId: true,
        },
      })
    : [];

  const runs = await runCounts(
    orgId,
    rows.map((row) => row.id),
  );
  const data: ChatbotSummary[] = rows.map(({ matchData, ...row }) => ({
    ...row,
    platform: row.platform as ChatbotPlatform,
    stepCount: stepCount(matchData),
    runs: runs.get(row.id) ?? { started: 0, completed: 0 },
    ...(withGraph && { matchData }),
  }));
  return { data, locked };
}

/**
 * How many conversations each chatbot has started and finished, from its run records (one
 * per person per run; deleted with the chatbot).
 */
async function runCounts(orgId: string, ids: string[]) {
  const counts = new Map<string, { started: number; completed: number }>();
  if (!ids.length) return counts;
  const groups = await prisma.waAutomatedReplyMessage.groupBy({
    by: ["waAutomatedReplyId", "status"],
    where: { orgId, waAutomatedReplyId: { in: ids } },
    _count: { _all: true },
  });
  for (const group of groups) {
    if (!group.waAutomatedReplyId) continue;
    const entry = counts.get(group.waAutomatedReplyId) ?? {
      started: 0,
      completed: 0,
    };
    entry.started += group._count._all;
    if (group.status === "completed") entry.completed += group._count._all;
    counts.set(group.waAutomatedReplyId, entry);
  }
  return counts;
}

/** One chatbot of the org, graph included, or null. */
export async function getChatbot(id: string, orgId: string) {
  return prisma.waAutomatedReply.findFirst({ where: { id, orgId } });
}

export async function createChatbot(
  orgId: string,
  data: {
    name: string;
    platform: ChatbotPlatform;
    matchData: WaAutomatedReplyMatchData;
    whatsappSettingsPhoneId?: string | null;
  },
) {
  const chatbot = await prisma.waAutomatedReply.create({
    data: {
      orgId,
      name: data.name,
      platform: data.platform,
      matchData: data.matchData,
      whatsappSettingsPhoneId: data.whatsappSettingsPhoneId ?? null,
    },
  });
  // The old WhatsApp route counted its chatbots for usage stats; Meta ones never were.
  if (data.platform === PlatformType.WHATSAPP) {
    await prisma.usageStats.updateMany({
      where: { orgId },
      data: { waAutomationCount: { increment: 1 } },
    });
  }
  return chatbot;
}

/** A partial update. The channel is fixed at creation and never changes here. */
export async function updateChatbot(
  id: string,
  orgId: string,
  data: {
    name?: string;
    matchData?: WaAutomatedReplyMatchData;
    whatsappSettingsPhoneId?: string | null;
    isActive?: boolean;
  },
) {
  return prisma.waAutomatedReply.update({
    where: { id, orgId },
    data: {
      name: data.name,
      matchData: data.matchData,
      whatsappSettingsPhoneId: data.whatsappSettingsPhoneId,
      isActive: data.isActive,
    },
  });
}

/** A copy on the same channel, graph and number included. Run history is not copied. */
export async function cloneChatbot(
  source: {
    name: string;
    platform: string;
    matchData: unknown;
    whatsappSettingsPhoneId: string | null;
  },
  orgId: string,
  name?: string,
) {
  return prisma.waAutomatedReply.create({
    data: {
      orgId,
      name: name || `${source.name} Copy`,
      platform: source.platform,
      matchData: source.matchData as WaAutomatedReplyMatchData,
      whatsappSettingsPhoneId: source.whatsappSettingsPhoneId,
    },
  });
}

/** Deletes the chatbot; its run history goes with it (cascade on WaAutomatedReplyMessage). */
export async function deleteChatbot(id: string, orgId: string) {
  await prisma.waAutomatedReply.delete({ where: { id, orgId } });
}
