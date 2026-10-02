import { Contact } from "../../../generated/prisma/client.js";
import { log } from "../../utils/logger.js";
import prisma from "../../utils/prisma.js";
import { ContactNotFoundError } from "./contact.errors.js";
import { buildContactListWhere } from "./contact.listQuery.js";
import { releaseThreadsOnTicketClose } from "../metaAgent/metaAgent.autoRelease.js";
export { ContactNotFoundError };
import {
  ContactCore,
  createMultipleContactInput,
  CustomFieldSchema,
  PaginationQuery,
  updateContactSchema,
} from "./contact.schema.js";
import { addExistingContactsToMultipleGroups } from "./contactGroup/contactGroup.service.js";
import { CloseReason, ResolutionResult, WaMessageAssignStatus } from "../../types/enums.js";
import { triggerConversionsApiForContact } from "../integrations/meta/conversions.service.js";
import {
  assignWaMessageToUser,
  createInternalWaMessage,
  deleteAssignedUsersforContact,
  getAssignedUserForContact,
} from "../whatsapp/inbox/message/wamessage.service.js";
import { notify } from "../notification/notify.js";
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
import { emitIntegrationEvent } from "../integrations/events/emitIntegrationEvent.js";
import {
  mapStatusToField,
  transitionInboxStat,
  incrementInboxStat,
  decrementInboxStat,
  type StatsField,
} from "../whatsapp/inbox/inboxStats/inboxStats.service.js";

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

export async function createContact(
  contact: ContactCore & { orgId: string },
  userId?: string,
  /** `quiet`: a bulk import — skip the automation rule, Zap and CRM pushes that fire per contact. */
  options: { quiet?: boolean } = {},
) {
  if (!contact.phone) {
    throw new Error("Phone must be provided");
  }
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
  if (options.quiet) return user;
  await checkAndExecuteRuleByTriggerEvent("CONTACT_CREATED", {
    orgId: user?.orgId,
    phone: contact?.phone,
    // A contact created here has no thread yet, so this resolves off its own
    // identifiers and stays "ALL" for a plain phone import.
    ...(await resolveContactChannel(user)),
  });
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
  await emitIntegrationEvent(user.orgId, {
    type: "contact.created",
    contact: user,
    ...(lifecycleName && { lifecycleName }),
  });
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

  await emitIntegrationEvent(user.orgId, { type: "contact.created", contact: user });
  if (customFields?.length) {
    await prisma.contactCustomFieldValue.createMany({
      data: customFields.map((field) => toContactCustomFieldValueInput(field, user.id)),
      skipDuplicates: true,
    });
  }
  return user;
}

