/**
 * Instagram Automation Handler
 * Handles automation triggers from Instagram messages
 * Completely isolated from WhatsApp to prevent cross-platform interference
 */

import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import {
  findRecentInstagramAutomation,
  getInstagramAutomatedReplyById,
} from "../automatedReply/instagram_automatedReply.service.js";
import {
  startInstagramAutomationFlow,
  handleInstagramUserResponse,
} from "../automatedReply/instagram_automation.service.js";

/**
 * Find an Instagram automation by matching a message body against the Rule system.
 * Queries RuleMessageBodyLock → RuleCondition → RuleConditionGroup → Rule → RuleAction (TRIGGER_CHATBOT)
 * to find the automation ID, then fetches the automation.
 */
async function findInstagramAutomationByCommand(
  orgId: string,
  messageBody: string,
) {
  try {
    // Look for a RuleMessageBodyLock entry matching the message body (or wildcard "*")
    const messageLowerCase = messageBody?.trim()?.toLowerCase() || "";

    // Try exact match first, then wildcard
    const candidates = [messageLowerCase];
    if (messageLowerCase !== "*") {
      candidates.push("*");
    }

    for (const candidate of candidates) {
      const lock = await prisma.ruleMessageBodyLock.findFirst({
        where: {
          orgId,
          messageBody: candidate,
        },
        include: {
          ruleCondition: {
            include: {
              group: {
                include: {
                  rule: {
                    include: {
                      actions: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!lock) continue;

      const rule = lock.ruleCondition?.group?.rule;
      if (!rule || !rule.isActive) continue;

      // Find a TRIGGER_CHATBOT action — this contains the automation ID
      const triggerAction = rule.actions?.find(
        (action) => action.type === "TRIGGER_CHATBOT",
      );

      if (!triggerAction?.value) continue;

      const automationId = triggerAction.value as string;

      // Fetch the Instagram automation
      const automation = await getInstagramAutomatedReplyById(automationId);
      if (automation && automation.isEnabled) {
        log.info(
          `[Instagram Automation Handler] Found ${candidate === "*" ? "wildcard" : "exact"} match via Rule system: automation ${automationId}`,
        );
        return automation;
      }
    }

    return null;
  } catch (error) {
    log.error(
      `[Instagram Automation Handler] Error matching command via Rule system: %o`,
      error,
    );
    return null;
  }
}

/**
 * Main handler for Instagram automation triggers
 * This is called when an Instagram message is received
 */
export async function handleInstagramAutomation(
  igsId: string,
  messageText: string,
  orgId: string,
  messagingObject: any,
): Promise<void> {
  try {
    log.trace(
      `[Instagram Automation Handler] Processing message from igsId ${igsId}: "${messageText}"`,
    );

    // Check if there's an active automation waiting for user response
    const activeAutomation = await findRecentInstagramAutomation(igsId, orgId, {
      timeWindow: 4 * 60 * 60 * 1000, // 4 hours
    });

    if (activeAutomation && activeAutomation.status === ("inProgress" as any)) {
      log.info(
        `[Instagram Automation Handler] Found active automation ${activeAutomation.waAutomatedReplyId} for igsId ${igsId}`,
      );

      // Check if this is a button/quick reply response
      const buttonPayload =
        messagingObject?.message?.quick_reply?.payload ||
        messagingObject?.postback?.payload;

      // Handle user response to active automation
      const handled = await handleInstagramUserResponse(
        igsId,
        messageText,
        orgId,
        buttonPayload,
      );

      if (handled) {
        log.info(
          `[Instagram Automation Handler] User response handled for automation ${activeAutomation.waAutomatedReplyId}`,
        );
        return;
      }
    }

    // Match command via the Rule system (RuleMessageBodyLock)
    const matchedAutomation = await findInstagramAutomationByCommand(
      orgId,
      messageText,
    );

    if (matchedAutomation) {
      log.info(
        `[Instagram Automation Handler] Starting automation ${matchedAutomation.id} for igsId ${igsId}`,
      );
      await startInstagramAutomationFlow(
        igsId,
        matchedAutomation as any,
        orgId,
      );
      return;
    }

    log.trace(
      `[Instagram Automation Handler] No matching automation found for message "${messageText}" from igsId ${igsId}`,
    );
  } catch (error) {
    // Catch all errors to prevent Instagram automation from affecting other operations
    log.error(
      `[Instagram Automation Handler] Error handling automation for igsId ${igsId}: %o`,
      error,
    );
    // Error is logged but not thrown - this ensures Instagram errors don't affect WhatsApp
  }
}
