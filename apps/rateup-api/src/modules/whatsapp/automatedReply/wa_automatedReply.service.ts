import prisma from "../../../utils/prisma";
import { getUserIdsByTeamId } from "../../user/user.service";
import { CreateAutomatedReplySchema } from "./wa_automatedReply.schema";

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
            OR: [
              { whatsappSettingsPhoneId: phone_number_id },
              { whatsappSettingsPhoneId: null },
            ],
          }
        : {}),
    },
    include: {
      WaAutomatedReplyCommands: {
        select: {
          command: true,
        },
      },
      WaAutomatedReplyAssignedUser: true,
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
      WaAutomatedReplyAssignedUser: true,
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
  userId?: string,
) {
  const {
    commands = [],
    teamId,
    assignedUserIds: assignedUserIdsFromBody,
    ...restData
  } = data;
  let assignedUserIds = assignedUserIdsFromBody || [];
  if (restData?.other?.assignType === "me") {
    assignedUserIds = [userId];
  } else if (restData?.other?.choice !== "manual") {
    const users = await getUserIdsByTeamId(teamId);
    assignedUserIds = users;
  }
  const automatedReply = await prisma.$transaction(async (prisma) => {
    const createdAutomatedReply = await prisma.waAutomatedReply.create({
      data: {
        orgId,
        matchData: restData.matchData,
        matchType: restData.matchType,
        name: restData.name,
        ...(teamId ? { teamId } : {}),
        ...restData,
      },
    });
    await prisma.waAutomatedReplyAssignedUser.createMany({
      data: assignedUserIds.map((userId) => ({
        userId,
        waAutomatedReplyId: createdAutomatedReply.id,
      })),
    });
    await prisma.waAutomatedReplyCommands.createMany({
      data: commands.map((c) => ({
        orgId,
        command: c,
        waAutomatedReplyId: createdAutomatedReply.id,
      })),
    });
    return createdAutomatedReply;
  });
  return automatedReply;
}

export async function updateAutomatedReply(
  id: string,
  data: any,
  orgId: string,
  userId?: string,
) {
  const {
    commands = [],
    teamId,
    WaAutomatedReplyAssignedUser,
    assignedUserIds: assignedUserIdsFromBody,
    ...restData
  } = data;
  let assignedUserIds = assignedUserIdsFromBody ?? [];
  if (restData?.other?.assignType === "me") {
    assignedUserIds = [userId];
  } else if (restData?.other?.choice !== "manual") {
    const users = await getUserIdsByTeamId(teamId);
    assignedUserIds = users;
  }
  return prisma.$transaction(async (prisma) => {
    const updatedAutomatedReply = await prisma.waAutomatedReply.update({
      where: {
        id,
      },
      data: {
        orgId,
        ...(teamId ? { teamId } : {}),
        ...restData,
      },
    });
    if (assignedUserIds?.length > 0) {
      await prisma.waAutomatedReplyAssignedUser.deleteMany({
        where: {
          waAutomatedReplyId: id,
        },
      });

      await prisma.waAutomatedReplyAssignedUser.createMany({
        data: assignedUserIds?.map((userId) => ({
          userId,
          waAutomatedReplyId: id,
        })),
      });
    }
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
