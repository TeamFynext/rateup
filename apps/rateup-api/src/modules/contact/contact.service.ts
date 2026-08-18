import { Contact, ContactGroupType, Prisma } from "../../../generated/prisma/client.js";
import { log } from "../../utils/logger.js";
import prisma from "../../utils/prisma.js";
import { ContactNotFoundError } from "./contact.errors.js";
import { WHATSAPP_CONTACT_CHANNEL, whatsappContactWhere } from "./contact.channel.js";
export { ContactNotFoundError };
import {
  ContactCore,
  createMultipleContactInput,
  CustomFieldSchema,
  PaginationQuery,
  updateContactSchema,
} from "./contact.schema.js";
import { readSpreadsheetObjects, readSpreadsheetRows } from "../../utils/spreadsheet.js";
import { MultipartFile } from "@fastify/multipart";
import {
  addExistingContactsToMultipleGroups,
  addNewContactsToGroup,
} from "./contactGroup/contactGroup.service.js";
import { isValidPhoneNumber } from "libphonenumber-js";
import { BATCH_SIZE } from "../../utils/constants/constants.js";
import { CloseReason, ResolutionResult, WaMessageAssignStatus } from "../../types/enums.js";
import { triggerConversionsApiForContact } from "../integrations/meta/conversions.service.js";
import {
  assignWaMessageToUser,
  createInternalWaMessage,
  deleteAssignedUsersforContact,
  getAssignedUserForContact,
} from "../whatsapp/inbox/message/wamessage.service.js";
import { getChatbotDetails } from "../chatbot/chatbot.service.js";
import { getNotificationSettings } from "../notification/notification.service.js";
import {
  addZapierTriggerToQueue,
  ZapierTriggers,
} from "../integrations/external/zapier/zapier.service.js";
import {
  conversationStatusData,
  createConversation,
  mirrorConversationStatusTx,
  resolveClosedByUserId,
  resolveInboxActor,
} from "./conversation/conversation.service.js";
import type { InboxActor } from "./conversation/conversation.schema.js";
import { WaMessageAssignStatusTab, WaMessageClosedStatus } from "../whatsapp/constants.js";
import {
  checkAndExecuteRuleByTriggerEvent,
  resolveContactChannel,
} from "../whatsapp/automatedReply/wa_automatedReply.utils.js";
import { integrationTriggerQueue, notificationQueue } from "../../workers/bullmq/queues/index.js";
import {
  mapStatusToField,
  transitionInboxStat,
  incrementInboxStat,
  decrementInboxStat,
  type StatsField,
} from "../whatsapp/inbox/inboxStats/inboxStats.service.js";
import { updateZohoLeadQueue, ZohoTriggers } from "../integrations/external/zoho/zoho.service.js";
import { syncLeadsToContactLifecycle } from "../pipeline/pipelineLead/lead.service.js";
import {
  addZohoContactToQueue,
  buildZohoContactPayload,
  buildZohoLeadPayload,
} from "../integrations/external/zoho/zoho.utils.js";

// A `ContactCore.customFields` entry's `id` is declared optional in the input
// schema, but the DB column it's written to (`ContactCustomFieldValue.fieldId`)
// is a required FK to an already-created `ContactCustomField`. Guard once here
// instead of casting away the `undefined` at every call site.
function toContactCustomFieldValueInput(
  field: { id?: string; value: string },
  contactId: string,
): { contactId: string; fieldId: string; value: string } {
  if (!field.id) {
    throw new Error("Custom field id is required to set a custom field value");
  }
  return { contactId, fieldId: field.id, value: field.value };
}

export async function createContact(contact: ContactCore & { orgId: string }, userId?: string) {
  if (!contact.phone) {
    throw new Error("Phone must be provided");
  }
  const chatbot = await getChatbotDetails(contact.orgId);
  if (chatbot?.enableAllWaChat) contact.aiWaChat = true;
  const { customFields, labels, contactGroupIds, assignedUserIds, lifecycleId, ...rest } = contact;
  const user = await prisma.contact.create({
    data: {
      ...rest,
      lifecycleId: lifecycleId?.length ? lifecycleId : undefined,
    },
  });
  if (labels && labels.length > 0) {
    await prisma.contactLabelMap.createMany({
      data: labels.map((labelId) => ({
        contactId: user.id,
        labelId,
      })),
      skipDuplicates: true,
    });
  }
  if (customFields?.length) {
    await prisma.contactCustomFieldValue.createMany({
      data: customFields.map((field) => toContactCustomFieldValueInput(field, user.id)),
      skipDuplicates: true,
    });
  }
  if (contactGroupIds?.length) {
    await addExistingContactsToMultipleGroups([user.id], contactGroupIds, user.orgId);
  }
  if (assignedUserIds?.length) {
    const assignees: { teamId: string; userId: string }[] = await prisma.$queryRaw`
       SELECT DISTINCT ON (tm."userId") tm."userId", tm."teamId"
        FROM "TeamMember" tm
        JOIN "Team" t ON tm."teamId"= t.id
        WHERE tm."userId" = ANY(${assignedUserIds}::uuid[])
          AND t."orgId" = ${user.orgId}::uuid
        ORDER BY tm."userId", tm.id ASC;
      `;
    await assignWaMessageToUser({ assignees, contactId: user.id }, user.orgId, userId);
  }
  await checkAndExecuteRuleByTriggerEvent("CONTACT_CREATED", {
    orgId: user?.orgId,
    phone: contact?.phone,
    // A contact created here has no thread yet, so this resolves off its own
    // identifiers and stays "ALL" for a plain phone import.
    ...(await resolveContactChannel(user)),
  });
  await addZapierTriggerToQueue(
    ZapierTriggers.CONTACT_CREATE,
    { [ZapierTriggers.CONTACT_CREATE]: user },
    user.orgId,
  );
  await addZohoContactToQueue(user, user?.orgId);

  let lifecycleName;
  if (user.lifecycleId) {
    const lifecycle = await prisma.lifecycle.findUnique({
      where: {
        id: user.lifecycleId,
      },
      select: {
        name: true,
      },
    });

    if (lifecycle) {
      lifecycleName = lifecycle.name;
    }
  }
  await integrationTriggerQueue.add("zoho-lead-create", {
    integrationName: "zoho",
    triggerKey: ZohoTriggers.LEAD_CREATE,
    orgId: user?.orgId,
    data: buildZohoLeadPayload({
      ...user,
      leadStatus: lifecycleName,
    }),
    rateupContactId: user.id,
  });

  if (user.lifecycleId) {
    await integrationTriggerQueue.add("bigin-deal-create", {
      integrationName: "zoho",
      triggerKey: ZohoTriggers.BIGIN_DEAL_CREATE,
      orgId: user.orgId,
      data: {
        name: user.name,
        source: user.source,
        email: user.email,
        phone: user.phone,
        notes: user.notes,
        lifecycleId: user.lifecycleId,
      },
      rateupContactId: user.id,
    });
  }
  return user;
}

