import { loadActor, type Actor } from "../../authz/actor.js";
import { inScope } from "../../authz/scope.js";
import { channelIdentifierSpellings } from "../../utils/channelIdentifier.js";
import { FRONTEND_URL } from "../../utils/constants/constants.js";
import { renderNotificationEmailBodies } from "../../utils/email/react/templates.js";
import { PlatformType } from "../../../generated/prisma/enums.js";
import prisma from "../../utils/prisma.js";
import { getChannelScope } from "../whatsapp/settings/wa_channel_access.js";
import { eventDefinition, type NotificationEvent } from "./notification.catalogue.js";
import { deliveredChannels, preferencesFromRow } from "./notification.preferences.js";
import { renderNotification } from "./notification.render.js";
import type { NotificationJobData } from "./notification.service.js";
import type { NotifyAudience, NotifyJobData } from "./notify.js";

const ADMIT_BATCH = 20;

interface ResolvedAudience {
  userIds: string[] | "everyone";
  /** Narrows the candidates further once each one's actor is loaded. */
  admits?: (actor: Actor) => Promise<boolean> | boolean;
}

/** The channel a `WaMessage.sourceIdentifier` belongs to, or null when it matches none. */
async function channelIdForIdentifier(
  orgId: string,
  sourceIdentifier: string,
): Promise<string | null> {
  // Any platform but WhatsApp records its own account id, which names one channel.
  const byAccount = await prisma.channel.findFirst({
    where: { orgId, accountId: sourceIdentifier, platform: { not: PlatformType.WHATSAPP } },
    select: { id: true },
  });
  if (byAccount) return byAccount.id;

  // WhatsApp records the number, in any of its spellings.
  const numbers = await prisma.channel.findMany({
    where: { orgId, platform: PlatformType.WHATSAPP },
    select: { id: true, address: true },
  });
  const match = numbers.find((channel) =>
    channelIdentifierSpellings(channel.address).includes(sourceIdentifier),
  );
  return match?.id ?? null;
}

async function resolveAudience(orgId: string, audience: NotifyAudience): Promise<ResolvedAudience> {
  switch (audience.kind) {
    case "users":
      return { userIds: audience.userIds };
    case "team": {
      const rows = await prisma.teamMember.findMany({
        where: { teamId: audience.teamId, team: { orgId } },
        select: { userId: true },
      });
      return { userIds: rows.map((row) => row.userId) };
    }
    case "permitted": {
      const { teamId } = audience;
      return { userIds: "everyone", admits: (actor) => inScope(actor, teamId) };
    }
    case "inboxQueue": {
      const channelId = audience.sourceIdentifier
        ? await channelIdForIdentifier(orgId, audience.sourceIdentifier)
        : null;
      return {
        userIds: "everyone",
        admits: async (actor) => {
          // Under the "Admins" inbox policy this member only ever sees their own chats.
          if (actor.scope.inbox === "assigned_only") return false;
          // A message on a channel we cannot place reaches everyone rather than no one.
          if (!channelId) return true;
          const scope = await getChannelScope(actor);
          return scope.all || scope.ids.has(channelId);
        },
      };
    }
  }
}

function pushData(event: NotificationEvent, data: Record<string, unknown>, path: string) {
  const contactId = typeof data.contactId === "string" ? data.contactId : undefined;
  // Installed app versions only understand `wa_message`, and suppress it while that chat is open.
  if (event === "inbox.message.assigned" || event === "inbox.message.unassigned") {
    return { type: "wa_message", ...(contactId && { contactId }) };
  }
  return { type: "notification", event, path, ...(contactId && { contactId }) };
}

/**
 * Turn one event into the per-channel jobs it causes: who it is for, which of them may see it,
 * and which channels each of them chose. Runs on the worker; enqueues nothing itself.
 */
export async function dispatchNotification(job: NotifyJobData): Promise<NotificationJobData[]> {
  const { event, orgId, data, actorUserId } = job;
  const definition = eventDefinition(event);
  const audience = await resolveAudience(orgId, job.audience);

  const members = await prisma.orgMember.findMany({
    where: {
      orgId,
      user: { active: true },
      ...(audience.userIds !== "everyone" && { userId: { in: audience.userIds } }),
      ...(actorUserId && { NOT: { userId: actorUserId } }),
    },
    select: {
      userId: true,
      notificationSetting: true,
      user: { select: { email: true } },
    },
  });

  const rendered = renderNotification(event, data as never);
  const payload = data as unknown as Record<string, unknown>;
  const jobs: NotificationJobData[] = [];
  const pushUserIds: string[] = [];
  const emailTo: string[] = [];

  const admitted = new Set<string>();
  // Each check loads an actor and maybe a channel scope; an "everyone" audience is the whole
  // org, so they run in bounded batches rather than one after another or all at once.
  for (let i = 0; i < members.length; i += ADMIT_BATCH) {
    await Promise.all(
      members.slice(i, i + ADMIT_BATCH).map(async ({ userId }) => {
        const actor = await loadActor(userId, orgId);
        if (!actor?.can(definition.permission)) return;
        if (audience.admits && !(await audience.admits(actor))) return;
        admitted.add(userId);
      }),
    );
  }

  for (const member of members) {
    if (!admitted.has(member.userId)) continue;

    const prefs = preferencesFromRow(member.notificationSetting);
    const channels = deliveredChannels(prefs, event);
    const inApp = channels.has("inApp");
    const desktop = channels.has("desktop");

    if (inApp || desktop) {
      jobs.push({
        systemNotificationData: {
          userId: member.userId,
          orgId,
          source: definition.category,
          subSource: event,
          event,
          data: { ...payload, path: rendered.path },
          feed: definition.feed && inApp,
          toast: inApp,
          desktop,
          sound: prefs.sound,
          title: rendered.title,
          body: rendered.body,
        },
      });
    }
    if (channels.has("push")) pushUserIds.push(member.userId);
    if (channels.has("email") && member.user.email) emailTo.push(member.user.email);
  }

  if (pushUserIds.length > 0) {
    const tokens = await prisma.expoPushToken.findMany({
      where: { orgId, userId: { in: pushUserIds } },
      select: { expoToken: true },
    });
    if (tokens.length > 0) {
      jobs.push({
        pushNotificationData: {
          expoTokens: tokens.map((token) => token.expoToken),
          title: rendered.title,
          body: rendered.body,
          data: pushData(event, payload, rendered.path),
        },
      });
    }
  }

  if (emailTo.length > 0) {
    const bodies = await renderNotificationEmailBodies({
      title: rendered.title,
      body: rendered.body,
      actionLink: `${FRONTEND_URL}${rendered.path}`,
      actionLabel: rendered.action,
    });
    for (const to of emailTo) {
      jobs.push({
        emailData: { to, subject: rendered.title, html: bodies.html, text: bodies.text },
      });
    }
  }

  return jobs;
}
