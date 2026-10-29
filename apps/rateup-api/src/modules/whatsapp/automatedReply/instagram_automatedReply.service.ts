/**
 * Lookups and run records for the chatbot flows that run over Meta's Send API: Instagram and
 * Messenger. Both live in WaAutomatedReply, told apart by `platform`; the lookup is scoped
 * to one platform so an Instagram id can never load a Messenger flow, or the reverse.
 * Creating, editing and deleting chatbots is `/api/chatbots` (modules/chatbots).
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