export async function getOrcreateContact(contact: ContactCore & { orgId: string }) {
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
  const {
    customFields,
    labels: _labels,
    contactGroupIds: _contactGroupIds,
    assignedUserIds: _assignedUserIds,
    ...rest
  } = contact;
  user = await prisma.contact.create({
    data: rest,
  });

  await addZapierTriggerToQueue(
    ZapierTriggers.CONTACT_CREATE,
    { [ZapierTriggers.CONTACT_CREATE]: user },
    user.orgId,
  );
  await addZohoContactToQueue(user, user?.orgId);
  await integrationTriggerQueue.add("zoho-lead-create", {
    integrationName: "zoho",
    triggerKey: ZohoTriggers.LEAD_CREATE,
    orgId: user?.orgId,
    data: buildZohoLeadPayload({
      ...user,
    }),
    rateupContactId: user.id,
  });
  if (customFields?.length) {
    await prisma.contactCustomFieldValue.createMany({
      data: customFields.map((field) => toContactCustomFieldValueInput(field, user.id)),
      skipDuplicates: true,
    });
  }
  return user;
}

export async function createMultipleContacts(contacts: createMultipleContactInput, orgId: string) {
  const chatbot = await getChatbotDetails(orgId);
  const aiWaChat = chatbot && chatbot.enableAllWaChat ? true : false;
  // These keys come in on the input DTO but are not Contact columns — they are persisted
  // separately below, so they are blanked out of the create payload.
  const omitted: undefined = undefined;
  const contactsData = contacts.map((contact) => ({
    ...contact,
    orgId,
    aiWaChat,
    customFields: omitted,
    labels: omitted,
    contactGroupIds: omitted,
    assignedUserIds: omitted,
    lifecycleId: contact.lifecycleId?.length ? contact.lifecycleId : undefined,
  }));

  // Batch size for DB operations
  const BATCH_SIZE = 1000;
  let createdContacts: Contact[] = [];
  for (let i = 0; i < contactsData.length; i += BATCH_SIZE) {
    const batch = contactsData.slice(i, i + BATCH_SIZE);
    const batchCreated = await prisma.contact.createManyAndReturn({
      skipDuplicates: true,
      data: batch,
    });
    for (const contact of batchCreated) {
      const inputData = contacts.find((c) => contact.phone === c.phone);
      if (!inputData) continue;
      if (inputData.labels && inputData.labels.length > 0) {
        await prisma.contactLabelMap.createMany({
          data: inputData.labels.map((labelId) => ({
            contactId: contact.id,
            labelId,
          })),
          skipDuplicates: true,
        });
      }
      if (inputData.contactGroupIds && inputData.contactGroupIds.length > 0) {
        await prisma.contactGroupMap.createMany({
          data: inputData.contactGroupIds.map((contactGroupId) => ({
            contactId: contact.id,
            contactGroupId,
          })),
          skipDuplicates: true,
        });
      }
      if (inputData.assignedUserIds && inputData.assignedUserIds.length > 0) {
        const assignees: { teamId: string; userId: string }[] = await prisma.$queryRaw`
        SELECT DISTINCT ON (tm."userId") tm."userId", tm."teamId"
          FROM "TeamMember" tm
          JOIN "Team" t ON tm."teamId"= t.id
          WHERE tm."userId" = ANY(${inputData.assignedUserIds}::uuid[])
            AND t."orgId" = ${orgId}::uuid
          ORDER BY tm."userId", tm.id ASC;
        `;
        await prisma.waInboxAssign.createMany({
          data: assignees.map((a) => ({
            contactId: contact.id,
            assignedUserId: a.userId,
            teamId: a.teamId,
          })),
          skipDuplicates: true,
        });
      }
    }
    createdContacts = createdContacts.concat(batchCreated);
  }

  if (createdContacts.length) {
    // Batch delete custom field values
    for (let i = 0; i < createdContacts.length; i += BATCH_SIZE) {
      const batchIds = createdContacts.slice(i, i + BATCH_SIZE).map((c) => c.id);
      await prisma.contactCustomFieldValue.deleteMany({
        where: {
          contactId: {
            in: batchIds,
          },
        },
      });
    }

    const customFieldValues = contacts.flatMap((contact) => {
      const created = createdContacts.find((c) => c.phone === contact.phone);
      if (!created) return [];
      return (contact.customFields ?? []).map((field) =>
        toContactCustomFieldValueInput(field, created.id),
      );
    });

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
        batch.map(async (contact) => {
          await addZapierTriggerToQueue(
            ZapierTriggers.CONTACT_CREATE,
            {
              [ZapierTriggers.CONTACT_CREATE]: contact,
            },
            orgId,
          );

          await addZohoContactToQueue(contact, orgId);
          await integrationTriggerQueue.add("zoho-lead-create", {
            integrationName: "zoho",
            triggerKey: ZohoTriggers.LEAD_CREATE,
            orgId: orgId,
            data: buildZohoLeadPayload({
              ...contact,
            }),
            rateupContactId: contact.id,
          });
          if (contact.lifecycleId) {
            await integrationTriggerQueue.add("bigin-deal-create", {
              integrationName: "zoho",
              triggerKey: ZohoTriggers.BIGIN_DEAL_CREATE,
              orgId,
              data: {
                name: contact.name,
                source: contact.source,
                email: contact.email,
                phone: contact.phone,
                notes: contact.notes,
                lifecycleId: contact.lifecycleId,
              },
              rateupContactId: contact.id,
            });
          }
        }),
      );
    }
  }

  return createdContacts;
}

export async function getContactById(contactId: string, orgId: string) {
  const user = await prisma.contact.findFirst({
    where: {
      id: contactId,
      orgId,
    },
    include: {
      ContactLabelMap: {
        select: {
          label: {
            select: {
              name: true,
              id: true,
            },
          },
        },
      },
    },
  });
  return user;
}
export async function getContactByIdForWebhook(contactId: string) {
  return await prisma.contact.findUnique({ where: { id: contactId } });
}

