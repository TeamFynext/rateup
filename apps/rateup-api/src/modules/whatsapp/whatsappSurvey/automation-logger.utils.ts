import { Prisma, WaAutomationProgressStatus } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { getAutomationPosition, setAutomationPosition } from "./automationProgress.js";

const automationSelect = {
  matchData: true,
  id: true,
  whatsappSettingsPhoneId: true,
} satisfies Prisma.WaAutomatedReplySelect;

export interface RecentAutomation {
  /** The log row the position came from, when there is one. */
  id: string | null;
  currentNode: string | null;
  waAutomatedReplyId: string | null;
  waAutomatedReply: Prisma.WaAutomatedReplyGetPayload<{ select: typeof automationSelect }> | null;
}

/**
 * The automation a contact is currently in, and the node they are at.
 *
 * Read from the Redis position (`automationProgress.ts`). `timeWindow` ignores a
 * position whose last logged step is older than that.
 */
export async function findRecentAutomation(
  phone: string,
  orgId: string,
  options: {
    timeWindow?: number; // in milliseconds
  } = {},
): Promise<RecentAutomation | null> {
  const { timeWindow } = options;

  const position = await getAutomationPosition(orgId, phone);
  if (!position) return findRecentAutomationFromLog(phone, orgId, timeWindow);
  if (timeWindow && position.loggedAt < Date.now() - timeWindow) return null;

  // Scoped by org, and gone if the automation was deleted since.
  const waAutomatedReply = await prisma.waAutomatedReply.findFirst({
    where: { id: position.automationId, orgId },
    select: automationSelect,
  });
  if (!waAutomatedReply) return null;

  return {
    id: position.logId,
    currentNode: position.currentNode,
    waAutomatedReplyId: position.automationId,
    waAutomatedReply,
  };
}

/**
 * The pre-Redis lookup: the contact's newest log row. Only answers for contacts
 * who were part-way through an automation when positions moved to Redis
 * (2026-09-26); every step logged since then writes a position. Remove once
 * POSITION_TTL_SECONDS has passed since that deploy.
 */
async function findRecentAutomationFromLog(
  phone: string,
  orgId: string,
  timeWindow: number | undefined,
): Promise<RecentAutomation | null> {
  return await prisma.waAutomatedReplyMessage.findFirst({
    where: {
      phone,
      orgId,
      ...(timeWindow ? { createdAt: { gte: new Date(Date.now() - timeWindow) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      currentNode: true,
      waAutomatedReplyId: true,
      waAutomatedReply: { select: automationSelect },
    },
  });
}

/**
 * Logs user actions in automated WhatsApp flows
 * @param params Parameters for the log entry
 * @returns The created log entry
 */
export async function logAutomationAction({
  phone,
  nodeId,
  automationId,
  orgId,
  response = {},
  status = undefined,
}: {
  phone: string;
  nodeId: string;
  automationId: string;
  orgId: string;
  response?: Prisma.InputJsonValue;
  status?: WaAutomationProgressStatus;
}) {
  try {
    const data: Prisma.WaAutomatedReplyMessageUncheckedCreateInput = {
      phone,
      currentNode: nodeId,
      waAutomatedReplyId: automationId,
      orgId,
      response,
    };

    if (status) {
      data.status = status;
    }

    const row = await prisma.waAutomatedReplyMessage.create({ data });
    await setAutomationPosition(orgId, phone, {
      automationId,
      currentNode: nodeId,
      logId: row.id,
    });
    return row;
  } catch (error) {
    log.error({ err: error }, "Error logging automation action");
    return null;
  }
}

/**
 * Logs flow completion when a user completes a WhatsApp flow
 */
export async function logFlowCompletion({
  phone,
  orgId,
  flowId,
  recentActivity = null,
}: {
  phone: string;
  orgId: string;
  flowId: string;
  recentActivity?: RecentAutomation | null;
}) {
  // If no recent activity, find the most recent one
  if (!recentActivity) {
    recentActivity = await findRecentAutomation(phone, orgId);
  }

  // If there's an active automation, log the flow completion
  if (recentActivity?.waAutomatedReply) {
    return await logAutomationAction({
      phone,
      nodeId: recentActivity.currentNode ?? "",
      automationId: recentActivity.waAutomatedReplyId ?? "",
      orgId,
      response: {
        value: "flow completed",
        flowId,
        action: "flow_completion",
      },
    });
  }

  return null;
}
