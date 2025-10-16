import dayjs from "dayjs";
import prisma from "../../../utils/prisma";
import { getTeamIdsByUserId } from "../../team/team.service";
import { getUserIdsByTeamId } from "../../user/user.service";
import { CreateAutomatedReplySchema } from "./wa_automatedReply.schema";
import { getUsageStat, updateMonthlyStat } from "../../stats/stats.service";
import { getSubscription } from "../../subscription/subscription.service";
import { log } from "../../../utils/logger";

export async function getAutomatedRepliesMessagId(id: string, orgId: string) {
  const automatedReplies = await prisma.waAutomatedReplyMessage.findMany({
    where: {
      waAutomatedReplyId: id,
      orgId,
    },
  });
  return automatedReplies;
}

export async function getAutomatedRepliesByOrgId(
  orgId: string,
  phone_number_id?: string,
) {
  const automatedReplies = await prisma.waAutomatedReply.findMany({
    where: {
      orgId,
      ...(phone_number_id
        ? {
            isEnabled: true,
            whatsappSettingsPhoneIds: {
              has: phone_number_id,
            },
          }
        : {}),
    },
    include: {
      WaAutomatedReplyCommands: {
        select: {
          command: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return automatedReplies.map((ar) => {
    const { WaAutomatedReplyCommands, ...rest } = ar;
    return {
      ...rest,
      commands: WaAutomatedReplyCommands.map((c) => c.command),
    };
  });
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
        },
      },
    },
  });
  const { WaAutomatedReplyCommands, ...rest } = automatedReply;
  return {
    ...rest,
    commands: WaAutomatedReplyCommands.map((c) => c.command),
  };
}

export async function createAutomatedReply(
  data: CreateAutomatedReplySchema,
  orgId: string,
) {
  const { commands = [], ...restData } = data;

  const automatedReply = await prisma.$transaction(async (prisma) => {
    const createdAutomatedReply = await prisma.waAutomatedReply.create({
      data: {
        orgId,
        matchData: restData.matchData,
        matchType: restData.matchType,
        name: restData.name,
        ...restData,
      },
    });
    await prisma.waAutomatedReplyCommands.createMany({
      data: commands.map((c) => ({
        orgId,
        command: c === "lead" ? `${c}_${dayjs().unix()}` : c,
        waAutomatedReplyId: createdAutomatedReply.id,
      })),
    });
    return createdAutomatedReply;
  });
  if (automatedReply)
    await prisma.usageStats.update({
      where: { orgId },
      data: { waAutomationCount: { increment: 1 } },
    });

  return automatedReply;
}

export async function updateAutomatedReply(
  id: string,
  data: any,
  orgId: string,
) {
  const { commands = [], ...restData } = data;
  return prisma.$transaction(async (prisma) => {
    const updatedAutomatedReply = await prisma.waAutomatedReply.update({
      where: {
        id,
      },
      data: {
        orgId,
        ...restData,
      },
    });
    await prisma.waAutomatedReplyCommands.deleteMany({
      where: {
        waAutomatedReplyId: id,
      },
    });
    await prisma.waAutomatedReplyCommands.createMany({
      data: commands.map((c) => ({
        orgId,
        command: c,
        waAutomatedReplyId: updatedAutomatedReply.id,
      })),
    });
    return updatedAutomatedReply;
  });
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
  const AutomatedReplyCommand =
    await prisma.waAutomatedReplyCommands.findUnique({
      where: {
        command_org_id_unique: {
          orgId,
          command,
        },
        waAutomatedReply: {
          isEnabled: true,
        },
      },
      select: {
        command: true,
        waAutomatedReplyId: true,
        waAutomatedReply: true,
      },
    });
  return AutomatedReplyCommand;
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
    usageStats.monthlyAutomationTriggerCount >=
    subscription.features.whatsapp.automation.automationTrigger.count.max
  ) {
    log.error("Automtion Trigger Limit reached. Aborting automation check...");
    return false;
  }
  return true;
}
