/**
 * Instagram Automated Reply Service
 * Handles CRUD operations for Instagram automations
 * Completely isolated from WhatsApp automation to prevent cross-platform interference
 */

import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";

/**
 * Get all Instagram automated replies for an organization
 */
export async function getInstagramAutomatedRepliesByOrgId(orgId: string) {
  try {
    return await prisma.waAutomatedReply.findMany({
      where: {
        orgId,
        platform: PlatformType.INSTAGRAM,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    log.error(
      `[Instagram Automation] Error fetching automations for orgId ${orgId}: %o`,
      error,
    );
    throw error;
  }
}

/**
 * Get Instagram automated reply by ID
 */
export async function getInstagramAutomatedReplyById(id: string) {
  try {
    return await prisma.waAutomatedReply.findFirst({
      where: {
        id,
        platform: PlatformType.INSTAGRAM,
      },
    });
  } catch (error) {
    log.error(
      `[Instagram Automation] Error fetching automation ${id}: %o`,
      error,
    );
    throw error;
  }
}

/**
 * Create a new Instagram automated reply
 */
export async function createInstagramAutomatedReply(data: {
  orgId: string;
  name: string;
  matchData: any;
  whatsappSettingsPhoneId?: string;
  sendOnceIn24Hours?: boolean;
  isActive?: boolean;
}) {
  try {
    const automation = await prisma.waAutomatedReply.create({
      data: {
        orgId: data.orgId,
        name: data.name,
        matchData: data.matchData,
        platform: PlatformType.INSTAGRAM,
        whatsappSettingsPhoneId: data.whatsappSettingsPhoneId,
      },
    });

    log.info(
      `[Instagram Automation] Created automation ${automation.id} for orgId ${data.orgId}`,
    );

    return automation;
  } catch (error) {
    log.error(
      `[Instagram Automation] Error creating automation for orgId ${data.orgId}: %o`,
      error,
    );
    throw error;
  }
}

/**
 * Update an Instagram automated reply
 */
export async function updateInstagramAutomatedReply(
  id: string,
  data: {
    name?: string;
    matchData?: any;
    whatsappSettingsPhoneId?: string;
    sendOnceIn24Hours?: boolean;
    isActive?: boolean;
  },
) {
  try {
    const automation = await prisma.waAutomatedReply.update({
      where: {
        id,
        platform: PlatformType.INSTAGRAM,
      },
      data: {
        name: data.name,
        matchData: data.matchData,
        whatsappSettingsPhoneId: data.whatsappSettingsPhoneId,
        sendOnceIn24Hours: data.sendOnceIn24Hours,
        isEnabled: data.isActive,
      },
    });

    log.info(`[Instagram Automation] Updated automation ${id}`);

    return automation;
  } catch (error) {
    log.error(
      `[Instagram Automation] Error updating automation ${id}: %o`,
      error,
    );
    throw error;
  }
}

/**
 * Delete an Instagram automated reply
 */
export async function deleteInstagramAutomatedReply(id: string) {
  try {
    // Delete automation messages
    await prisma.waAutomatedReplyMessage.deleteMany({
      where: { waAutomatedReplyId: id },
    });

    // Delete automation
    await prisma.waAutomatedReply.delete({
      where: {
        id,
        platform: PlatformType.INSTAGRAM,
      },
    });

    log.info(`[Instagram Automation] Deleted automation ${id}`);

    return { success: true };
  } catch (error) {
    log.error(
      `[Instagram Automation] Error deleting automation ${id}: %o`,
      error,
    );
    throw error;
  }
}

/**
 * Find recent Instagram automation for a user
 */
export async function findRecentInstagramAutomation(
  igsId: string,
  orgId: string,
  options: { timeWindow?: number } = {},
) {
  try {
    const timeWindow = options.timeWindow || 24 * 60 * 60 * 1000; // Default 24 hours
    const cutoffTime = new Date(Date.now() - timeWindow);

    return await prisma.waAutomatedReplyMessage.findFirst({
      where: {
        phone: igsId,
        orgId,
        createdAt: { gte: cutoffTime },
        waAutomatedReply: {
          platform: PlatformType.INSTAGRAM,
        },
      },
      include: {
        waAutomatedReply: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    log.error(
      `[Instagram Automation] Error finding recent automation for igsId ${igsId}: %o`,
      error,
    );
    return null;
  }
}

/**
 * Log Instagram automation action
 */
export async function logInstagramAutomationAction(params: {
  igsId: string;
  nodeId: string;
  automationId: string;
  orgId: string;
  response?: any;
}) {
  try {
    // Log to console instead of database as waAutomatedReplyActionLog table doesn't exist
    log.info(
      `[Instagram Automation] Action logged - Node: ${params.nodeId}, Automation: ${params.automationId}, Response: %o`,
      params.response,
    );
    return { nodeId: params.nodeId, response: params.response };
  } catch (error) {
    log.error(
      `[Instagram Automation] Error logging action for automation ${params.automationId}: %o`,
      error,
    );
    return null;
  }
}

/**
 * Create or update Instagram automation message tracking
 */
export async function createOrUpdateInstagramAutomationMessage(params: {
  igsId: string;
  automationId: string;
  orgId: string;
  currentNode: string;
  status?: string;
}) {
  try {
    // Check if automation message already exists
    const existing = await prisma.waAutomatedReplyMessage.findFirst({
      where: {
        phone: params.igsId,
        waAutomatedReplyId: params.automationId,
        orgId: params.orgId,
      },
    });

    const statusValue = params.status || "inProgress";

    if (existing) {
      return await prisma.waAutomatedReplyMessage.update({
        where: { id: existing.id },
        data: {
          currentNode: params.currentNode,
          status: statusValue as any,
        },
      });
    } else {
      return await prisma.waAutomatedReplyMessage.create({
        data: {
          phone: params.igsId,
          waAutomatedReplyId: params.automationId,
          orgId: params.orgId,
          currentNode: params.currentNode,
          status: statusValue as any,
        },
      });
    }
  } catch (error) {
    log.error(
      `[Instagram Automation] Error creating/updating automation message: %o`,
      error,
    );
    throw error;
  }
}

/**
 * Check if automation was sent in the last 24 hours
 */
export async function wasInstagramAutomationSentRecently(
  igsId: string,
  automationId: string,
  orgId: string,
): Promise<boolean> {
  try {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentMessage = await prisma.waAutomatedReplyMessage.findFirst({
      where: {
        phone: igsId,
        waAutomatedReplyId: automationId,
        orgId,
        createdAt: { gte: cutoffTime },
      },
    });

    return !!recentMessage;
  } catch (error) {
    log.error(
      `[Instagram Automation] Error checking recent automation: %o`,
      error,
    );
    return false;
  }
}
