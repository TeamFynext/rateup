import { Contact } from "@prisma/client";
import { log } from "../../utils/logger";
import prisma from "../../utils/prisma";
import {
  ContactCore,
  createMultipleContactInput,
  updateContactSchema,
} from "./contact.schema";
import Papa from "papaparse";
import { getContactTag } from "../whatsapp/settings/wa_settings.service";

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

export async function importCSVContacts(file, orgId) {
  return new Promise((resolve, reject) => {
    let contacts = [];
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      chunkSize: 1024 * 1024,
      transformHeader: (header) => header?.toLowerCase(),
      chunk: function (results) {
        if (results?.data) {
          if (
            results?.data.some((contact) =>
              !contact?.phone && !contact?.name
                ? false
                : !contact?.phone ||
                  !/^\d+$/.test(contact?.phone) ||
                  !contact?.name,
            )
          ) {
            throw new Error("Phone number or Name is missing/invalid");
          }
          contacts.push(...results?.data);
        }
      },
      complete: async function (results) {
        console.log("Contacts processed completely");
        if (contacts?.length) {
          try {
            const res = await createContactsFromCsv(contacts, orgId);
            resolve(res);
          } catch (err) {
            reject(err);
          }
        } else {
          throw new Error("No contacts found");
        }
      },
      error: function (error) {
        reject(error);
      },
    });
  });
}

export async function createContactsFromCsv(contacts, orgId) {
  const tags = (await getContactTag(orgId))?.contactTags ?? [];
  let data = contacts?.map(({ name, phone, ...obj }) => {
    const result = {};
    if (tags?.length) {
      for (const key of tags) {
        if (obj?.hasOwnProperty(key)) {
          result[key] = obj[key];
        }
      }
    }
    return {
      name,
      phone,
      source: "CSV IMPORT",
      tags: result ?? undefined,
    };
  });
  const existingcontacts = await getContactsByOrgId(orgId);
  const filterNewContacts = data.filter((contact) => {
    return !existingcontacts.some(
      (existContact) => existContact.phone === contact.phone,
    );
  });
  if (!filterNewContacts.length) throw new Error("All contacts already exist");
  const res = await createMultipleContacts(data, orgId);
  return res;
}
