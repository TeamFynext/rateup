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
  const { WaAutomatedReplyCommands, ...rest } = automatedReply;
  return {
    ...rest,
    commands: WaAutomatedReplyCommands.map((c) => c.command),
    businessHourId: WaAutomatedReplyCommands?.[0]?.businessHourId,
  };
}

export async function createAutomatedReply(
  data: CreateAutomatedReplySchema,
  orgId: string,
) {
  const automatedReply = await prisma.waAutomatedReply.create({
    data: {
      orgId,
      name: data.name,
      matchType: "",
      matchData: data?.matchData,
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

export async function cloneAutomatedReply(
  id: string,
  orgId: string,
  name?: string,
) {
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
      matchType: source.matchType,
      matchData: source.matchData,
      platform: source.platform,
    },
  });

  return automatedReply;
}

export async function updateAutomatedReply(
  id: string,
  data: any,
  orgId: string,
) {
  const updatedAutomatedReply = await prisma.waAutomatedReply.update({
    where: {
      id,
    },
    data: {
      name: data.name,
      matchData: data?.matchData,
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

export async function getAutomatedRepliesByKeyWeords(orgId, keyword) {
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

export async function getCommandByOrgIdAndCommand(
  orgId: string,
  command: string,
) {
  const AutomatedReplyCommands = await prisma.waAutomatedReplyCommands.findMany(
    {
      where: {
        orgId,
        command,
        waAutomatedReply: {
          isEnabled: true,
        },
      },
      select: {
        command: true,
        waAutomatedReplyId: true,
        waAutomatedReply: true,
        businessHour: true,
      },
    },
  );

  return selectAutomationByBusinessHours(AutomatedReplyCommands);
}

export async function verifyAutomationTriggerLimit(orgId) {
  const [usageStats, subscription] = await Promise.all([
    getUsageStat(orgId),
    getSubscription(orgId),
  ]);
  if (!subscription.features.whatsapp.automation.automationTrigger.active) {
    log.error("Automation Trigger is inactive. Aborting automation check...");
    return false;
  }
  if (
    usageStats?.monthlyAutomationTriggerCount >=
    subscription.features.whatsapp.automation.automationTrigger.count.max
  ) {
    log.error("Automtion Trigger Limit reached. Aborting automation check...");
    return false;
  }
  return true;
}
