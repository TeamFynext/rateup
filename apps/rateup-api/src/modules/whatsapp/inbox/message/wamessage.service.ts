import prisma from "../../../../utils/prisma";

export async function addNewWaMessage(
  messageBody: WaInboxMessageBody,
  contactId: string,
  waCreatedAt: string,
  componentParams?: any,
) {
  const newMessage = prisma.waMessage.create({
    data: {
      messageBody,
      contactId,
      waCreatedAt,
      templateComponentParams: componentParams,
    },
  });
  return newMessage;
}

export async function getWaMessagesByContactId(contactId: string) {
  const messages = prisma.waMessage.findMany({
    where: {
      contactId,
    },
    orderBy: {
      waCreatedAt: "asc",
    },
  });
  return messages;
}

export async function getContactsWithLastMessage(orgId: string) {
  return await prisma.contact.findMany({
    where: {
      orgId,
    },
    include: {
      WaMessage: {
        orderBy: {
          waCreatedAt: "desc",
        },
        take: 1,
        select: {
          messageBody: true,
          waCreatedAt: true,
        },
      },
    },
  });
}
