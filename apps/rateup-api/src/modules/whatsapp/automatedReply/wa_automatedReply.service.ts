import dayjs from "dayjs";
import prisma from "../../../utils/prisma";
import { CreateAutomatedReplySchema } from "./wa_automatedReply.schema";
import { getUsageStat } from "../../stats/stats.service";
import { getSubscription } from "../../subscription/subscription.service";
import { log } from "../../../utils/logger";
import { selectAutomationByBusinessHours } from "./wa_automatedReply.utils";

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
          businessHour: true,
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
      businessHour: WaAutomatedReplyCommands?.[0]?.businessHour,
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

async function validateUniqueCommands(
  orgId: string,
  commands: string[],
  businessHourId?: string | null,
) {
  for (const command of commands) {
    const existingCommand = await prisma.waAutomatedReplyCommands.findFirst({
      where: {
        orgId,
        command,
        businessHourId: businessHourId || null,
      },
    });

    if (existingCommand) {
      throw new Error(
        `Command '${command}' already exists for this organization with the same business hour configuration`,
        {
          cause: { code: "P2002" },
        },
      );
    }
  }
}

async function validateUniqueCommandsForUpdate(
  orgId: string,
  commands: string[],
  businessHourId: string | null | undefined,
  excludeAutomatedReplyId: string,
) {
  for (const command of commands) {
    const existingCommand = await prisma.waAutomatedReplyCommands.findFirst({
      where: {
        orgId,
        command,
        businessHourId: businessHourId || null,
        waAutomatedReplyId: {
          not: excludeAutomatedReplyId,
        },
      },
    });

    if (existingCommand) {
      throw new Error(
        `Command '${command}' already exists for this organization with the same business hour configuration`,
      );
    }
  }
}

export async function createAutomatedReply(
  data: CreateAutomatedReplySchema,
  orgId: string,
) {
  const { commands = [], businessHourId, ...restData } = data;

  // Validate unique commands before creating
  await validateUniqueCommands(orgId, commands, businessHourId);

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
        businessHourId,
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
  const { commands = [], businessHourId, ...restData } = data;

  // Validate unique commands before updating, excluding current automated reply
  await validateUniqueCommandsForUpdate(orgId, commands, businessHourId, id);

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
        businessHourId,
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
