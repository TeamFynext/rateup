import { ContactGroupType } from "../../../generated/prisma/client";
import { log } from "../../utils/logger";
import prisma from "../../utils/prisma";
import {
  ContactCore,
  createMultipleContactInput,
  CustomFieldSchema,
  PaginationQuery,
  updateContactSchema,
} from "./contact.schema";
import Papa from "papaparse";
import { getContactTag } from "../whatsapp/settings/wa_settings.service";
import xlsx from "node-xlsx";
import { MultipartFile } from "@fastify/multipart";
import { addNewContactsToGroup } from "./contactGroup/contactGroup.service";
import { isValidPhoneNumber } from "libphonenumber-js";
import { BATCH_SIZE } from "../../utils/constants/constants";
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
import {
  addZapierTriggerToQueue,
  ZapierTriggers,
} from "../integrations/external/zapier/zapier.service";

export async function createContact(contact: ContactCore & { orgId: string }) {
  if (!contact.phone) {
    throw new Error("Phone must be provided");
  }
  const chatbot = await getChatbotDetails(contact.orgId);
  if (chatbot && chatbot.enableAllWaChat) contact.aiWaChat = true;
  const { customFields, ...rest } = contact;
  const user = await prisma.contact.create({
    data: rest,
  });
  if (customFields?.length) {
    await prisma.contactCustomFieldValue.createMany({
      data: customFields.map((field) => ({
        contactId: user.id,
        fieldId: field.id,
        value: field.value,
      })),
      skipDuplicates: true,
    });
  }
  await addZapierTriggerToQueue(
    ZapierTriggers.CONTACT_CREATE,
    { [ZapierTriggers.CONTACT_CREATE]: user },
    user.orgId,
  );
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
  const { customFields, ...rest } = contact;
  user = await prisma.contact.create({
    data: rest,
  });

  await addZapierTriggerToQueue(
    ZapierTriggers.CONTACT_CREATE,
    { [ZapierTriggers.CONTACT_CREATE]: user },
    user.orgId,
  );
  if (customFields?.length) {
    await prisma.contactCustomFieldValue.createMany({
      data: customFields.map((field) => ({
        contactId: user.id,
        fieldId: field.id,
        value: field.value,
      })),
      skipDuplicates: true,
    });
  }
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
    customFields: undefined,
  }));

  // Batch size for DB operations
  const BATCH_SIZE = 1000;
  let createdContacts: any[] = [];
  for (let i = 0; i < contactsData.length; i += BATCH_SIZE) {
    const batch = contactsData.slice(i, i + BATCH_SIZE);
    const batchCreated = await prisma.contact.createManyAndReturn({
      skipDuplicates: true,
      data: batch,
    });
    createdContacts = createdContacts.concat(batchCreated);
  }

  if (createdContacts.length) {
    // Batch delete custom field values
    for (let i = 0; i < createdContacts.length; i += BATCH_SIZE) {
      const batchIds = createdContacts
        .slice(i, i + BATCH_SIZE)
        .map((c) => c.id);
      await prisma.contactCustomFieldValue.deleteMany({
        where: {
          contactId: {
            in: batchIds,
          },
        },
      });
    }

    // Prepare custom field values
    const customFieldValues = contacts
      .filter((contact) => contact.customFields?.length)
      .flatMap((contact) =>
        contact.customFields.map((field) => ({
          contactId:
            createdContacts.find((c) => c.phone === contact.phone)?.id || "",
          fieldId: field.id,
          value: field.value,
        })),
      );

    // Batch create custom field values
    for (let i = 0; i < customFieldValues.length; i += BATCH_SIZE) {
      const batch = customFieldValues.slice(i, i + BATCH_SIZE);
      await prisma.contactCustomFieldValue.createMany({
        data: batch,
        skipDuplicates: true,
      });
    }

    // Batch Zapier triggers
    for (let i = 0; i < createdContacts.length; i += BATCH_SIZE) {
      const batch = createdContacts.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((contact) =>
          addZapierTriggerToQueue(
            ZapierTriggers.CONTACT_CREATE,
            { [ZapierTriggers.CONTACT_CREATE]: contact },
            orgId,
          ),
        ),
      );
    }
  }

  return createdContacts;
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
    customFields: true,
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

