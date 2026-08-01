// dayjs import removed (unused)
import prisma from "../../../utils/prisma.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import { CreateAutomatedReplySchema } from "./wa_automatedReply.schema.js";
import { getUsageStat } from "../../stats/stats.service.js";
import { getSubscription } from "../../subscription/subscription.service.js";
import { log } from "../../../utils/logger.js";
import { selectAutomationByBusinessHours } from "./wa_automatedReply.utils.js";

export async function getAutomatedRepliesMessagId(id: string, orgId: string) {
  const automatedReplies = await prisma.waAutomatedReplyMessage.findMany({
    where: {
      waAutomatedReplyId: id,
      orgId,
    },
  });
  return automatedReplies;
}

export async function getAutomatedRepliesByOrgId(orgId: string) {
  const automatedReplies = await prisma.waAutomatedReply.findMany({
    where: {
      orgId,
      platform: PlatformType.WHATSAPP,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      matchData: true,
      orgId: true,
      whatsappSettingsPhoneId: true,
      platform: true,
    },
  });
  return automatedReplies;
}

export async function getAutomatedReplyById(id: string) {
  const automatedReply = await prisma.waAutomatedReply.findUnique({
    where: {
      id,
    },
    include: {
      WaAutomatedReplyCommands: {
        select: {
          command: true,
          businessHourId: true,
        },
      },
    },
  });
  if (!automatedReply) {
    throw new Error(`Automated reply ${id} not found`);
  }
  const { WaAutomatedReplyCommands, ...rest } = automatedReply;
  return {
    ...rest,
    commands: WaAutomatedReplyCommands.map((c) => c.command),
    businessHourId: WaAutomatedReplyCommands?.[0]?.businessHourId,
  };
}

export async function createAutomatedReply(data: CreateAutomatedReplySchema, orgId: string) {
  const automatedReply = await prisma.waAutomatedReply.create({
    data: {
      orgId,
      name: data.name,
      matchData: data.matchData as WaAutomatedReplyMatchData,
      whatsappSettingsPhoneId: data.whatsappSettingsPhoneId,
      platform: data.platform
        ? data.platform === "instagram"
          ? PlatformType.INSTAGRAM
          : PlatformType.WHATSAPP
        : PlatformType.WHATSAPP,
    },
  });
  if (automatedReply)
    await prisma.usageStats.update({
      where: { orgId },
      data: { waAutomationCount: { increment: 1 } },
    });

  return automatedReply;
}

export async function cloneAutomatedReply(id: string, orgId: string, name?: string) {
  const source = await prisma.waAutomatedReply.findFirst({
    where: {
      id,
      orgId,
    },
  });

  if (!source) {
    throw new Error("Automated reply not found");
  }

  const automatedReply = await prisma.waAutomatedReply.create({
    data: {
      orgId,
      name: name || `${source.name} Copy`,
      matchData: source.matchData,
      platform: source.platform,
    },
  });

  return automatedReply;
}

// Unlike createAutomatedReply, updates are genuinely partial (callers commonly rename or
// re-platform an automation without resending matchData), so this intentionally doesn't
// reuse CreateAutomatedReplySchema (whose name/matchData are required). matchData is
// forwarded to Prisma's Json column as-is (its own generated update input types the field
// `unknown`), so it's left untyped here rather than pinned to a shape this function never
// inspects.
export async function updateAutomatedReply(
  id: string,
  data: {
    name?: string;
    matchData?: unknown;
    whatsappSettingsPhoneId?: string;
    platform?: string;
  },
  _orgId: string,
) {
  const updatedAutomatedReply = await prisma.waAutomatedReply.update({
    where: {
      id,
    },
    data: {
      name: data.name,
      matchData: data?.matchData as WaAutomatedReplyMatchData | undefined,
      whatsappSettingsPhoneId: data?.whatsappSettingsPhoneId,
      platform: data.platform
        ? data.platform === "instagram"
          ? PlatformType.INSTAGRAM
          : PlatformType.WHATSAPP
        : undefined,
    },
  });
  return updatedAutomatedReply;
}

export async function deleteAutomatedReply(id: string) {
  const automatedReply = await prisma.waAutomatedReply.delete({
    where: {
      id,
    },
  });
  return automatedReply;
}

export async function getAutomatedRepliesByKeyWeords(orgId: string, keyword: string) {
  return await prisma.waAutomatedReply.findFirst({
    where: {
      orgId,
      matchData: {
        path: ["keywords"],
        array_contains: [keyword],
      },
    },
  });
}

export async function getCommandByOrgIdAndCommand(orgId: string, command: string) {
  const AutomatedReplyCommands = await prisma.waAutomatedReplyCommands.findMany({
    where: {
      orgId,
      command,
    },
    select: {
      command: true,
      waAutomatedReplyId: true,
      waAutomatedReply: true,
      businessHour: true,
    },
  });

  return selectAutomationByBusinessHours(AutomatedReplyCommands);
}

export async function verifyAutomationTriggerLimit(orgId: string) {
  const [usageStats, subscription] = await Promise.all([
    getUsageStat(orgId),
    getSubscription(orgId),
  ]);
  if (!subscription || !subscription.features.whatsapp.active) {
    log.error("Whatsapp is inactive. Aborting automation check...");
    return false;
  }
  return true;
}
