import prisma from "../../../../utils/prisma.js";
import { UpdateInboxAutomationInput } from "./inboxautomation.schema.js";
import { InboxAutomationCondition } from "../../../../../generated/prisma/client.js";
import { updateContactById } from "../../../contact/contact.service.js";
import { WaMessageAssignStatus } from "../../../../types/enums.js";

export async function enableInboxAutomation(orgId: string, condition: InboxAutomationCondition) {
  const existing = await prisma.inboxAutomation.findFirst({
    where: { orgId, condition },
  });
  if (existing) {
    if (!existing.active) {
      return await prisma.inboxAutomation.update({
        where: { id: existing.id },
        data: { active: true },
      });
    }
    return existing;
  }
  return await prisma.inboxAutomation.create({
    data: {
      org: {
        connect: { id: orgId },
      },
      condition,
      active: true,
      action: "CLOSE",
      closeAfterHours: 24, // 24 hours default
    },
  });
}

export async function getInboxAutomation(orgId: string, condition?: InboxAutomationCondition) {
  if (condition) {
    return await prisma.inboxAutomation.findFirst({
      where: {
        orgId,
        condition,
      },
    });
  }
  return await prisma.inboxAutomation.findMany({
    where: {
      orgId,
    },
  });
}

export async function updateInboxAutomation(
  orgId: string,
  condition: InboxAutomationCondition,
  data: Omit<UpdateInboxAutomationInput, "condition">,
) {
  const existing = await prisma.inboxAutomation.findFirst({
    where: { orgId, condition },
  });

  const updateData: any = {};
  if (data.active !== undefined) updateData.active = data.active;
  if (data.action !== undefined) updateData.action = data.action;
  if (data.closeAfterHours !== undefined) {
    updateData.closeAfterHours = data.closeAfterHours;
  }

  if (!existing) {
    return await prisma.inboxAutomation.create({
      data: {
        ...updateData,
        condition,
        org: { connect: { id: orgId } },
      },
    });
  }

  return await prisma.inboxAutomation.update({
    where: { id: existing.id },
    data: updateData,
  });
}

export async function deleteInboxAutomation(orgId: string, condition: InboxAutomationCondition) {
  return await prisma.inboxAutomation.deleteMany({
    where: { orgId, condition },
  });
}

export async function runInboxAutomationCron() {
  const activeAutomations = await prisma.inboxAutomation.findMany({
    where: { active: true },
  });

  for (const automation of activeAutomations) {
    const delayHours = getDelayHours(automation);
    const cutoffTime = new Date(Date.now() - delayHours * 60 * 60 * 1000);
    const statusToFind = automation.condition === "ASSIGNED" ? "ASSIGNED" : "UNASSIGNED";

    // Idleness is a property of the open conversation, not the contact: a
    // session with no traffic since the cutoff (or none at all, when it is
    // older than the cutoff) gets auto-closed. `lastMessageAt` covers both
    // directions and excludes INTERNAL markers.
    const idleConversations = await prisma.conversation.findMany({
      where: {
        orgId: automation.orgId,
        closedAt: null,
        status: statusToFind,
        createdAt: { lt: cutoffTime },
        OR: [{ lastMessageAt: null }, { lastMessageAt: { lt: cutoffTime } }],
      },
      select: {
        id: true,
        contactId: true,
      },
    });

    for (const conversation of idleConversations) {
      try {
        // Closing goes through the contact so every legacy side effect (rules,
        // InboxStats, Zapier, notifications, close marker) still fires; the
        // conversation row is closed by the transactional mirror inside.
        await updateContactById(
          conversation.contactId,
          {
            waMessageAssignStatus: WaMessageAssignStatus.CLOSED,
          },
          "RateUp",
          undefined,
          // Idle auto-close: no acting user, so attribution lives in closeReason.
          { source: "automation" },
        );
      } catch (err) {
        console.error(`Failed to auto-close conversation ${conversation.id}:`, err);
      }
    }
  }
}

function getDelayHours(automation: { closeAfterHours: number | null }): number {
  if (automation.closeAfterHours === null || automation.closeAfterHours === undefined) return 24;
  return automation.closeAfterHours;
}
