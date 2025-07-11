import { Contact, ContactGroupType } from "../../../generated/prisma/client";
import { log } from "../../utils/logger";
import prisma from "../../utils/prisma";
import {
  ContactCore,
  createMultipleContactInput,
  PaginationQuery,
  updateContactSchema,
} from "./contact.schema";
import Papa from "papaparse";
import { getContactTag } from "../whatsapp/settings/wa_settings.service";
import xlsx from "node-xlsx";
import { MultipartFile } from "@fastify/multipart";
import {
  addNewContactsToGroup,
  getContactGroupById,
} from "./contactGroup/contactGroup.service";
import { isValidPhoneNumber } from "libphonenumber-js";
import { BATCH_SIZE } from "../../utils/constants/constants";
import { AddNewContactsToGroupInput } from "./contactGroup/contactGroup.schema";
import { WaMessageAssignStatus } from "../../types/enums";
import {
  deleteAssignedUsersforContact,
  getAssignedUserForContact,
} from "../whatsapp/inbox/message/wamessage.service";
import { getChatbotDetails } from "../chatbot/chatbot.service";
import {
  createNotification,
  getNotificationSettings,
} from "../notification/notification.service";

export async function createContact(contact: ContactCore & { orgId: string }) {
  if (!contact.phone) {
    throw new Error("Phone must be provided");
  }
  const chatbot = await getChatbotDetails(contact.orgId);
  if (chatbot && chatbot.enableAllWaChat) contact.aiWaChat = true;
  const user = await prisma.contact.create({
    data: contact,
  });
  return user;
}

export async function getOrcreateContact(
  contact: ContactCore & { orgId: string },
) {
  if (!contact.phone) {
    throw new Error("Phone must be provided");
  }
  let user = await prisma.contact.findFirst({
    where: {
      phone: contact.phone,
      orgId: contact.orgId,
    },
  });
  if (user) return user;
  const chatbot = await getChatbotDetails(contact.orgId);
  if (chatbot && chatbot.enableAllWaChat) contact.aiWaChat = true;
  user = await prisma.contact.create({
    data: contact,
  });
  return user;
}

export async function createMultipleContacts(
  contacts: createMultipleContactInput,
  orgId: string,
) {
  const chatbot = await getChatbotDetails(orgId);
  const aiWaChat = chatbot && chatbot.enableAllWaChat ? true : false;
  const contactsData = contacts.map((contact) => ({
    ...contact,
    orgId,
    aiWaChat,
  }));
  return await prisma.contact.createMany({
    skipDuplicates: true,
    data: contactsData,
  });
}

