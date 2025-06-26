import prisma from "../../../utils/prisma";

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

export async function createAutomatedReply(data: any, orgId: string) {
  const { commands = [], ...restData } = data;
  const automatedReply = await prisma.$transaction(async (prisma) => {
    const createdAutomatedReply = await prisma.waAutomatedReply.create({
      data: { ...restData, orgId },
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

export function updateAutomatedReply(id: string, data: any, orgId: string) {
  const { commands = [], ...restData } = data;
  return prisma.$transaction(async (prisma) => {
    const updatedAutomatedReply = await prisma.waAutomatedReply.update({
      where: {
        id,
      },
      data: restData,
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
