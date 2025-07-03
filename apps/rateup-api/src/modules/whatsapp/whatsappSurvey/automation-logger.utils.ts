import prisma from "../../../utils/prisma";
import { log } from "../../../utils/logger";

/**
 * Finds the most recent active automation for a user
 * @param phone User's phone number
 * @param orgId Organization ID
 * @param options Optional query parameters
 * @returns The most recent active automation or null
 */
export async function findRecentAutomation(
  phone: string,
  orgId: string,
  options: {
    includeCompleted?: boolean;
    timeWindow?: number; // in milliseconds
  } = {},
) {
  const { includeCompleted = false, timeWindow } = options;

  const whereClause: any = {
    phone,
    orgId,
  };

  //   // Add status filter if we don't want completed automations
  //   if (!includeCompleted) {
  //     whereClause.status = {
  //       not: "completed",
  //     };
  //   }

  // Add time window filter if specified
  if (timeWindow) {
    whereClause.createdAt = {
      gte: new Date(Date.now() - timeWindow),
    };
  }

  return await prisma.waAutomatedReplyMessage.findFirst({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      waAutomatedReply: {
        select: {
          matchData: true,
          id: true,
          whatsappSettingsPhoneId: true,
        },
      },
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
  response?: Record<string, any>;
  status?: string;
}) {
  try {
    const data: any = {
      phone,
      currentNode: nodeId,
      waAutomatedReplyId: automationId,
      orgId,
      response,
    };

    if (status) {
      data.status = status;
    }

    return await prisma.waAutomatedReplyMessage.create({ data });
  } catch (error) {
    log.error(`Error logging automation action: ${error.message}`);
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
  recentActivity?: any;
}) {
  // If no recent activity, find the most recent one
  if (!recentActivity) {
    recentActivity = await findRecentAutomation(phone, orgId);
  }

  // If there's an active automation, log the flow completion
  if (recentActivity?.waAutomatedReply) {
    return await logAutomationAction({
      phone,
      nodeId: recentActivity.currentNode,
      automationId: recentActivity.waAutomatedReplyId,
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
