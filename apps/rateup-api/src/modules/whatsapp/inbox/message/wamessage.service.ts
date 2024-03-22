import prisma from "../../../../utils/prisma";

export async function addNewWaMessage(
  messageBody: WaInboxMessageBody,
  waContactId: string,
) {
  const newMessage = prisma.waMessage.create({
    data: {
      messageBody,
      waContactId,
    },
  });
  return newMessage;
}

export async function getWaMessagesByWaContactId(waContactId: string) {
  const messages = prisma.waMessage.findMany({
    where: {
      waContactId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  return messages;
}
