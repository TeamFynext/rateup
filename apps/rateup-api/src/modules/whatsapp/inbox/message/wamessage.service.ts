import prisma from "../../../../utils/prisma";

export async function addNewWaMessage(
  messageBody: WaInboxMessageBody,
  waContactId: string,
  waCreatedAt: string,
  componentParams?: any,
) {
  const newMessage = prisma.waMessage.create({
    data: {
      messageBody,
      waContactId,
      waCreatedAt,
      templateComponentParams: componentParams,
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
      waCreatedAt: "asc",
    },
  });
  return messages;
}