export async function getContactsByOrgId(orgId: string, query?: PaginationQuery) {
  const {
    page = 0,
    limit = 500,
    search = "",
    sort = "createdAt",
    desc = "desc",
    // type = ContactGroupType.NORMAL,
    ...filter
  } = query ?? {
    page: 0,
    limit: 500,
    search: "",
    sort: "createdAt",
    desc: "asc",
  };
  let filterData: Prisma.ContactWhereInput[] = [];
  if (filter) {
    const params = new URLSearchParams(filter);
    for (const [key, value] of params.entries()) {
      switch (key) {
        case "name":
        case "phone":
        case "email": {
          filterData.push({
            [key]: {
              contains: value,
              mode: "insensitive" as const,
            },
          });
          break;
        }
        case "createdAt": {
          const day = new Date(value);
          if (!Number.isNaN(day.getTime())) {
            const nextDay = new Date(day);
            nextDay.setUTCDate(nextDay.getUTCDate() + 1);
            filterData.push({ createdAt: { gte: day, lt: nextDay } });
          }
          break;
        }
        case "consent": {
          filterData.push({
            [key]: {
              equals: value?.toLocaleLowerCase() === "true",
            },
          });
          break;
        }

        case "filterGroupName": {
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
          break;
        }
        case "source": {
          // `source` is a free-form column whose writers disagree on casing
          // ("whatsapp" vs "WEBCHAT" vs "CSV IMPORT"), so match it case-insensitively.
          if (value !== "all") {
            filterData.push({
              source: { equals: value, mode: "insensitive" as const },
            });
          }
          break;
        }
        case "channel": {
          // Unlike `source`, this asks where the contact is actually reachable — see
          // contact.channel.ts. Only WhatsApp is selectable today; anything else is ignored.
          if (value === WHATSAPP_CONTACT_CHANNEL) {
            filterData.push(whatsappContactWhere);
          }
          break;
        }
        case "lifecycleId": {
          if (value !== "all") {
            filterData.push({
              [key]: value,
            });
          }
          break;
        }
        case "labelId": {
          if (!["all", "active", "blocked"].includes(value)) {
            filterData.push({
              ContactLabelMap: {
                some: {
                  labelId: value,
                },
              },
            });
          }
          if (value === "active") {
            filterData.push({
              blockedOnWhatsApp: false,
            });
          } else if (value === "blocked") {
            filterData.push({
              blockedOnWhatsApp: true,
            });
          }
        }
      }
    }
  }
  if (search?.length > 0) {
    filterData.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  if (query?.type === ContactGroupType.LOYALTY) {
    // Contact -> CustomerLoyaltyAccount is a list relation (`loyaltyAccounts`);
    // "is a loyalty member" is therefore `some`, not `isNot: null`.
    filterData.push({ loyaltyAccounts: { some: {} } });
  }

  const searchCondition: Prisma.ContactWhereInput =
    filterData?.length > 0 ? { orgId, AND: filterData } : { orgId };
  // Count total matching contacts
  const totalCount = await prisma.contact.count({
    where: searchCondition,
  });
  const includeCondition = {
    // loyaltyCustomer: true,
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
    ContactLabelMap: {
      select: {
        label: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    },
    waInboxAssign: {
      select: {
        assignedUserId: true,
      },
    },
    Lifecycle: {
      select: {
        name: true,
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
    orderBy: [
      { [sort]: desc === "asc" ? "asc" : "desc" },
      ...(sort === "name" ? [] : [{ name: "asc" as const }]),
    ],
  });

  // Return the result
  return { users, totalCount };
}

export async function getContactByPhoneNumberAndOrgId(phone: string, orgId: string) {
  const contact = await prisma.contact.findFirst({
    where: {
      phone,
      orgId,
    },
    include: {
      customFields: true,
      contactGroups: true,
      ContactLabelMap: true,
    },
  });
  return contact;
}

//used in zapier controller also
export async function deleteContactById(contactId: string, orgId: string) {
  const user = await prisma.contact.delete({
    where: {
      id: contactId,
      orgId,
    },
  });
  await addZapierTriggerToQueue(
    ZapierTriggers.CONTACT_DELETED,
    { [ZapierTriggers.CONTACT_DELETED]: user },
    user.orgId,
  );
  const integrationIds = user.integrationIds;
  await integrationTriggerQueue.add("zoho-contact-delete", {
    integrationName: "zoho",
    triggerKey: ZohoTriggers.CONTACT_DELETE,
    orgId: user.orgId,
    data: {
      zohoContactId: integrationIds?.zoho?.contact?.id,
    },
  });
  // Also enqueue Bigin contact delete
  await integrationTriggerQueue.add("zoho-bigin-contact-delete", {
    integrationName: "zoho",
    triggerKey: ZohoTriggers.BIGIN_CONTACT_DELETE,
    orgId: user.orgId,
    data: {
      biginContactId: integrationIds?.bigin?.contact?.id,
    },
  });
  return user;
}

//used in zapier controller also
export async function updateContactById(
  contactId: string,
  orgId: string,
  contact: updateContactSchema,
  userId?: string,
  // Only the four fields the inbox-stat transitions below read are required; callers pass
  // a full Contact row, but a lighter snapshot is enough.
  existing?: Pick<
    Contact,
    "id" | "orgId" | "waMessageAssignStatus" | "blockedOnWhatsApp" | "lastReceivedMessageTimeStamp"
  > | null,
  actor?: InboxActor,
) {
  // Use provided existing contact if available, otherwise fetch
  const contactRecord =
    existing ||
    (await prisma.contact.findFirst({
      where: {
        id: contactId,
        orgId,
      },
    }));
  if (!contactRecord) {
    throw new ContactNotFoundError(`Contact ${contactId} not found`);
  }
  if (contact.labels) {
    await prisma.contactLabelMap.deleteMany({
      where: {
        contactId,
      },
    });
    if (contact.labels.length > 0) {
      await prisma.contactLabelMap.createMany({
        data: contact.labels.map((labelId) => ({
          contactId,
          labelId,
        })),
        skipDuplicates: true,
      });
    }
  }
  if (contact.customFields?.length) {
    await prisma.contactCustomFieldValue.deleteMany({
      where: {
        contactId,
      },
    });
    await prisma.contactCustomFieldValue.createMany({
      data: contact.customFields.map((field) => toContactCustomFieldValueInput(field, contactId)),
      skipDuplicates: true,
    });
  }

  /**
   * SPAM is no longer a stored status — spam is a flag on the contact. Callers
   * that still ask for it (automation "set status" actions, older clients) are
   * translated here: the contact is flagged and the ticket simply closes, with
   * `closeReason = SPAM` carrying the why. `POST /message/spam` is the direct route.
   */
  const markingSpam = contact.waMessageAssignStatus === WaMessageAssignStatus.SPAM;
  const nextStatus = markingSpam ? WaMessageAssignStatus.CLOSED : contact.waMessageAssignStatus;
  const statusChanged =
    nextStatus !== undefined && contactRecord.waMessageAssignStatus !== nextStatus;
  const closing = statusChanged && WaMessageClosedStatus.includes(nextStatus);
  const transitionActor: InboxActor = actor ?? resolveInboxActor(userId);
  const now = new Date();

  // The contact write and the conversation mirror must commit together, or the
  // two status columns drift whenever the second write fails.
  const updatedContact = await prisma.$transaction(async (tx) => {
    const updated = await tx.contact.update({
      where: {
        id: contactId,
        orgId,
      },
      data: {
        name: contact.name,
        phone: contact.phone,
        aiWaChat: contact.aiWaChat,
        waMessageAssignStatus: nextStatus,
        lastReceivedMessageTimeStamp: contact.lastReceivedMessageTimeStamp || undefined,
        ...(closing
          ? {
              closedAt: now,
              closedBy: resolveClosedByUserId(transitionActor),
            }
          : {}),
        ...(markingSpam
          ? {
              isSpam: true,
              spamMarkedAt: now,
              spamMarkedBy: resolveClosedByUserId(transitionActor),
            }
          : {}),
        email: contact.email,
        dob: contact.dob,
        external_id: contact.external_id,
        notes: contact.notes,
        lifecycleId: contact.lifecycleId,
      },
      include: {
        waInboxAssign: {
          select: {
            assignedUserId: true,
          },
        },
        contactGroups: {
          select: {
            contactGroupId: true,
          },
        },
      },
    });

    if (statusChanged) {
      await mirrorConversationStatusTx(tx, contactId, nextStatus, transitionActor, {
        now,
        ...(markingSpam ? { closeReason: CloseReason.SPAM } : {}),
        resolutionResult: contact.resolutionResult ?? null,
      });
    }

    return updated;
  });

  // InboxStats Hook
  const isFirstReceive =
    !contactRecord.lastReceivedMessageTimeStamp && updatedContact.lastReceivedMessageTimeStamp;
  const isBlockedChanged = contactRecord.blockedOnWhatsApp !== updatedContact.blockedOnWhatsApp;
  const isStatusChanged =
    contactRecord.waMessageAssignStatus !== updatedContact.waMessageAssignStatus;

  if (isFirstReceive) {
    if (!updatedContact.blockedOnWhatsApp) {
      await incrementInboxStat(updatedContact.orgId, "totalCount", 1);
      const newField = mapStatusToField(updatedContact.waMessageAssignStatus);
      if (newField) await incrementInboxStat(updatedContact.orgId, newField, 1);
    }
  } else if (contactRecord.lastReceivedMessageTimeStamp) {
    if (isBlockedChanged) {
      if (updatedContact.blockedOnWhatsApp) {
        await incrementInboxStat(updatedContact.orgId, "blockedCount", 1);
        await decrementInboxStat(updatedContact.orgId, "totalCount", 1);
        const oldField = mapStatusToField(contactRecord.waMessageAssignStatus);
        if (oldField) await decrementInboxStat(updatedContact.orgId, oldField, 1);
      } else {
        await decrementInboxStat(updatedContact.orgId, "blockedCount", 1);
        await incrementInboxStat(updatedContact.orgId, "totalCount", 1);
        const newField = mapStatusToField(updatedContact.waMessageAssignStatus);
        if (newField) await incrementInboxStat(updatedContact.orgId, newField, 1);
      }
    } else if (isStatusChanged && !updatedContact.blockedOnWhatsApp) {
      const oldField = mapStatusToField(contactRecord.waMessageAssignStatus);
      const newField = mapStatusToField(updatedContact.waMessageAssignStatus);
      await transitionInboxStat(updatedContact.orgId, oldField, newField, 1);
    }
  }

  // Which channel the contact is actually on decides which rules may run: a
  // WhatsApp rule firing on an Instagram chat would try to WhatsApp-message an
  // IGSID and fail.
  const triggerEvent =
    contact.waMessageAssignStatus === WaMessageAssignStatusTab.Closed
      ? "CHAT_CLOSED"
      : contact.waMessageAssignStatus === WaMessageAssignStatus.ASSIGNED
        ? "CHAT_ASSIGNED"
        : contact.lifecycleId
          ? "LIFECYCLE_UPDATED"
          : null;
  if (triggerEvent) {
    const channel = await resolveContactChannel(updatedContact);
    checkAndExecuteRuleByTriggerEvent(triggerEvent, {
      orgId: updatedContact?.orgId,
      phone: updatedContact.phone,
      ...channel,
    });
  }
  if (contact.contactGroupIds) {
    const contactGroupIds = contact.contactGroupIds;
    const removedGroups = updatedContact.contactGroups.filter(
      (g) => !contactGroupIds.includes(g.contactGroupId),
    );
    const newGroupIds = contactGroupIds.filter(
      (contactGroupId) =>
        !updatedContact.contactGroups.some((c) => c.contactGroupId === contactGroupId),
    );
    await prisma.$transaction(async (_t) => {
      await prisma.contactGroupMap.deleteMany({
        where: {
          contactId: updatedContact.id,
          contactGroupId: {
            in: removedGroups.map((g) => g.contactGroupId),
          },
        },
      });
      await addExistingContactsToMultipleGroups(
        [updatedContact.id],
        newGroupIds,
        updatedContact.orgId,
      );
    });
  }

  if (contact.assignedUserIds) {
    const assignedUserIds = contact.assignedUserIds;
    const removedAssignees = updatedContact.waInboxAssign.filter(
      (g) => !assignedUserIds.includes(g.assignedUserId),
    );
    const newAssignees = assignedUserIds.filter(
      (assignedUserId) =>
        !updatedContact.waInboxAssign.some((c) => c.assignedUserId === assignedUserId),
    );
    await prisma.$transaction(async (t) => {
      if (removedAssignees.length)
        await t.waInboxAssign.deleteMany({
          where: {
            contactId: updatedContact.id,
            assignedUserId: {
              in: removedAssignees.map((g) => g.assignedUserId),
            },
          },
        });
      if (newAssignees.length) {
        const assignees: { teamId: string; userId: string }[] = await t.$queryRaw`
        SELECT DISTINCT ON (tm."userId") tm."userId", tm."teamId"
          FROM "TeamMember" tm
          JOIN "Team" t ON tm."teamId"= t.id
          WHERE tm."userId" = ANY(${newAssignees}::uuid[])
            AND t."orgId" = ${updatedContact.orgId}::uuid
          ORDER BY tm."userId", tm.id ASC;
        `;
        await assignWaMessageToUser(
          { assignees, contactId: updatedContact.id },
          updatedContact.orgId,
          userId,
        );
      }
    });
  }
  await addZapierTriggerToQueue(
    ZapierTriggers.CONTACT_UPDATED,
    { [ZapierTriggers.CONTACT_UPDATED]: updatedContact },
    updatedContact.orgId,
  );
  const integrationIds = updatedContact.integrationIds as {
    zoho?: {
      contact?: {
        id: string;
      };
      lead?: { id: string };
    };
    bigin?: {
      contact?: {
        id: string;
      };
    };
  };

  await integrationTriggerQueue.add("zoho-contact-update", {
    integrationName: "zoho",
    triggerKey: ZohoTriggers.CONTACT_UPDATE,
    orgId: updatedContact.orgId,
    data: {
      zohoContactId: integrationIds?.zoho?.contact?.id,
      ...buildZohoContactPayload(updatedContact),
    },
  });
  // Also enqueue Bigin contact update
  await integrationTriggerQueue.add("zoho-bigin-contact-update", {
    integrationName: "zoho",
    triggerKey: ZohoTriggers.BIGIN_CONTACT_UPDATE,
    orgId: updatedContact.orgId,
    data: {
      biginContactId: integrationIds?.bigin?.contact?.id,
      ...buildZohoContactPayload(updatedContact),
    },
  });

  if (updatedContact.lifecycleId && integrationIds?.zoho?.lead?.id) {
    const lifecycle = await prisma.lifecycle.findUnique({
      where: {
        id: updatedContact.lifecycleId,
      },
      select: {
        name: true,
      },
    });

    if (lifecycle) {
      await updateZohoLeadQueue(
        updatedContact.orgId,
        integrationIds.zoho.lead.id,
        buildZohoLeadPayload({
          ...updatedContact,
          leadStatus: lifecycle.name,
        }),
      );
    }
  }
  if (updatedContact.lifecycleId) {
    await integrationTriggerQueue.add("zoho-bigin-deal-update", {
      integrationName: "zoho",
      triggerKey: ZohoTriggers.BIGIN_DEAL_CREATE,
      orgId: updatedContact.orgId,
      data: {
        name: updatedContact.name,
        source: updatedContact.source,
        email: updatedContact.email,
        phone: updatedContact.phone,
        notes: updatedContact.notes,
        lifecycleId: updatedContact.lifecycleId,
      },
      rateupContactId: updatedContact.id,
    });
    triggerConversionsApiForContact(updatedContact, updatedContact.lifecycleId);
  }

  if (contact.lifecycleId) {
    await syncLeadsToContactLifecycle(
      [contactId],
      updatedContact.lifecycleId,
      updatedContact.orgId,
      userId ?? null,
    );
  }

  if (
    WaMessageClosedStatus.includes(updatedContact.waMessageAssignStatus as WaMessageAssignStatus)
  ) {
    await addZapierTriggerToQueue(
      ZapierTriggers.CONVERSATION_CLOSED,
      { [ZapierTriggers.CONVERSATION_CLOSED]: updatedContact },
      updatedContact.orgId,
    );
    const assignedUsers = await getAssignedUserForContact(updatedContact.id);
    await deleteAssignedUsersforContact(updatedContact.id);
    for (const assignee of assignedUsers) {
      const notificationSetting = await getNotificationSettings(
        assignee.assignedUserId,
        updatedContact.orgId,
      );
      if (notificationSetting?.waMessageClosedNotification) {
        await notificationQueue.add("notification", {
          systemNotificationData: {
            userId: assignee.assignedUserId,
            orgId: updatedContact.orgId,
            source: "whatsapp",
            subSource: "chat-closed",
            data: {
              contactId: updatedContact.id,
              contactName: updatedContact.name,
            },
          },
        });
      }
    }
    if (contact?.waMessageAssignStatus) {
      await createInternalWaMessage({
        trigerredByUser: userId || "RateUp",
        contactId: updatedContact.id,
        // The thread records the *event* the caller asked for: a spam mark reads as
        // spam even though the ticket underneath it is stored as CLOSED.
        waMessageAssignStatus: markingSpam
          ? WaMessageAssignStatus.SPAM
          : updatedContact.waMessageAssignStatus,
        messageId: contact.messageId ?? crypto.randomUUID(),
      });
    }
    // The conversation was already mirrored inside the transaction above.
  }
  return updatedContact;
}

export async function updateContactLabelsById(
  contactId: string,
  orgId: string,
  lifecycleId: string,
) {
  const contact = await prisma.contact.update({
    where: {
      id: contactId,
      orgId,
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
  // `lifecycleId` is an FK, so a successful update guarantees a matching
  // `Lifecycle` row — guarded rather than asserted, in case that ever changes.
  if (!contact.Lifecycle) {
    throw new Error(`Lifecycle not found for id ${lifecycleId}`);
  }
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

  await syncLeadsToContactLifecycle([contact.id], lifecycleId, contact.orgId);

  return contact;
}

//update
export async function getOrCreateContactByPhone(
  phone: string,
  orgId: string,
  additionalData?: Omit<updateContactSchema, "customFields">,
  source?: string,
  addToConversation: boolean = false,
) {
  try {
    let contact = await prisma.contact.findFirst({
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
    let conversation;
    if (contact) {
      if (additionalData) {
        const updateData = { ...additionalData };
        if (!additionalData?.name) {
          delete updateData?.name;
        }
        contact = await prisma.contact.update({
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
      return { contact, conversation };
    } else {
      const chatbot = await getChatbotDetails(orgId);
      const aiWaChat = (chatbot && chatbot.enableAllWaChat) || false;
      contact = await prisma.contact.create({
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
      if (addToConversation) {
        conversation = await createConversation({ contactId: contact.id, orgId: contact.orgId });
      }
      await addZapierTriggerToQueue(
        ZapierTriggers.CONTACT_CREATE,
        { [ZapierTriggers.CONTACT_CREATE]: contact },
        orgId,
      );
      await addZohoContactToQueue(contact, orgId);
      await integrationTriggerQueue.add("zoho-lead-create", {
        integrationName: "zoho",
        triggerKey: ZohoTriggers.LEAD_CREATE,
        orgId: orgId,
        data: buildZohoLeadPayload({
          ...contact,
        }),
        rateupContactId: contact.id,
      });
      if (contact.lifecycleId) {
        await integrationTriggerQueue.add("bigin-deal-create", {
          integrationName: "zoho",
          triggerKey: ZohoTriggers.BIGIN_DEAL_CREATE,
          orgId,
          data: {
            name: contact.name,
            source: contact.source,
            email: contact.email,
            phone: contact.phone,
            notes: contact.notes,
            lifecycleId: contact.lifecycleId,
          },
          rateupContactId: contact.id,
        });
      }
      return { contact, conversation };
    }
  } catch (e) {
    log.error({ err: e }, "Error in getOrCreateContactByPhone");
    throw e;
  }
}

export async function getOrCreateContactByIgsId(
  igsId: string,
  orgId: string,
  additionalData?: Omit<updateContactSchema, "customFields">,
  addToConversation: boolean = false,
) {
  try {
    let contact = await prisma.contact.findUnique({
      where: {
        contact_igsid_org_id_unique: {
          igsId,
          orgId,
        },
      },
    });
    let conversation;
    if (contact) {
      if (!additionalData) return { contact, conversation };
      contact = await prisma.contact.update({
        where: {
          id: contact.id,
        },
        data: {
          ...additionalData,
        },
      });
      return { contact, conversation };
    } else {
      const chatbot = await getChatbotDetails(orgId);
      const aiWaChat = (chatbot && chatbot.enableAllWaChat) || false;
      contact = await prisma.contact.create({
        data: {
          ...additionalData,
          aiWaChat,
          igsId,
          orgId,
        },
      });
      if (addToConversation) {
        conversation = await createConversation({ contactId: contact.id, orgId: contact.orgId });
      }
      await addZapierTriggerToQueue(
        ZapierTriggers.CONTACT_CREATE,
        { [ZapierTriggers.CONTACT_CREATE]: contact },
        orgId,
      );
      await addZohoContactToQueue(contact, orgId);
      await integrationTriggerQueue.add("zoho-lead-create", {
        integrationName: "zoho",
        triggerKey: ZohoTriggers.LEAD_CREATE,
        orgId: orgId,
        data: buildZohoLeadPayload({
          ...contact,
        }),
        rateupContactId: contact.id,
      });
      if (contact.lifecycleId) {
        await integrationTriggerQueue.add("bigin-deal-create", {
          integrationName: "zoho",
          triggerKey: ZohoTriggers.BIGIN_DEAL_CREATE,
          orgId,
          data: {
            name: contact.name,
            source: contact.source,
            email: contact.email,
            phone: contact.phone,
            notes: contact.notes,
            lifecycleId: contact.lifecycleId,
          },
          rateupContactId: contact.id,
        });
      }
      return { contact, conversation };
    }
  } catch (e) {
    log.error({ err: e }, "Error in getOrCreateContactByIgsId");
    throw e;
  }
}

export async function getOrCreateContactByPsid(
  psid: string,
  orgId: string,
  additionalData?: Omit<updateContactSchema, "customFields">,
  addToConversation: boolean = false,
) {
  try {
    let contact = await prisma.contact.findUnique({
      where: {
        contact_psid_org_id_unique: {
          psid,
          orgId,
        },
      },
    });

    let conversation;

    if (contact) {
      if (!additionalData) {
        return { contact, conversation };
      }

      contact = await prisma.contact.update({
        where: {
          id: contact.id,
        },
        data: {
          ...additionalData,
        },
      });

      return { contact, conversation };
    }

    const chatbot = await getChatbotDetails(orgId);

    const aiWaChat = (chatbot && chatbot.enableAllWaChat) || false;

    contact = await prisma.contact.create({
      data: {
        ...additionalData,
        aiWaChat,
        psid,
        orgId,
      },
    });

    if (addToConversation) {
      conversation = await createConversation({
        contactId: contact.id,
        orgId: contact.orgId,
      });
    }

    await addZapierTriggerToQueue(
      ZapierTriggers.CONTACT_CREATE,
      {
        [ZapierTriggers.CONTACT_CREATE]: contact,
      },
      orgId,
    );

    await addZohoContactToQueue(contact, orgId);
    await integrationTriggerQueue.add("zoho-lead-create", {
      integrationName: "zoho",
      triggerKey: ZohoTriggers.LEAD_CREATE,
      orgId: orgId,
      data: buildZohoLeadPayload({
        ...contact,
      }),
      rateupContactId: contact.id,
    });
    if (contact.lifecycleId) {
      await integrationTriggerQueue.add("bigin-deal-create", {
        integrationName: "zoho",
        triggerKey: ZohoTriggers.BIGIN_DEAL_CREATE,
        orgId,
        data: {
          name: contact.name,
          source: contact.source,
          email: contact.email,
          phone: contact.phone,
          notes: contact.notes,
          lifecycleId: contact.lifecycleId,
        },
        rateupContactId: contact.id,
      });
    }

    return { contact, conversation };
  } catch (e) {
    log.error(
      {
        err: e,
        stack: e instanceof Error ? e.stack : undefined,
      },
      "Error in getOrCreateContactByPsid",
    );

    throw e;
  }
}

export async function deleteManyContacts(contactIds: Array<string>, orgId: string) {
  const contacts = await prisma.contact.findMany({
    where: {
      id: {
        in: contactIds,
      },
      orgId,
    },
  });
  const res = await prisma.contact.deleteMany({
    where: {
      id: {
        in: contactIds,
      },
      orgId,
    },
  });
  for (const contact of contacts) {
    await addZapierTriggerToQueue(
      ZapierTriggers.CONTACT_DELETED,
      { [ZapierTriggers.CONTACT_DELETED]: contact },
      contact.orgId,
    );
    const integrationIds = contact.integrationIds as {
      zoho?: {
        contact?: {
          id: string;
        };
      };
      bigin?: {
        contact?: {
          id: string;
        };
      };
    };

    await integrationTriggerQueue.add("zoho-contact-delete", {
      integrationName: "zoho",
      triggerKey: ZohoTriggers.CONTACT_DELETE,
      orgId: contact.orgId,
      data: {
        zohoContactId: integrationIds?.zoho?.contact?.id,
      },
    });
    // Also enqueue Bigin contact delete
    await integrationTriggerQueue.add("zoho-bigin-contact-delete", {
      integrationName: "zoho",
      triggerKey: ZohoTriggers.BIGIN_CONTACT_DELETE,
      orgId: contact.orgId,
      data: {
        biginContactId: integrationIds?.bigin?.contact?.id,
      },
    });
  }
  return res;
}
function normalizePhone(phone: string): string {
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

// Rows read off the uploaded spreadsheet: standard `name`/`phone` columns plus
// whatever dynamic custom-field columns the caller's `tags` pointed at.
type CsvContactRow = Record<string, unknown> & { name?: unknown; phone?: unknown };
// After `processContact` validates a row, `name`/`phone` are confirmed strings.
type ValidatedCsvContactRow = Record<string, unknown> & { name: string; phone: string };

// Column order assumed when the uploaded file has no header row.
function noHeaderColumnOrder(tags: string[]) {
  return ["name", "phone", ...tags];
}

function rowsToObjects(rows: unknown[][], headers: string[]) {
  return rows.map((row) =>
    Object.fromEntries(
      headers.map((header, i) => [header, row[i] != null ? row[i].toString().trim() : ""]),
    ),
  );
}

export async function importCSVContacts(
  fileBody: MultipartFile,
  orgId: string,
  tags: string[],
  updateExisting: boolean = false,
  contactGroupId?: string,
  hasHeaderRow: boolean = true,
) {
  const { mimetype } = fileBody;
  const buffer = await fileBody.toBuffer();

  const contacts: ValidatedCsvContactRow[] = [];
  const errorContact: { name: string; phone: string }[] = [];

  const processContact = (contact: CsvContactRow) => {
    const phoneValue = contact.phone;
    const nameValue = contact.name;
    const rawPhone = normalizePhone(
      typeof phoneValue === "string" ? phoneValue : String(phoneValue ?? ""),
    );

    const formattedPhone = rawPhone.startsWith("+")
      ? rawPhone.replace(/\s+/g, "")
      : `+${rawPhone.replace(/\s+/g, "")}`;

    if (
      !phoneValue ||
      typeof nameValue !== "string" ||
      !nameValue ||
      !isValidPhoneNumber(formattedPhone)
    ) {
      errorContact.push({
        name: typeof nameValue === "string" && nameValue ? nameValue : "name is missing/invalid",
        phone: phoneValue ? `${phoneValue}: Invalid phone number` : "phone is missing",
      });
    } else {
      const phoneDigits = formattedPhone.slice(1); // Remove the '+' for storage
      contact.phone = phoneDigits;
      contacts.push({ ...contact, name: nameValue, phone: phoneDigits });
    }
  };

  let data: Record<string, unknown>[];

  if (hasHeaderRow) {
    ({ data } = await readSpreadsheetObjects(buffer, mimetype, {
      transformHeader: (header) => header?.toString()?.trim()?.toLowerCase(),
      transformValue: (value) => (value != null ? value.toString().trim() : ""),
    }));
  } else {
    const rows = await readSpreadsheetRows(buffer, mimetype);
    data = rowsToObjects(rows, noHeaderColumnOrder(tags));
  }

  if (data.length === 0) {
    log.info("No data rows available");
    return { data: [], status: "error", message: "The file contained no contacts." };
  }
  data.forEach(processContact);

  if (contacts.length === 0) {
    return {
      data: errorContact,
      status: "error",
      message: "No valid contacts were found in the file.",
    };
  }

  const res = await createContactsFromCsv(contacts, orgId, tags, updateExisting, contactGroupId);

  if (errorContact.length > 0) {
    return {
      data: res,
      rejected: errorContact,
      imported: contacts.length,
      status: "partial",
      message: `${contacts.length} contacts imported, ${errorContact.length} rejected.`,
    };
  }
  return { data: res, imported: contacts.length, status: "success" };
}

export async function createContactsFromCsv(
  contacts: ValidatedCsvContactRow[],
  orgId: string,
  cTags: string[],
  updateExisting = false,
  contactGroupId?: string,
) {
  const customFields = await getCustomFields(orgId);
  const data = contacts?.map(({ name, phone, ...obj }) => {
    const customFieldsRes: { id: string; value: string }[] = [];
    if (customFields?.length > 0) {
      for (const field of customFields) {
        if (cTags.includes(field.slug) && obj?.[field?.slug]) {
          customFieldsRes.push({
            id: field.id,
            value: String(obj[field.slug]),
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

export async function getExistingContactCountByPhno(ids: string[], orgId: string) {
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

export async function updateMulitplceContacts(contacts: createMultipleContactInput, orgId: string) {
  const chatbot = await getChatbotDetails(orgId);
  const aiWaChat = chatbot && chatbot.enableAllWaChat ? true : false;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);

    const batchPhones = batch.flatMap((contact) =>
      contact.phone && contact.lifecycleId ? [contact.phone] : [],
    );

    const previousLifecycles = new Map<string, string | null>();
    if (batchPhones.length) {
      const existing = await prisma.contact.findMany({
        where: { orgId, phone: { in: batchPhones } },
        select: { phone: true, lifecycleId: true },
      });

      for (const row of existing) {
        if (row.phone) previousLifecycles.set(row.phone, row.lifecycleId);
      }
    }

    const movedByLifecycle = new Map<string, string[]>();

    for (const contact of batch) {
      if (!contact.phone) {
        log.warn("Skipping contact update: missing phone number for %s", contact.name);
        continue;
      }
      const { customFields, ...contactData } = contact;
      const previousLifecycleId = previousLifecycles.get(contact.phone) ?? null;

      const updatedContact = await prisma.contact.upsert({
        where: {
          contact_phone_org_id_unique: {
            phone: contact.phone,
            orgId,
          },
        },
        update: {
          aiWaChat,
          ...Object.fromEntries(
            Object.entries(contactData).filter(
              ([key, value]) => value !== undefined && key !== "phone" && key !== "orgId",
            ),
          ),
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
          data: customFields.map((field) =>
            toContactCustomFieldValueInput(field, updatedContact.id),
          ),
          skipDuplicates: true,
        });
      }
      await addZapierTriggerToQueue(
        ZapierTriggers.CONTACT_UPDATED,
        { [ZapierTriggers.CONTACT_UPDATED]: contact },
        orgId,
      );
      const integrationIds = updatedContact.integrationIds as {
        zoho?: {
          contact?: {
            id: string;
          };
          lead?: {
            id: string;
          };
        };
        bigin?: {
          contact?: {
            id: string;
          };
        };
      };

      await integrationTriggerQueue.add("zoho-contact-update", {
        integrationName: "zoho",
        triggerKey: ZohoTriggers.CONTACT_UPDATE,
        orgId: updatedContact.orgId,
        data: {
          zohoContactId: integrationIds?.zoho?.contact?.id,
          ...buildZohoContactPayload(updatedContact),
        },
      });
      // Also enqueue Bigin contact update for bulk upserts
      await integrationTriggerQueue.add("zoho-bigin-contact-update", {
        integrationName: "zoho",
        triggerKey: ZohoTriggers.BIGIN_CONTACT_UPDATE,
        orgId: updatedContact.orgId,
        data: {
          biginContactId: integrationIds?.bigin?.contact?.id,
          ...buildZohoContactPayload(updatedContact),
        },
      });

      if (updatedContact.lifecycleId && integrationIds?.zoho?.lead?.id) {
        const lifecycle = await prisma.lifecycle.findUnique({
          where: {
            id: updatedContact.lifecycleId,
          },
          select: {
            name: true,
          },
        });

        if (lifecycle) {
          await updateZohoLeadQueue(
            updatedContact.orgId,
            integrationIds.zoho.lead.id,
            buildZohoLeadPayload({
              ...updatedContact,
              leadStatus: lifecycle.name,
            }),
          );
        }
      }
      if (updatedContact.lifecycleId) {
        await integrationTriggerQueue.add("zoho-bigin-deal-update", {
          integrationName: "zoho",
          triggerKey: ZohoTriggers.BIGIN_DEAL_CREATE,
          orgId: updatedContact.orgId,
          data: {
            name: updatedContact.name,
            source: updatedContact.source,
            email: updatedContact.email,
            phone: updatedContact.phone,
            notes: updatedContact.notes,
            lifecycleId: updatedContact.lifecycleId,
          },
          rateupContactId: updatedContact.id,
        });
        triggerConversionsApiForContact(updatedContact, updatedContact.lifecycleId);

        if (updatedContact.lifecycleId !== previousLifecycleId) {
          const group = movedByLifecycle.get(updatedContact.lifecycleId) ?? [];
          group.push(updatedContact.id);
          movedByLifecycle.set(updatedContact.lifecycleId, group);
        }
      }
    }

    for (const [lifecycleId, contactIds] of movedByLifecycle) {
      await syncLeadsToContactLifecycle(contactIds, lifecycleId, orgId);
    }
  }
}

export const handleContactConsent = async (orgId: string, phone: string, consent: boolean) => {
  const contact_consent = await prisma.contact.findFirst({
    where: {
      phone,
      orgId,
    },
  });
  if (!contact_consent) {
    log.info({ orgId }, "Consent callback for a phone number this org does not have");
    return false;
  }
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

export async function addCustomField(orgId: string, data: Required<CustomFieldSchema>) {
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

export async function updateLifecycleStageofContacts(
  lifecycleId: string,
  orgId: string,
  contactIds: string[],
) {
  const lifecycle = await prisma.lifecycle.findFirst({
    where: {
      id: lifecycleId,
      orgId,
    },
    select: {
      name: true,
    },
  });

  if (!lifecycle) {
    throw new ContactNotFoundError(`Lifecycle ${lifecycleId} not found`);
  }

  await prisma.contact.updateMany({
    where: {
      id: {
        in: contactIds,
      },
      orgId,
    },
    data: {
      lifecycleId,
    },
  });

  const contacts = await prisma.contact.findMany({
    where: {
      id: {
        in: contactIds,
      },
      orgId,
    },
    select: {
      id: true,
      orgId: true,
      integrationIds: true,
      name: true,
      email: true,
      phone: true,
      source: true,
      notes: true,
      lifecycleId: true,
    },
  });

  for (const contact of contacts) {
    const integrationIds = contact.integrationIds as {
      zoho?: {
        contact?: {
          id: string;
        };
        lead?: {
          id: string;
        };
      };
    };

    if (integrationIds?.zoho?.lead?.id) {
      await updateZohoLeadQueue(contact.orgId, integrationIds.zoho?.lead?.id, {
        Lead_Status: lifecycle.name,
      });
    }
    if (lifecycleId) {
      await integrationTriggerQueue.add("zoho-bigin-deal-update", {
        integrationName: "zoho",
        triggerKey: ZohoTriggers.BIGIN_DEAL_CREATE,
        orgId: contact.orgId,
        data: {
          name: contact.name,
          source: contact.source,
          email: contact.email,
          phone: contact.phone,
          notes: contact.notes,
          lifecycleId,
        },
        rateupContactId: contact.id,
      });
      triggerConversionsApiForContact(contact, lifecycleId);
    }
  }

  await syncLeadsToContactLifecycle(contactIds, lifecycleId, orgId);
}

export async function bulkUpdateWaMessageAssignStatus(
  contactIds: string[],
  orgId: string,
  requestedStatus: WaMessageAssignStatus,
  userId?: string,
  messageId?: string,
  resolutionResult?: ResolutionResult | null,
) {
  // Same translation as `updateContactById`: SPAM is a contact flag now, and the
  // tickets underneath it simply close.
  const markingSpam = requestedStatus === WaMessageAssignStatus.SPAM;
  const waMessageAssignStatus = markingSpam ? WaMessageAssignStatus.CLOSED : requestedStatus;
  const contacts = await prisma.contact.findMany({
    where: {
      id: { in: contactIds },
      orgId,
    },
    select: {
      id: true,
      phone: true,
      name: true,
      orgId: true,
      waMessageAssignStatus: true,
      lastReceivedMessageTimeStamp: true,
      blockedOnWhatsApp: true,
    },
  });

  if (!contacts.length) return [];

  const closing = WaMessageClosedStatus.includes(waMessageAssignStatus);
  const actor: InboxActor = resolveInboxActor(userId);
  const now = new Date();

  //  Bulk update -- contacts and their latest conversations commit together so
  //  the two status columns cannot drift.
  await prisma.$transaction(async (tx) => {
    await tx.contact.updateMany({
      where: {
        id: { in: contactIds },
        orgId,
      },
      data: {
        waMessageAssignStatus,
        ...(closing
          ? {
              closedAt: now,
              // `closedBy` is an FK to User: never write a sentinel actor here.
              closedBy: resolveClosedByUserId(actor),
            }
          : {}),
        ...(markingSpam
          ? { isSpam: true, spamMarkedAt: now, spamMarkedBy: resolveClosedByUserId(actor) }
          : {}),
      },
    });

    // One conversation per contact: the most recently created.
    const conversations = await tx.conversation.findMany({
      where: { contactId: { in: contactIds } },
      orderBy: [{ contactId: "asc" }, { createdAt: "desc" }],
      select: { id: true, contactId: true, status: true },
    });
    const latest = [
      ...conversations
        .reduce((acc, c) => (acc.has(c.contactId) ? acc : acc.set(c.contactId, c)), new Map())
        .values(),
    ];

    // An already-closed conversation is never reopened in place; see
    // `mirrorConversationStatusTx`.
    const latestIds = latest
      .filter((c) => closing || !WaMessageClosedStatus.includes(c.status))
      .map((c) => c.id);

    if (latestIds.length) {
      await tx.conversation.updateMany({
        where: { id: { in: latestIds } },
        data: conversationStatusData(
          waMessageAssignStatus,
          actor,
          markingSpam ? CloseReason.SPAM : undefined,
          now,
          resolutionResult,
        ),
      });
    }
  });

  const newField = mapStatusToField(waMessageAssignStatus);
  const transitions: Partial<Record<StatsField, number>> = {};

  for (const c of contacts) {
    if (
      c.lastReceivedMessageTimeStamp &&
      !c.blockedOnWhatsApp &&
      c.waMessageAssignStatus !== waMessageAssignStatus
    ) {
      const oldField = mapStatusToField(c.waMessageAssignStatus);
      if (oldField && newField) {
        transitions[oldField] = (transitions[oldField] ?? 0) + 1;
      }
    }
  }

  for (const [oldField, count] of Object.entries(transitions) as Array<[StatsField, number]>) {
    await transitionInboxStat(orgId, oldField, newField, count);
  }

  //  Execute triggers in parallel

  await Promise.all(
    contacts.map(async (contact) => {
      const bulkTriggerEvent =
        waMessageAssignStatus === WaMessageAssignStatusTab.Closed
          ? "CHAT_CLOSED"
          : waMessageAssignStatus === WaMessageAssignStatus.ASSIGNED
            ? "CHAT_ASSIGNED"
            : null;
      if (bulkTriggerEvent) {
        const channel = await resolveContactChannel(contact);
        checkAndExecuteRuleByTriggerEvent(bulkTriggerEvent, {
          orgId: contact.orgId,
          phone: contact.phone,
          ...channel,
        });
      }

      await addZapierTriggerToQueue(
        ZapierTriggers.CONTACT_UPDATED,
        { [ZapierTriggers.CONTACT_UPDATED]: contact },
        contact.orgId,
      );

      if (closing) {
        await addZapierTriggerToQueue(
          ZapierTriggers.CONVERSATION_CLOSED,
          { [ZapierTriggers.CONVERSATION_CLOSED]: contact },
          contact.orgId,
        );
      }

      if (!closing) return;

      // Handle assigned users

      const assignedUsers = await getAssignedUserForContact(contact.id);

      await deleteAssignedUsersforContact(contact.id);

      await Promise.all(
        assignedUsers.map(async (assignee) => {
          const notificationSetting = await getNotificationSettings(
            assignee.assignedUserId,
            contact.orgId,
          );

          if (notificationSetting?.waMessageClosedNotification) {
            await notificationQueue.add("notification", {
              systemNotificationData: {
                userId: assignee.assignedUserId,
                orgId: contact.orgId,
                source: "whatsapp",
                subSource: "chat-closed",
                data: {
                  contactId: contact.id,
                  contactName: contact.name,
                },
              },
            });
          }
        }),
      );

      if (waMessageAssignStatus) {
        await createInternalWaMessage({
          trigerredByUser: userId,
          contactId: contact.id,
          // The thread records the event that was asked for, not its storage form.
          waMessageAssignStatus: markingSpam ? WaMessageAssignStatus.SPAM : waMessageAssignStatus,
          messageId: messageId ?? crypto.randomUUID(),
        });
      }

      // The conversation was already closed in the transaction above.
    }),
  );

  return contacts;
}
