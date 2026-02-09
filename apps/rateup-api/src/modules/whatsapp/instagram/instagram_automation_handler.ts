/**
 * Instagram Automation Handler
 * Handles automation triggers from Instagram messages
 * Completely isolated from WhatsApp to prevent cross-platform interference
 */

import { log } from "../../../utils/logger.js";
import {
  getInstagramCommandByOrgIdAndCommand,
  findRecentInstagramAutomation,
} from "../automatedReply/instagram_automatedReply.service.js";
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

    // Check if message matches any automation command
    const messageLowerCase = messageText?.trim()?.toLowerCase() || "";

    if (!messageLowerCase) {
      log.trace(
        `[Instagram Automation Handler] Empty message, skipping automation check`,
      );
      return;
    }

    const automationCommand = await getInstagramCommandByOrgIdAndCommand(
      orgId,
      messageLowerCase,
    );

    if (automationCommand?.waAutomatedReply) {
      log.info(
        `[Instagram Automation Handler] Command "${messageLowerCase}" matched automation ${automationCommand.waAutomatedReply.id}`,
      );

      // Check if automation is active
      if (!automationCommand.waAutomatedReply.isEnabled) {
        log.warn(
          `[Instagram Automation Handler] Automation ${automationCommand.waAutomatedReply.id} is not active`,
        );
        return;
      }

      // Start the automation flow
      await startInstagramAutomationFlow(
        igsId,
        automationCommand.waAutomatedReply as any,
        orgId,
      );

      log.info(
        `[Instagram Automation Handler] Started automation ${automationCommand.waAutomatedReply.id} for igsId ${igsId}`,
      );
      return;
    }

    // Check for wildcard automation (command: "*")
    const wildcardCommand = await getInstagramCommandByOrgIdAndCommand(
      orgId,
      "*",
    );

    if (wildcardCommand?.waAutomatedReply) {
      log.info(
        `[Instagram Automation Handler] Wildcard automation ${wildcardCommand.waAutomatedReply.id} matched for igsId ${igsId}`,
      );

      // Check if automation is active
      if (!wildcardCommand.waAutomatedReply.isEnabled) {
        log.warn(
          `[Instagram Automation Handler] Wildcard automation ${wildcardCommand.waAutomatedReply.id} is not active`,
        );
        return;
      }

      // Start the automation flow
      await startInstagramAutomationFlow(
        igsId,
        wildcardCommand.waAutomatedReply as any,
        orgId,
      );

      log.info(
        `[Instagram Automation Handler] Started wildcard automation ${wildcardCommand.waAutomatedReply.id} for igsId ${igsId}`,
      );
      return;
    }

    log.trace(
      `[Instagram Automation Handler] No automation matched for message "${messageLowerCase}"`,
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

    // Check for story reply automation (command: "story_mention")
    const storyAutomation = await getInstagramCommandByOrgIdAndCommand(
      orgId,
      "story_mention",
    );

    if (storyAutomation?.waAutomatedReply) {
      log.info(
        `[Instagram Automation Handler] Story mention automation ${storyAutomation.waAutomatedReply.id} matched`,
      );

      if (!storyAutomation.waAutomatedReply.isEnabled) {
        log.warn(
          `[Instagram Automation Handler] Story mention automation ${storyAutomation.waAutomatedReply.id} is not active`,
        );
        return;
      }

      await startInstagramAutomationFlow(
        igsId,
        storyAutomation.waAutomatedReply as any,
        orgId,
      );

      log.info(
        `[Instagram Automation Handler] Started story mention automation ${storyAutomation.waAutomatedReply.id}`,
      );
    }
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

    // Check for comment automation (command: "post_comment")
    const commentAutomation = await getInstagramCommandByOrgIdAndCommand(
      orgId,
      "post_comment",
    );

    if (commentAutomation?.waAutomatedReply) {
      log.info(
        `[Instagram Automation Handler] Comment automation ${commentAutomation.waAutomatedReply.id} matched`,
      );

      if (!commentAutomation.waAutomatedReply.isEnabled) {
        log.warn(
          `[Instagram Automation Handler] Comment automation ${commentAutomation.waAutomatedReply.id} is not active`,
        );
        return;
      }

      await startInstagramAutomationFlow(
        igsId,
        commentAutomation.waAutomatedReply as any,
        orgId,
      );

      log.info(
        `[Instagram Automation Handler] Started comment automation ${commentAutomation.waAutomatedReply.id}`,
      );
    }
  } catch (error) {
    log.error(
      `[Instagram Automation Handler] Error handling comment automation: %o`,
      error,
    );
  }
}