//used in zapier controller also
export async function deleteContactById(contactId: string) {
  const user = await prisma.contact.delete({
    where: {
      id: contactId,
    },
  });
  await addZapierTriggerToQueue(
    ZapierTriggers.CONTACT_DELETED,
    { [ZapierTriggers.CONTACT_DELETED]: user },
    user.orgId,
  );
  return user;
}

//used in zapier controller also
export async function updateContactById(
  contactId: string,
  contact: updateContactSchema,
) {
  if (contact.customFields?.length) {
    await prisma.contactCustomFieldValue.deleteMany({
      where: {
        contactId,
      },
    });
    await prisma.contactCustomFieldValue.createMany({
      data: contact.customFields.map((field) => ({
        contactId,
        fieldId: field.id,
        value: field.value,
      })),
      skipDuplicates: true,
    });
  }
  const user = await prisma.contact.update({
    where: {
      id: contactId,
    },
    data: {
      name: contact.name,
      phone: contact.phone,
      aiWaChat: contact.aiWaChat,
      waMessageAssignStatus: contact.waMessageAssignStatus,
      lastReceivedMessageTimeStamp:
        contact.lastReceivedMessageTimeStamp || undefined,
    },
  });
  await addZapierTriggerToQueue(
    ZapierTriggers.CONTACT_UPDATED,
    { [ZapierTriggers.CONTACT_UPDATED]: user },
    user.orgId,
  );
  if (contact.waMessageAssignStatus === WaMessageAssignStatus.CLOSED) {
    await addZapierTriggerToQueue(
      ZapierTriggers.CONVERSATION_CLOSED,
      { [ZapierTriggers.CONVERSATION_CLOSED]: user },
      user.orgId,
    );
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

export async function updateContactLabelsById(
  contactId: string,
  lifecycleId: string,
) {
  const contact = await prisma.contact.update({
    where: {
      id: contactId,
    },
    data: {
      lifecycleId,
    },
    include: {
      Lifecycle: {
        select: {
          name: true,
        },
      },
    },
  });
  await addZapierTriggerToQueue(
    ZapierTriggers.CONTACT_LIFECYCLE_UPDATED,
    {
      [ZapierTriggers.CONTACT_LIFECYCLE_UPDATED]: {
        contactId: contact.id,
        lifecycleId,
        lifecycleName: contact.Lifecycle.name,
      },
    },
    contact.orgId,
  );
  return contact;
}

//update
export async function getOrCreateContactByPhone(
  phone: string,
  orgId: string,
  additionalData?: Omit<updateContactSchema, "customFields">,
  source?: string,
) {
  try {
    const contact = await prisma.contact.findFirst({
      // TODO: findout why findUnique is giving error
      where: source
        ? {
            other: phone,
            orgId: orgId,
            source,
          }
        : {
            phone: phone,
            orgId: orgId,
          },
      include: {
        waInboxAssign: {
          select: {
            assignedUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (contact) {
      if (additionalData) {
        const updateData = { ...additionalData };
        if (!additionalData?.name) {
          delete updateData?.name;
        }
        return await prisma.contact.update({
          where: {
            id: contact.id,
          },
          data: updateData,
          include: {
            waInboxAssign: {
              select: {
                assignedUser: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });
      }
      return contact;
    } else {
      const chatbot = await getChatbotDetails(orgId);
      const aiWaChat = (chatbot && chatbot.enableAllWaChat) || false;
      const contact = await prisma.contact.create({
        data: {
          ...additionalData,
          aiWaChat,
          phone: source ? undefined : phone,
          orgId,
        },
        include: {
          waInboxAssign: {
            select: {
              assignedUser: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
      await addZapierTriggerToQueue(
        ZapierTriggers.CONTACT_CREATE,
        { [ZapierTriggers.CONTACT_CREATE]: contact },
        orgId,
      );
      return contact;
    }
  } catch (e) {
    log.error(e);
  }
}

export async function getOrCreateContactByIgsId(
  igsId: string,
  orgId: string,
  additionalData?: Omit<updateContactSchema, "customFields">,
) {
  try {
    const contact = await prisma.contact.findUnique({
      where: {
        contact_igsid_org_id_unique: {
          igsId,
          orgId,
        },
      },
    });

    if (contact) {
      if (!additionalData) return contact;
      return await prisma.contact.update({
        where: {
          id: contact.id,
        },
        data: {
          ...additionalData,
        },
      });
    } else {
      const chatbot = await getChatbotDetails(orgId);
      const aiWaChat = (chatbot && chatbot.enableAllWaChat) || false;
      const contact = await prisma.contact.create({
        data: {
          ...additionalData,
          aiWaChat,
          igsId,
          orgId,
        },
      });
      await addZapierTriggerToQueue(
        ZapierTriggers.CONTACT_CREATE,
        { [ZapierTriggers.CONTACT_CREATE]: contact },
        orgId,
      );
      return contact;
    }
  } catch (e) {
    log.error(e);
  }
}

export async function deleteManyContacts(contactIds: Array<string>) {
  const contacts = await prisma.contact.findMany({
    where: {
      id: {
        in: contactIds,
      },
    },
  });
  const res = await prisma.contact.deleteMany({
    where: {
      id: {
        in: contactIds,
      },
    },
  });
  for (const contact of contacts) {
    await addZapierTriggerToQueue(
      ZapierTriggers.CONTACT_DELETED,
      { [ZapierTriggers.CONTACT_DELETED]: contact },
      contact.orgId,
    );
  }
  return res;
}
function normalizePhone(phone) {
  if (!phone) return "";

  // Already a string like "9198771234"
  if (/^\d+$/.test(phone)) {
    return phone;
  }

  // If it's in scientific notation (like "9.19877E+11")
  if (/e/i.test(phone)) {
    const num = Number(phone);
    if (!isNaN(num)) {
      return num.toFixed(0); // no decimals
    }
  }

  return phone.toString().trim();
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
      let rawPhone = normalizePhone(contact.phone);

      const formattedPhone = rawPhone?.startsWith("+")
        ? rawPhone?.replace(/\s+/g, "")
        : `+${rawPhone?.replace(/\s+/g, "")}`;

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
  const customFields = await getCustomFields(orgId);
  const data = contacts?.map(({ name, phone, ...obj }) => {
    const customFieldsRes = [];
    if (customFields?.length > 0) {
      for (const field of customFields) {
        if (cTags.includes(field.slug) && obj?.[field?.slug]) {
          customFieldsRes.push({
            id: field.id,
            value: obj?.[field.slug],
          });
        }
      }
    }
    return {
      name,
      phone,
      source: "CSV IMPORT",
      customFields: customFieldsRes,
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
  const chatbot = await getChatbotDetails(orgId);
  const aiWaChat = chatbot && chatbot.enableAllWaChat ? true : false;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);

    for (const contact of batch) {
      const { customFields, ...contactData } = contact;

      const updatedContact = await prisma.contact.upsert({
        where: {
          contact_phone_org_id_unique: {
            phone: contact.phone,
            orgId,
          },
        },
        update: {
          name: contact.name,
          aiWaChat,
        },
        create: {
          ...contactData,
          aiWaChat,
          orgId,
        },
      });

      if (customFields?.length) {
        await prisma.contactCustomFieldValue.deleteMany({
          where: {
            contactId: updatedContact.id,
          },
        });
        await prisma.contactCustomFieldValue.createMany({
          data: customFields.map((field) => ({
            contactId: updatedContact.id,
            fieldId: field.id,
            value: field.value,
          })),
          skipDuplicates: true,
        });
      }
      await addZapierTriggerToQueue(
        ZapierTriggers.CONTACT_UPDATED,
        { [ZapierTriggers.CONTACT_UPDATED]: contact },
        orgId,
      );
    }
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

export async function getCustomFields(orgId: string) {
  const fields = await prisma.contactCustomField.findMany({
    where: {
      orgId,
    },
  });
  return fields;
}

export async function addCustomField(
  orgId: string,
  data: Required<CustomFieldSchema>,
) {
  const field = await prisma.contactCustomField.create({
    data: {
      ...data,
      orgId,
    },
  });
  return field;
}

export async function updateCustomField(
  orgId: string,
  fieldId: string,
  data: Omit<CustomFieldSchema, "slug" | "type">,
) {
  const field = await prisma.contactCustomField.update({
    where: {
      id: fieldId,
      orgId,
    },
    data,
  });
  return field;
}

export async function deleteCustomField(orgId: string, fieldId: string) {
  const field = await prisma.contactCustomField.delete({
    where: {
      id: fieldId,
      orgId,
    },
  });
  return field;
}
