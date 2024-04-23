import prisma from "../../../../utils/prisma";

export async function addSingleWaContact(contactId: string, orgId: string) {
  const newContact = await prisma.waContact.create({
    data: {
      contactId,
      orgId,
    },
  });
  return newContact;
}

export async function addMultipleWaContacts(
  contactIds: string[],
  orgId: string,
) {
  const newContacts = await prisma.waContact.createMany({
    skipDuplicates: true,
    data: contactIds.map((contactId) => ({
      contactId,
      orgId,
    })),
  });
  return newContacts;
}

export async function getWaContactByContactId(contactId: string) {
  const waContact = await prisma.waContact.findFirst({
    where: {
      contactId,
    },
  });
  return waContact;
}

//TODO optimize the below 2 queries
export async function getWaContactById(id: string) {
  const lastReceivedMessages = await prisma.waContact.findFirst({
    where: { id },
    include: {
      waInbox: {
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
  const waContact = await prisma.waContact.findFirst({
    where: {
      id,
    },
    include: {
      waInbox: {
        orderBy: {
          waCreatedAt: "desc",
        },
        take: 1,
        select: {
          messageBody: true,
          waCreatedAt: true,
        },
      },
      contact: {
        select: {
          name: true,
          phone: true,
          source: true,
        },
      },
    },
  });
  return {
    id: waContact?.id,
    contactId: waContact?.contactId,
    name: waContact?.contact?.name,
    phone: waContact?.contact?.phone,
    source: waContact?.contact?.source,
    updatedAt: waContact?.updatedAt,
    lastMessage: {
      messageBody:
        waContact?.waInbox.length > 0 ? waContact?.waInbox[0]?.messageBody : {},
      waCreatedAt:
        waContact?.waInbox.length > 0
          ? waContact?.waInbox[0]?.waCreatedAt
          : null,
    },
    userInitiatedFinalTimeStamp:
      lastReceivedMessages?.waInbox[0]?.waCreatedAt ?? null,
  };
}

export async function getAllWaContactsByOrgId(orgId: string) {
  const lastReceivedMessages = await prisma.waContact.findMany({
    where: { orgId },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      waInbox: {
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
  const contacts = await prisma.waContact.findMany({
    where: {
      orgId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      waInbox: {
        orderBy: {
          waCreatedAt: "desc",
        },
        take: 1,
        select: {
          messageBody: true,
          waCreatedAt: true,
        },
      },
      contact: {
        select: {
          name: true,
          phone: true,
          source: true,
        },
      },
    },
  });
  return contacts.map((contact) => ({
    id: contact?.id,
    contactId: contact?.contactId,
    name: contact?.contact?.name,
    phone: contact?.contact?.phone,
    source: contact?.contact?.source,
    updatedAt: contact?.updatedAt,
    lastMessage: {
      messageBody:
        contact?.waInbox.length > 0 ? contact?.waInbox[0]?.messageBody : {},
      waCreatedAt:
        contact?.waInbox.length > 0 ? contact?.waInbox[0]?.waCreatedAt : null,
    },
    userInitiatedFinalTimeStamp:
      lastReceivedMessages?.filter((msg) => msg?.id === contact?.id)[0]
        ?.waInbox[0]?.waCreatedAt ?? null,
  }));
}

export async function deleteWaContact(contactId: string, orgId: string) {
  const deletedContact = await prisma.waContact.delete({
    where: {
      contactId,
      orgId,
    },
  });
  return deletedContact;
}
export async function updateWaContactUpdatedById(
  id: string,
  timeStamp: string,
) {
  const updatedContact = await prisma.waContact.update({
    where: {
      id,
    },
    data: {
      updatedAt: timeStamp,
    },
  });
  return updatedContact;
}
