/**
 * Instagram Automation Handler
 * Handles automation triggers from Instagram messages
 * Completely isolated from WhatsApp to prevent cross-platform interference
 */

import { log } from "../../../utils/logger.js";
import { findRecentInstagramAutomation } from "../automatedReply/instagram_automatedReply.service.js";
import {
  startInstagramAutomationFlow,
  handleInstagramUserResponse,
} from "../automatedReply/instagram_automation.service.js";

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

    // Command matching is now handled by the Rule system (RuleMessageBodyLock)
    // The Rule system will trigger automations based on message body conditions
    log.trace(
      `[Instagram Automation Handler] No active automation found for message "${messageText}" from igsId ${igsId}. Command matching is handled by the Rule system.`,
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

/**
 * Handle Instagram story mention automation trigger
 */
export async function handleInstagramStoryMentionAutomation(
  igsId: string,
  storyId: string,
  orgId: string,
): Promise<void> {
  try {
    log.info(
      `[Instagram Automation Handler] Story mention received from igsId ${igsId} for story ${storyId}`,
    );

    // Story mention automation triggering is now handled by the Rule system
    log.trace(
      `[Instagram Automation Handler] Story mention command matching is handled by the Rule system.`,
    );
  } catch (error) {
    log.error(
      `[Instagram Automation Handler] Error handling story mention automation: %o`,
      error,
    );
  }
}

/**
 * Handle Instagram comment automation trigger
 */
export async function handleInstagramCommentAutomation(
  igsId: string,
  commentText: string,
  orgId: string,
): Promise<void> {
  try {
    log.info(
      `[Instagram Automation Handler] Comment received from igsId ${igsId}: "${commentText}"`,
    );

    // Comment automation triggering is now handled by the Rule system
    log.trace(
      `[Instagram Automation Handler] Comment command matching is handled by the Rule system.`,
    );
  } catch (error) {
    log.error(
      `[Instagram Automation Handler] Error handling comment automation: %o`,
      error,
    );
  }
}