export async function createMultipleContacts(contacts: createMultipleContactInput, orgId: string) {
  // These keys come in on the input DTO but are not Contact columns — they are persisted
  // separately below, so they are blanked out of the create payload.
  const omitted: undefined = undefined;
  const contactsData = contacts.map((contact) => ({
    ...contact,
    orgId,
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

    // Batch integration events
    for (let i = 0; i < createdContacts.length; i += BATCH_SIZE) {
      const batch = createdContacts.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map((contact) => emitIntegrationEvent(orgId, { type: "contact.created", contact })),
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
/**
 * Everything the contacts table's detail dialog shows about one contact.
 *
 * Deliberately separate from `getContactById`: that one is also on the Zapier and
 * inbox paths, where these joins would be dead weight. `include` (not `select`) so
 * every scalar column — consent, dob, spam/block flags, the last-message stamps —
 * comes through without having to be listed and kept in sync by hand.
 */
export async function getContactFullDetailsById(contactId: string, orgId: string) {
  return await prisma.contact.findFirst({
    where: { id: contactId, orgId },
    include: {
      ContactLabelMap: {
        select: { label: { select: { id: true, name: true, color: true, description: true } } },
      },
      contactGroups: {
        select: { contactGroup: { select: { id: true, name: true, createdAt: true } } },
      },
      Lifecycle: { select: { id: true, name: true } },
      customFields: {
        select: {
          id: true,
          fieldId: true,
          value: true,
          createdAt: true,
          field: { select: { id: true, name: true, type: true, visibility: true } },
        },
      },
      // The inbox's contact-level assignment. The list endpoint takes only the id
      // here; the dialog names the person, so it joins the user and their team.
      waInboxAssign: {
        select: {
          assignedUser: { select: { id: true, name: true, email: true, profilePhoto: true } },
          Team: { select: { id: true, name: true } },
        },
      },
      closedByUser: { select: { id: true, name: true, email: true } },
      leads: {
        select: {
          id: true,
          name: true,
          status: true,
          source: true,
          channel: true,
          stageEnteredAt: true,
          expectedCloseAt: true,
          closedAt: true,
          createdAt: true,
          stage: { select: { id: true, name: true, color: true, status: true } },
          pipeline: { select: { id: true, name: true, type: true } },
          owner: { select: { id: true, name: true } },
          assignees: { select: { assignee: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: "asc" as const },
      },
      campaignParticipants: {
        select: {
          id: true,
          campaignId: true,
          campaign: { select: { id: true, name: true } },
        },
        take: 20,
      },
      loyaltyAccounts: {
        select: {
          id: true,
          currentPoints: true,
          lifetimePoints: true,
          totalSpend: true,
          referralCode: true,
          currentTier: { select: { id: true, name: true } },
          program: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function getContactByIdForWebhook(contactId: string) {
  return await prisma.contact.findUnique({ where: { id: contactId } });
}

/** Every contact id the contacts list would show for this query, across all of its pages. */
export async function getContactIdsByListQuery(orgId: string, query: PaginationQuery) {
  const contacts = await prisma.contact.findMany({
    where: buildContactListWhere(orgId, query),
    select: { id: true },
  });
  return contacts.map((contact) => contact.id);
}

export async function getContactsByOrgId(orgId: string, query?: PaginationQuery) {
  const {
    page = 0,
    limit = 500,
    sort = "createdAt",
    desc = "desc",
  } = query ?? {
    page: 0,
    limit: 500,
    sort: "createdAt",
    desc: "asc",
  };
  const searchCondition = buildContactListWhere(orgId, query);
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
    // The contacts table's Stage column: the Leads board only, where a contact has at
    // most one lead. `take` keeps this a bounded join on a 500-row page.
    leads: {
      where: { pipeline: { type: "LEADS" as const } },
      select: {
        id: true,
        stageId: true,
        stage: { select: { name: true, color: true } },
      },
      orderBy: { createdAt: "asc" as const },
      take: 1,
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
  await emitIntegrationEvent(user.orgId, { type: "contact.deleted", contact: user });
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

  const targetTicket = contact.conversationId
    ? await prisma.conversation.findFirst({
        where: { id: contact.conversationId, contactId },
        select: { id: true, status: true },
      })
    : null;
  if (contact.conversationId && !targetTicket) {
    throw new ContactNotFoundError(`Conversation ${contact.conversationId} not found`);
  }
  const newestTicket = targetTicket
    ? await prisma.conversation.findFirst({
        where: { contactId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      })
    : null;
  // The contact-level status mirrors its newest ticket, so closing an older one
  // leaves it alone; and whether anything changed is judged on the ticket itself.
  const contactStatus =
    !targetTicket || targetTicket.id === newestTicket?.id ? nextStatus : undefined;
  const statusChanged =
    contactStatus !== undefined && contactRecord.waMessageAssignStatus !== contactStatus;
  const ticketStatusChanged = targetTicket
    ? nextStatus !== undefined && targetTicket.status !== nextStatus
    : statusChanged;
  const closing = statusChanged && WaMessageClosedStatus.includes(nextStatus!);
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
        waMessageAssignStatus: contactStatus,
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
        address: contact.address,
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

    if (ticketStatusChanged) {
      await mirrorConversationStatusTx(tx, contactId, nextStatus!, transitionActor, {
        conversationId: targetTicket?.id,
        now,
        ...(markingSpam ? { closeReason: CloseReason.SPAM } : {}),
        resolutionResult: contact.resolutionResult ?? null,
      });
    }

    return updated;
  });

  // A closed ticket ends the escalation: Meta AI takes the customer's next
  // conversation, where the agent is set to. Spam is left with staff.
  if (closing && !markingSpam) {
    await releaseThreadsOnTicketClose(orgId, [contactId]);
  }

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
  await emitIntegrationEvent(updatedContact.orgId, {
    type: "contact.updated",
    contact: updatedContact,
    changed: updatedContact.lifecycleId ? ["details", "lifecycle"] : ["details"],
  });
  if (updatedContact.lifecycleId) {
    triggerConversionsApiForContact(updatedContact, updatedContact.lifecycleId);
  }

  if (
    WaMessageClosedStatus.includes(updatedContact.waMessageAssignStatus as WaMessageAssignStatus)
  ) {
    await emitIntegrationEvent(updatedContact.orgId, {
      type: "conversation.closed",
      contact: updatedContact,
    });
    const assignedUsers = await getAssignedUserForContact(updatedContact.id);
    await deleteAssignedUsersforContact(updatedContact.id);
    await notify({
      event: "inbox.closed",
      orgId: updatedContact.orgId,
      audience: { kind: "users", userIds: assignedUsers.map((a) => a.assignedUserId) },
      data: { contactId: updatedContact.id, contactName: updatedContact.name ?? "" },
      actorUserId: userId,
    });
    // The conversation was already mirrored inside the transaction above.
  }
  if (ticketStatusChanged && WaMessageClosedStatus.includes(nextStatus!)) {
    await createInternalWaMessage({
      trigerredByUser: userId || "RateUp",
      contactId: updatedContact.id,
      conversationId: targetTicket?.id,
      // The thread records the *event* the caller asked for: a spam mark reads as
      // spam even though the ticket underneath it is stored as CLOSED.
      waMessageAssignStatus: markingSpam ? WaMessageAssignStatus.SPAM : nextStatus,
      messageId: contact.messageId ?? crypto.randomUUID(),
    });
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
      contact = await prisma.contact.create({
        data: {
          ...additionalData,
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
      await emitIntegrationEvent(orgId, { type: "contact.created", contact });
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
      contact = await prisma.contact.create({
        data: {
          ...additionalData,
          igsId,
          orgId,
        },
      });
      if (addToConversation) {
        conversation = await createConversation({ contactId: contact.id, orgId: contact.orgId });
      }
      await emitIntegrationEvent(orgId, { type: "contact.created", contact });
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

    contact = await prisma.contact.create({
      data: {
        ...additionalData,
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

    await emitIntegrationEvent(orgId, { type: "contact.created", contact });

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
    await emitIntegrationEvent(contact.orgId, { type: "contact.deleted", contact });
  }
  return res;
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
    await emitIntegrationEvent(contact.orgId, {
      type: "contact.updated",
      contact: { ...contact, lifecycleId },
      changed: ["lifecycle"],
    });
    if (lifecycleId) triggerConversionsApiForContact(contact, lifecycleId);
  }
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

  if (closing && !markingSpam) {
    await releaseThreadsOnTicketClose(
      orgId,
      contacts.map((c) => c.id),
    );
  }

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

      await emitIntegrationEvent(contact.orgId, {
        type: "contact.updated",
        contact,
        changed: ["status"],
      });

      if (closing) {
        await emitIntegrationEvent(contact.orgId, { type: "conversation.closed", contact });
      }

      if (!closing) return;

      // Handle assigned users

      const assignedUsers = await getAssignedUserForContact(contact.id);

      await deleteAssignedUsersforContact(contact.id);

      await notify({
        event: "inbox.closed",
        orgId: contact.orgId,
        audience: { kind: "users", userIds: assignedUsers.map((a) => a.assignedUserId) },
        data: { contactId: contact.id, contactName: contact.name ?? "" },
        actorUserId: userId,
      });

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
