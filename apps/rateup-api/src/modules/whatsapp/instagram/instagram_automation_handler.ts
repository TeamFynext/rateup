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
