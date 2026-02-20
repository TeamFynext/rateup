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
import { validateRuleConditions } from "../automatedReply/wa_automatedReply.utils.js";

/**
 * Find an Instagram automation by matching a message against active rules.
 * Evaluates all rule conditions properly (CONTAINS, EQUALS, etc.) rather than just exact matching.
 */
async function findInstagramAutomationByCommand(
  orgId: string,
  messageBody: string,
  ibaId: string,
  igsId: string,
) {
  try {
    // Find all active rules for this organization with TRIGGER_CHATBOT action
    const rules = await prisma.rule.findMany({
      where: {
        orgId,
        isActive: true,
        actions: {
          some: {
            type: "TRIGGER_CHATBOT",
          },
        },
      },
      include: {
        groups: {
          include: {
            conditions: {
              include: {
                messageBodyLock: {
                  include: {
                    businessHour: true,
                  },
                },
              },
            },
          },
        },
        actions: true,
      },
    });

    if (!rules || rules.length === 0) return null;

    // Check each rule to see if it matches
    for (const rule of rules) {
      // Verify this rule applies to this Instagram account
      if (
        !rule.whatsappSettingsPhoneIds ||
        rule.whatsappSettingsPhoneIds.length === 0 ||
        !rule.whatsappSettingsPhoneIds.includes(ibaId)
      ) {
        log.trace(
          `[Instagram Automation Handler] Rule ${rule.id} doesn't apply to ibaId ${ibaId}`,
        );
        continue;
      }

      // Validate all conditions using the proper validation function
      const isMatch = await validateRuleConditions(
        rule as any,
        messageBody,
        orgId,
        igsId, // Use igsId as the "phone" parameter for contact lookups
      );

      if (!isMatch) continue;

      // Find the TRIGGER_CHATBOT action
      const triggerAction = rule.actions?.find(
        (action) => action.type === "TRIGGER_CHATBOT",
      );

      if (!triggerAction?.value) continue;

      const automationId = triggerAction.value as string;

      // Fetch the Instagram automation
      const automation = await getInstagramAutomatedReplyById(automationId);
      if (automation && automation.isEnabled) {
        log.info(
          `[Instagram Automation Handler] Rule ${rule.id} matched for message "${messageBody}" - triggering automation ${automationId}`,
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
  ibaId: string,
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
        ibaId,
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
      ibaId,
      igsId,
    );

    if (matchedAutomation) {
      log.info(
        `[Instagram Automation Handler] Starting automation ${matchedAutomation.id} for igsId ${igsId}`,
      );
      await startInstagramAutomationFlow(
        igsId,
        matchedAutomation as any,
        orgId,
        ibaId,
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
