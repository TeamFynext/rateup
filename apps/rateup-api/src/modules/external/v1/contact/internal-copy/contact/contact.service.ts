import { Contact } from "../../../../../../../generated/prisma/client";
import {
  ContactCore,
  createMultipleContactInput,
  updateContactSchema,
} from "./contact.schema";
import { log } from "../../../../../../utils/logger";
import prisma from "../../../../../../utils/prisma";

export async function createContact(contact: ContactCore & { orgId: string }) {
  if (!contact.phone) {
    throw new Error("Phone must be provided");
  }
  const user = await prisma.contact.create({
    data: contact,
  });
  return user;
}

export async function createMultipleContacts(
  contacts: createMultipleContactInput,
  orgId: string,
) {
  const contactsData = contacts.map((contact) => ({ ...contact, orgId }));
  const result = await prisma.contact.createMany({
    skipDuplicates: true,
    data: contactsData,
  });
  return result;
}

export async function getContactById(contactId: string) {
  const user = await prisma.contact.findUnique({
    where: {
      id: contactId,
    },
  });
  return user;
}

export async function getContactsByOrgId(orgId: string) {
  const users = await prisma.contact.findMany({
    where: {
      orgId,
    },
    include: {
      contactGroups: {
        select: {
          contactGroup: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
  return users;
}

export async function getContactByPhoneNumberAndOrgId(
  phone: string,
  orgId: string,
) {
  const contact = await prisma.contact.findFirst({
    where: {
      phone,
      orgId,
    },
  });
  return contact;
}

export async function deleteContactById(contactId: string) {
  const user = await prisma.contact.delete({
    where: {
      id: contactId,
    },
  });
  return user;
}

export async function updateContactById(
  contactId: string,
  contact: updateContactSchema,
) {
  const user = await prisma.contact.update({
    where: {
      id: contactId,
    },
    data: {
      name: contact.name,
      phone: contact.phone,
      tags: contact.tags,
    },
  });
  return user;
}

export async function getOrCreateContactByPhone(
  phone: string,
  orgId: string,
  additionalData?: Partial<Contact>,
) {
  try {
    const contact = await prisma.contact.findFirst({
      // TODO: findout why findUnique is giving error
      where: {
        phone: phone,
        orgId: orgId,
      },
    });

    if (contact) {
      return contact;
    } else {
      return await prisma.contact.create({
        data: {
          ...additionalData,
          phone,
          orgId,
        },
      });
    }
  } catch (e) {
    log.error(e);
  }
}

export async function deleteManyContacts(contactIds: Array<string>) {
  const res = await prisma.contact.deleteMany({
    where: {
      id: {
        in: contactIds,
      },
    },
  });
  return res;
}
