import { WaMessage } from "@prisma/client";
import prisma from "../../../../utils/prisma";

export async function addNewWaMessage(
  messageBody: WaInboxMessageBody,
  contactId: string,
  waCreatedAt: string,
  componentParams?: any,
  messageId?: string,
) {
  const newMessage = prisma.waMessage.create({
    data: {
      messageBody,
      contactId,
      waCreatedAt,
      templateComponentParams: componentParams,
      messageId,
    },
  });
  return newMessage;
}

export async function getWaMessagesByContactId(
  contactId: string,
  cursor: string | null,
) {
  let messages: WaMessage[];
  if (cursor) {
    messages = await prisma.waMessage.findMany({
      skip: 1,
      take: 300,
      cursor: {
        id: cursor,
      },
      where: {
        contactId,
      },
      orderBy: {
        waCreatedAt: "desc",
      },
    });
  } else {
    messages = await prisma.waMessage.findMany({
      take: 300,
      where: {
        contactId,
      },
      orderBy: {
        waCreatedAt: "desc",
      },
    });
  }
  const nextCursor =
    messages.length > 0 ? messages[messages.length - 1].id : null;
  return { messages, nextCursor };
}

export async function getContactsWithLastMessage(orgId: string) {
  const lastReceivedMessages = await prisma.contact.findMany({
    where: { orgId },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      WaMessage: {
        where: {
          messageBody: {
            path: ["exchangeProcess"],
            equals: "receive",
          },
        },
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
  const contacts = await prisma.contact.findMany({
    where: {
      orgId,
    },
    orderBy: {
      createdAt: "desc",
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
      contactGroups: {
        include: {
          contactGroup: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
  return contacts.map(({ WaMessage, contactGroups, tags, ...rest }) => ({
    ...rest,
    tags: tags ?? {},
    groups: contactGroups.map(({ contactGroup }) => contactGroup.name),
    lastMessage: {
      messageBody: WaMessage?.length > 0 ? WaMessage[0]?.messageBody : null,
      waCreatedAt: WaMessage?.length > 0 ? WaMessage[0]?.waCreatedAt : null,
    },
    userInitiatedFinalTimeStamp:
      lastReceivedMessages?.find((msg) => msg?.id === rest?.id)?.WaMessage[0]
        ?.waCreatedAt ?? null,
  }));
}