export async function getContactById(contactId: string) {
  const user = await prisma.contact.findUnique({
    where: {
      id: contactId,
    },
  });
  return user;
}
export async function getContactsByOrgId(
  orgId: string,
  query?: PaginationQuery,
) {
  const {
    page = 0,
    limit = 500,
    search = "",
    sort = "createdAt",
    desc = "asc",
    type = ContactGroupType.NORMAL,
    ...filter
  } = query ?? {
    page: 0,
    limit: 500,
    search: "",
    sort: "createdAt",
    desc: "asc",
  };
  let filterData = [];
  if (filter) {
    const params = new URLSearchParams(filter);
    for await (const [key, value] of params.entries()) {
      if (["name", "phone", "source"].includes(key)) {
        filterData.push({
          [key]: {
            contains: value,
            mode: "insensitive",
          },
        });
      } else if ("consent" === key) {
        filterData.push({
          [key]: {
            equals: value?.toLocaleLowerCase() === "true",
          },
        });
      } else if ("createdAt" === key) {
        filterData.push({
          [key]: {
            equal: value,
            mode: "insensitive",
          },
        });
      } else if ("filterGroupName" === key) {
        let splitValue = [...new Set(value?.split(","))];
        filterData.push({
          contactGroups: {
            some: {
              contactGroupId: {
                in: splitValue,
              },
            },
          },
        });
      } else {
        filterData.push({
          tags: {
            path: [key],
            string_contains: value,
          },
        });
      }
    }
  }
  if (search?.length > 0) {
    filterData.push({
      name: {
        contains: search,
        mode: "insensitive",
      },
    });
    filterData.push({
      phone: {
        contains: search,
        mode: "insensitive",
      },
    });
  }
  // Define the search condition
  let groupTypeCondition =
    query.type === ContactGroupType.LOYALTY
      ? {
          AND: {
            loyaltyCustomer: {
              isNot: null,
            },
          },
        }
      : {};
  const searchCondition: any =
    filterData?.length > 0
      ? {
          orgId,
          OR: filterData,
          ...groupTypeCondition,
        }
      : {
          orgId,
          ...groupTypeCondition,
        };
  // Count total matching contacts
  const totalCount = await prisma.contact.count({
    where: searchCondition,
  });
  const includeCondition = {
    loyaltyCustomer: true,
    contactGroups: {
      select: {
        contactGroup: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    },
    campaignParticipants: {
      select: {
        campaignId: true,
      },
    },
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / Number(limit)));
  const pageNo = Math.min(Math.max(Number(page), 0), totalPages - 1);
  // Fetch paginated contacts
  const users = await prisma.contact.findMany({
    where: searchCondition,
    include: includeCondition,
    skip: pageNo * Number(limit),
    take: Number(limit),
    orderBy: {
      [sort]: desc,
    },
  });

  // Return the result
  return { users, totalCount };
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
      aiWaChat: contact.aiWaChat,
      waMessageAssignStatus: contact.waMessageAssignStatus,
      lastReceivedMessageTimeStamp: contact.lastReceivedMessageTimeStamp,
    },
  });
  if (contact.waMessageAssignStatus === WaMessageAssignStatus.CLOSED) {
    const assignedUsers = await getAssignedUserForContact(user.id);
    await deleteAssignedUsersforContact(user.id);
    for (const assignee of assignedUsers) {
      const notificationSetting = await getNotificationSettings(
        assignee.assignedUserId,
        user.orgId,
      );
      if (
        notificationSetting &&
        notificationSetting.waMessageClosedNotification
      ) {
        await createNotification(
          assignee.assignedUserId,
          user.orgId,
          "whatsapp",
          "chat-closed",
          {
            contactId: user.id,
            contactName: user.name,
          },
        );
      }
    }
  }
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
      if (
        additionalData?.name &&
        (!contact.whatsappUserName ||
          additionalData.name !== contact.whatsappUserName ||
          !contact.name)
      ) {
        await prisma.contact.update({
          where: {
            id: contact.id,
          },
          data: {
            whatsappUserName: additionalData.name,
            ...(!contact.name ? { name: additionalData.name } : {}),
          },
        });
      }
      return contact;
    } else {
      const chatbot = await getChatbotDetails(orgId);
      const aiWaChat = (chatbot && chatbot.enableAllWaChat) || false;
      return await prisma.contact.create({
        data: {
          ...additionalData,
          aiWaChat,
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
  updateExisting: boolean = false,
  contactGroupId?: string,
) {
  const { mimetype } = fileBody;
  const csvType = ["text/csv", "application/vnd.ms-excel"];
  const file = csvType.includes(mimetype)
    ? fileBody.file
    : await fileBody.toBuffer();

  return new Promise(async (resolve, reject) => {
    let contacts = [];
    let errorContact = [];

    const processContact = (contact) => {
      const formattedPhone = contact.phone?.startsWith("+")
        ? contact?.phone?.replace(/\s+/g, "")
        : `+${contact?.phone?.replace(/\s+/g, "")}`;

      if (
        !contact?.phone ||
        !isValidPhoneNumber(formattedPhone) ||
        !contact?.name
      ) {
        errorContact.push({
          name: contact?.name || "name is missing/invalid",
          phone: contact?.phone
            ? `${contact?.phone}: Invalid phone number`
            : "phone is missing",
        });
      } else {
        contact.phone = formattedPhone.slice(1); // Remove the '+' for storage
        contacts.push(contact);
      }
    };

    const finalizeProcessing = async () => {
      try {
        if (contacts.length === 0 && errorContact.length > 0) {
          resolve({ data: errorContact, status: "error" });
        } else if (contacts.length > 0) {
          const res = await createContactsFromCsv(
            contacts,
            orgId,
            tags,
            updateExisting,
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

    if (csvType.includes(mimetype)) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        chunkSize: 1024 * 1024,
        transformHeader: (header) => header?.trim()?.toLowerCase(),
        chunk: async (results) => {
          if (results?.data) {
            await Promise.all(results.data.map(processContact));
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
        workSheetsFromFile?.[0]?.data?.[0]?.map((header) =>
          header?.toString().toLowerCase(),
        ) ?? [];
      const headerIndices = headers.map((header, index) => ({
        header: header?.trim()?.toLowerCase(),
        index,
      }));
      const sheetData = workSheetsFromFile?.[0]?.data;
      if (!sheetData || sheetData.length < 2) {
        log.info("No data rows available");
        return;
      }

      const headerCount = headerIndices.length;
      const totalRows = sheetData.length;

      // Iterate directly over the rows starting from index 1 (skipping header)
      for (let i = 1; i < totalRows; i++) {
        const row = sheetData[i];
        if (!row || row.length === 0) continue;

        const contact = {};

        // Use a simple for loop for header indices to reduce overhead
        for (let j = 0; j < headerCount; j++) {
          const { header, index } = headerIndices[j];
          const value = row[index];
          contact[header] = value != null ? value.toString().trim() : "";
        }
        processContact(contact);
      }
      await finalizeProcessing();
    }
  });
}

export async function createContactsFromCsv(
  contacts,
  orgId,
  cTags,
  updateExisting = false,
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
  if (updateExisting) {
    await updateMulitplceContacts(data, orgId);
  } else {
    await createMultipleContacts(data, orgId);
  }
  if (contactGroupId) {
    const res = await addNewContactsToGroup(contactGroupId, data, orgId);
    return res;
  }

  return "sucess";
}

export async function getExistingContactCountByPhno(
  ids: string[],
  orgId: string,
) {
  const BATCH_SIZE = 30000; // Keep it below the database limit
  let totalCount = 0;

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const count = await prisma.contact.count({
      where: {
        phone: {
          in: batch,
        },
        orgId,
      },
    });
    totalCount += count;
  }

  return totalCount;
}

export async function updateMulitplceContacts(
  contacts: createMultipleContactInput,
  orgId: string,
) {
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((contact) =>
        prisma.contact.upsert({
          where: {
            contact_phone_org_id_unique: {
              phone: contact.phone,
              orgId,
            },
          },
          update: {
            tags: contact.tags,
            name: contact.name,
          },
          create: {
            ...contact,
            orgId,
          },
        }),
      ),
    );
  }
}

export const handleContactConsent = async (
  orgId: string,
  phone: string,
  consent: boolean,
) => {
  const contact_consent = await prisma.contact.findFirst({
    where: {
      phone,
      orgId,
    },
  });
  if (contact_consent.consent === consent) return false;
  await prisma.contact.update({
    where: {
      id: contact_consent.id,
    },
    data: {
      consent,
    },
  });
  return true;
};
