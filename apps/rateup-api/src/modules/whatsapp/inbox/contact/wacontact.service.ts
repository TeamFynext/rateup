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

export async function getWaContactById(id: string) {
  const waContact = await prisma.waContact.findFirst({
    where: {
      id,
    },
    include: {
      waInbox: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          messageBody: true,
          createdAt: true,
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
    lastMessage: {
      messageBody: waContact?.waInbox[0]?.messageBody,
      createdAt: waContact?.waInbox[0].createdAt,
    },
    createdAt: waContact?.createdAt,
    updatedAt: waContact?.updatedAt,
  };
}

export async function getAllWaContactsByOrgId(orgId: string) {
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
          createdAt: "desc",
        },
        take: 1,
        select: {
          messageBody: true,
          createdAt: true,
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
  return contacts.map(
    ({
      id,
      contactId,
      createdAt,
      updatedAt,
      contact: { name, phone, source },
      waInbox,
    }) => ({
      id,
      contactId,
      name,
      phone,
      source,
      lastMessage: {
        messageBody: waInbox[0]?.messageBody,
        createdAt: waInbox[0].createdAt,
      },
      createdAt,
      updatedAt,
    }),
  );
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
