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
import xlsx from "node-xlsx";
import { MultipartFile } from "@fastify/multipart";
import { addNewContactsToGroup } from "./contactGroup/contactGroup.service";

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

export async function importCSVContacts(
  fileBody: MultipartFile,
  orgId: string,
  tags: string[],
  contactGroupId?: string,
) {
  const { mimetype } = fileBody;
  const file =
    mimetype === "text/csv" ? fileBody.file : await fileBody.toBuffer();

  return new Promise(async (resolve, reject) => {
    let contacts = [];
    let errorContact = [];

    const processContact = (contact) => {
      if (!contact?.phone || !/^\d+$/.test(contact.phone) || !contact?.name) {
        errorContact.push({
          name: contact?.name ? contact.name : "name is missing/invalid",
          phone: contact?.phone ? contact.phone : "phone is missing/invalid",
        });
      } else {
        contacts.push(contact);
      }
    };

    const finalizeProcessing = async () => {
      try {
        if (contacts.length > 0) {
          const res = await createContactsFromCsv(
            contacts,
            orgId,
            tags,
            contactGroupId,
          );
          if (errorContact.length > 0) {
            resolve({ data: errorContact, status: "error" });
          } else {
            resolve({ data: res, status: "success" });
          }
        } else {
          throw new Error("No contacts found");
        }
      } catch (err) {
        reject(err);
      }
    };

    if (mimetype === "text/csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        chunkSize: 1024 * 1024,
        transformHeader: (header) => header?.trim()?.toLowerCase(),
        chunk: (results) => {
          if (results?.data) {
            results.data.forEach(processContact);
          }
        },
        complete: finalizeProcessing,
        error: (error) => {
          reject(error);
        },
      });
    } else {
      const workSheetsFromFile = xlsx.parse(file);
      const headers =
        workSheetsFromFile?.[0]?.data?.[0]?.map(
          (header) => header?.toString().toLowerCase(),
        ) ?? [];
      const headerIndices = headers.map((header, index) => ({ header, index }));

      workSheetsFromFile?.[0]?.data?.slice(1).forEach((row) => {
        let contact = {};
        headerIndices.forEach(({ header, index }) => {
          contact[header] = row[index]?.toString()?.trim();
        });
        processContact(contact);
      });
      await finalizeProcessing();
    }
  });
}

export async function createContactsFromCsv(
  contacts,
  orgId,
  cTags,
  contactGroupId,
) {
  const tags = (await getContactTag(orgId))?.contactTags ?? [];
  let data = contacts?.map(({ name, phone, ...obj }) => {
    const result = {};
    if (tags?.length > 0) {
      for (const key of tags) {
        if (obj?.hasOwnProperty(key) && cTags.includes(key)) {
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
  if (contactGroupId) {
    const res = await addNewContactsToGroup(contactGroupId, data, orgId);
    return res;
  }
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
