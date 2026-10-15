/**
 * CRUD for the chatbot flows that run over Meta's Send API: Instagram and Messenger.
 * Both live in WaAutomatedReply, told apart by `platform`; every query here is scoped to
 * one platform so an Instagram id can never load, change or delete a Messenger flow, or
 * the reverse. WhatsApp flows are handled by wa_automatedReply.service.ts.
 */

import { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { PlatformType, WaAutomationProgressStatus } from "../../../../generated/prisma/enums.js";
import type { MetaFlowChannel } from "../meta/sendApiMessages.js";

export type MetaAutomationPlatform = MetaFlowChannel["platform"];

function logPrefix(platform: MetaAutomationPlatform) {
  return platform === PlatformType.FACEBOOK ? "[Messenger Automation]" : "[Instagram Automation]";
}

/**
 * Get all of an organization's automations on one platform
 */
export async function getMetaAutomationsByOrgId(orgId: string, platform: MetaAutomationPlatform) {
  try {
    return await prisma.waAutomatedReply.findMany({
      where: {
        orgId,
        platform,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    log.error(
      { err: error },
      `${logPrefix(platform)} Error fetching automations for orgId ${orgId}`,
    );
    throw error;
  }
}

/**
 * Get one automation, only if it belongs to the org and is on the platform
 */
export async function getMetaAutomationById(
  id: string,
  orgId: string,
  platform: MetaAutomationPlatform,
) {
  try {
    return await prisma.waAutomatedReply.findFirst({
      where: {
        id,
        orgId,
        platform,
      },
    });
  } catch (error) {
    log.error({ err: error }, `${logPrefix(platform)} Error fetching automation ${id}`);
    throw error;
  }
}

/**
 * Create a new automation on a platform
 */
export async function createMetaAutomation(
  platform: MetaAutomationPlatform,
  data: {
    orgId: string;
    name: string;
    matchData: WaAutomatedReplyMatchData;
    whatsappSettingsPhoneId?: string;
  },
) {
  try {
    const automation = await prisma.waAutomatedReply.create({
      data: {
        orgId: data.orgId,
        name: data.name,
        matchData: data.matchData,
        platform,
        whatsappSettingsPhoneId: data.whatsappSettingsPhoneId,
      },
    });

    log.info(`${logPrefix(platform)} Created automation ${automation.id} for orgId ${data.orgId}`);

    return automation;
  } catch (error) {
    log.error(
      { err: error },
      `${logPrefix(platform)} Error creating automation for orgId ${data.orgId}`,
    );
    throw error;
  }
}

/**
 * Update an automation
 */
export async function updateMetaAutomation(
  id: string,
  orgId: string,
  platform: MetaAutomationPlatform,
  data: {
    name?: string;
    matchData?: WaAutomatedReplyMatchData;
    whatsappSettingsPhoneId?: string;
  },
) {
  try {
    const automation = await prisma.waAutomatedReply.update({
      where: {
        id,
        orgId,
        platform,
      },
      data: {
        name: data.name,
        matchData: data.matchData,
        whatsappSettingsPhoneId: data.whatsappSettingsPhoneId,
      },
    });

    log.info(`${logPrefix(platform)} Updated automation ${id}`);

    return automation;
  } catch (error) {
    log.error({ err: error }, `${logPrefix(platform)} Error updating automation ${id}`);
    throw error;
  }
}

/**
 * Copy an automation, graph and all, as a new one on the same platform. Run history is
 * not copied. Returns null when the org has no such automation on the platform.
 */
export async function cloneMetaAutomation(
  id: string,
  orgId: string,
  platform: MetaAutomationPlatform,
  name?: string,
) {
  const source = await getMetaAutomationById(id, orgId, platform);
  if (!source) return null;

  const automation = await prisma.waAutomatedReply.create({
    data: {
      orgId,
      name: name || `${source.name} Copy`,
      matchData: source.matchData,
      platform,
      whatsappSettingsPhoneId: source.whatsappSettingsPhoneId,
    },
  });

  log.info(`${logPrefix(platform)} Cloned automation ${id} as ${automation.id}`);

  return automation;
}

/**
 * Delete an automation and its run history
 */
export async function deleteMetaAutomation(
  id: string,
  orgId: string,
  platform: MetaAutomationPlatform,
) {
  try {
    // Both in one transaction, as deleteRule does: otherwise a failure on the second
    // statement leaves the automation alive with its history already gone.
    await prisma.$transaction(async (tx) => {
      await tx.waAutomatedReplyMessage.deleteMany({
        where: { waAutomatedReplyId: id },
      });

      await tx.waAutomatedReply.delete({
        where: {
          id,
          orgId,
          platform,
        },
      });
    });

    log.info(`${logPrefix(platform)} Deleted automation ${id}`);

    return { success: true };
  } catch (error) {
    log.error({ err: error }, `${logPrefix(platform)} Error deleting automation ${id}`);
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
      { err: error },
      `[Instagram Automation] Error finding recent automation for igsId ${igsId}`,
    );
    return null;
  }
}

/**
 * Log a flow action
 */
export async function logMetaFlowAction(params: {
  /** igsId on Instagram, psid on Messenger. */
  recipientId: string;
  nodeId: string;
  automationId: string;
  orgId: string;
  response?: Prisma.InputJsonValue;
}) {
  try {
    // Log to console instead of database as waAutomatedReplyActionLog table doesn't exist
    log.info(
      { response: params.response, recipientId: params.recipientId },
      `[Meta Automation] Action logged - Node: ${params.nodeId}, Automation: ${params.automationId}`,
    );
    return { nodeId: params.nodeId, response: params.response };
  } catch (error) {
    log.error(
      { err: error },
      `[Meta Automation] Error logging action for automation ${params.automationId}`,
    );
    return null;
  }
}

/**
 * Create or restart the tracking row for one recipient's run of a flow. The row is
 * keyed by recipient + automation; ids are page- or account-scoped, so no channel
 * column is needed.
 */
export async function createOrUpdateMetaFlowRun(params: {
  /** igsId on Instagram, psid on Messenger. Stored in the `phone` column. */
  recipientId: string;
  automationId: string;
  orgId: string;
  currentNode: string;
  status?: WaAutomationProgressStatus;
}) {
  try {
    // Check if automation message already exists
    const existing = await prisma.waAutomatedReplyMessage.findFirst({
      where: {
        phone: params.recipientId,
        waAutomatedReplyId: params.automationId,
        orgId: params.orgId,
      },
    });

    const statusValue = params.status || WaAutomationProgressStatus.inProgress;

    if (existing) {
      // A re-run starts clean: the last run's answers and wait marker must not leak in.
      return await prisma.waAutomatedReplyMessage.update({
        where: { id: existing.id },
        data: {
          currentNode: params.currentNode,
          status: statusValue,
          response: Prisma.DbNull,
        },
      });
    } else {
      return await prisma.waAutomatedReplyMessage.create({
        data: {
          phone: params.recipientId,
          waAutomatedReplyId: params.automationId,
          orgId: params.orgId,
          currentNode: params.currentNode,
          status: statusValue,
        },
      });
    }
  } catch (error) {
    log.error({ err: error }, `[Meta Automation] Error creating/updating automation message`);
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
    log.error({ err: error }, `[Instagram Automation] Error checking recent automation`);
    return false;
  }
}
