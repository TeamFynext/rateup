/**
 * Instagram Automation Execution Service
 * Handles the execution of Instagram automation flows
 * Completely isolated from WhatsApp to prevent cross-platform interference
 */

import { log } from "../../../utils/logger.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import prisma from "../../../utils/prisma.js";
import {
  createOrUpdateInstagramAutomationMessage,
  logInstagramAutomationAction,
  wasInstagramAutomationSentRecently,
} from "./instagram_automatedReply.service.js";
import { parseToWhatsAppFormat } from "../whatsappSurvey/wasurvey.utils.js";
import {
  sendInstagramGenericTemplate,
  sendInstagramQuickReply,
  sendInstagramTextMessage,
  sendInstagramImage,
  sendInstagramProductTemplate,
  sendInstagramPrivateReply,
} from "../instagram/instagram_messaging.service.js";
import { getFileUrlFromKey } from "../../../utils/upload/s3Upload.js";

// Type definitions for Instagram automation nodes
export type InstagramNodeType =
  | "startNode"
  | "endNode"
  | "textNode"
  | "imageNode"
  | "pauseNode"
  | "textInputNode"
  | "instagramQuickReplyNode"
  | "instagramGenericTemplateNode"
  | "instagramStoryReplyNode"
  | "instagramProductTemplateNode"
  | "instagramIceBreakerNode";

interface InstagramNode {
  id: string;
  type: InstagramNodeType;
  data: any;
}

interface InstagramAutomation {
  id: string;
  orgId: string;
  name: string;
  matchData: {
    json: {
      nodes: InstagramNode[];
      edges: Array<{
        source: string;
        target: string;
        sourceHandle?: string;
      }>;
    };
  };
  sendOnceIn24Hours?: boolean;
  whatsappSettingsPhoneId?: string;
}

/**
 * Start an Instagram automation flow from the beginning
 */
export async function startInstagramAutomationFlow(
  igsId: string,
  automation: InstagramAutomation,
  orgId: string,
  ibaId: string,
  commentId?: string,
): Promise<void> {
  try {
    log.info(`[Instagram Automation] Starting flow ${automation.id} for igsId ${igsId}`);

    // Check if automation should only run once in 24 hours
    if (automation.sendOnceIn24Hours) {
      const wasSentRecently = await wasInstagramAutomationSentRecently(igsId, automation.id, orgId);

      if (wasSentRecently) {
        log.info(
          `[Instagram Automation] Skipping automation ${automation.id} - already sent in last 24 hours`,
        );
        return;
      }
    }

    // Find the start node
    const startNode = automation.matchData?.json?.nodes?.find((node) => node.type === "startNode");

    if (!startNode) {
      log.error(`[Instagram Automation] No start node found in automation ${automation.id}`);
      return;
    }

    // Create automation message tracking
    const automationMessage = await createOrUpdateInstagramAutomationMessage({
      igsId,
      automationId: automation.id,
      orgId,
      currentNode: startNode.id,
      status: "inProgress",
    });

    // Log the action
    await logInstagramAutomationAction({
      igsId,
      nodeId: startNode.id,
      automationId: automation.id,
      orgId,
      response: {
        action: "automation_started",
        startNode: startNode.id,
      },
    });

    // Process the next node after start
    await processNextInstagramNode(
      igsId,
      automation,
      startNode.id,
      orgId,
      automationMessage.id,
      ibaId,
      commentId,
    );
  } catch (error) {
    log.error(`[Instagram Automation] Error starting flow ${automation.id}: %o`, error);
    // Error is logged but not thrown to prevent affecting other operations
  }
}

/**
 * Process the next node in an Instagram automation flow
 */
export async function processNextInstagramNode(
  igsId: string,
  automation: InstagramAutomation,
  nodeId: string,
  orgId: string,
  automationMessageId: string,
  ibaId: string,
  commentId?: string,
): Promise<void> {
  try {
    if (!nodeId || !automation?.matchData?.json?.nodes) {
      log.error("[Instagram Automation] Invalid node ID or automation data");
      return;
    }

    // Find the current node
    const node = automation.matchData.json.nodes.find((n) => n.id === nodeId);

    if (!node) {
      log.error(`[Instagram Automation] Node ${nodeId} not found in automation ${automation.id}`);
      return;
    }

    log.info(`[Instagram Automation] Processing node ${nodeId} (${node.type}) for igsId ${igsId}`);

    // Skip processing for special nodes
    if (["endNode", "startNode"].includes(node.type)) {
      // For start node, just move to the next node
      const nextEdges = automation.matchData.json.edges.filter((edge) => edge.source === nodeId);

      if (nextEdges && nextEdges.length > 0) {
        for (const nextEdge of nextEdges) {
          await prisma.waAutomatedReplyMessage.updateMany({
            where: { phone: igsId, waAutomatedReplyId: automation.id },
            data: { currentNode: nextEdge.target },
          });

          await processNextInstagramNode(
            igsId,
            automation,
            nextEdge.target,
            orgId,
            automationMessageId,
            ibaId,
            commentId,
          );
        }
      } else if (node.type === "endNode") {
        // Mark as completed
        await prisma.waAutomatedReplyMessage.updateMany({
          where: { phone: igsId, waAutomatedReplyId: automation.id },
          data: { status: "completed" },
        });

        log.info(`[Instagram Automation] Completed automation ${automation.id} for igsId ${igsId}`);
      }

      return;
    }

    // Process different Instagram node types
    let messageSent = false;
    // After using commentId for the first message, clear it so subsequent nodes use igsId
    let remainingCommentId = commentId;

    switch (node.type) {
      case "textNode":
        await handleInstagramTextNode(node, igsId, orgId, ibaId, remainingCommentId);
        remainingCommentId = undefined;
        messageSent = true;
        break;

      case "imageNode":
        // Images cannot be sent as private replies; send a text private reply first if commentId present
        if (remainingCommentId) {
          const rawText = node.data?.caption || node.data?.body || node.data?.text || "";
          const fallbackText = parseToWhatsAppFormat(rawText) || "Thanks for your comment!";
          await sendInstagramPrivateReply(remainingCommentId, fallbackText, ibaId);
          remainingCommentId = undefined;
        }
        await handleInstagramImageNode(node, igsId, orgId, ibaId);
        messageSent = true;
        break;

      case "instagramGenericTemplateNode":
        await handleInstagramGenericTemplateNode(node, igsId, orgId, ibaId);
        remainingCommentId = undefined;
        messageSent = true;
        break;

      case "instagramQuickReplyNode":
        await handleInstagramQuickReplyNode(node, igsId, orgId, ibaId);
        remainingCommentId = undefined;
        messageSent = true;
        break;

      case "instagramProductTemplateNode":
        await handleInstagramProductTemplateNode(node, igsId, orgId, ibaId);
        remainingCommentId = undefined;
        messageSent = true;
        break;

      case "instagramStoryReplyNode":
        // Story replies are handled differently - they respond to story mentions
        log.info(`[Instagram Automation] Story reply node ${nodeId} - waiting for story mention`);
        messageSent = false;
        break;

      case "instagramIceBreakerNode":
        // Ice breakers are set at profile level, not sent as messages
        log.info(`[Instagram Automation] Ice breakers node ${nodeId} - configuration node`);
        messageSent = false;
        break;

      case "pauseNode":
        await handleInstagramPauseNode(node, igsId, orgId, automation, automationMessageId, ibaId);
        return; // Pause node returns early

      case "textInputNode":
        // Wait for user input - don't process next node
        log.info(`[Instagram Automation] Waiting for text input at node ${nodeId}`);
        return;

      default:
        log.warn(`[Instagram Automation] Unknown node type: ${node.type} at node ${nodeId}`);
        break;
    }

    // Log the node execution
    await logInstagramAutomationAction({
      igsId,
      nodeId: node.id,
      automationId: automation.id,
      orgId,
      response: {
        action: "node_executed",
        nodeType: node.type,
        messageSent,
      },
    });

    // Determine if we should continue to the next node
    const requiresUserInput = [
      "instagramQuickReplyNode",
      "instagramGenericTemplateNode",
      "textInputNode",
    ].includes(node.type);

    // Find and process next nodes
    const nextEdges = automation.matchData.json.edges.filter((edge) => edge.source === nodeId);

    if (nextEdges && nextEdges.length > 0) {
      for (const nextEdge of nextEdges) {
        await prisma.waAutomatedReplyMessage.updateMany({
          where: { phone: igsId, waAutomatedReplyId: automation.id },
          data: { currentNode: nextEdge.target },
        });

        // Only continue if node doesn't require user input
        if (!requiresUserInput) {
          await processNextInstagramNode(
            igsId,
            automation,
            nextEdge.target,
            orgId,
            automationMessageId,
            ibaId,
            remainingCommentId,
          );
        }
      }
    } else {
      // No next node, mark as completed
      await prisma.waAutomatedReplyMessage.updateMany({
        where: { phone: igsId, waAutomatedReplyId: automation.id },
        data: { status: "completed" },
      });

      log.info(`[Instagram Automation] Completed automation ${automation.id} for igsId ${igsId}`);
    }
  } catch (error) {
    log.error(`[Instagram Automation] Error processing node ${nodeId}: %o`, error);
    // Error is logged but not thrown to prevent affecting other operations
  }
}

/**
 * Handle Instagram text node
 */
async function handleInstagramTextNode(
  node: InstagramNode,
  igsId: string,
  orgId: string,
  ibaId: string,
  commentId?: string,
): Promise<void> {
  try {
    const rawText = node.data?.body || node.data?.text || "Hello!";
    const text = parseToWhatsAppFormat(rawText) || "Hello!";
    if (commentId) {
      await sendInstagramPrivateReply(commentId, text, ibaId);
    } else {
      await sendInstagramTextMessage(igsId, text, orgId, ibaId);
    }
  } catch (error) {
    log.error(`[Instagram Automation] Error handling text node ${node.id}: %o`, error);
  }
}

/**
 * Handle Instagram image node
 */
async function handleInstagramImageNode(
  node: InstagramNode,
  igsId: string,
  orgId: string,
  ibaId: string,
): Promise<void> {
  try {
    const imageUrl = node.data?.link || node.data?.url;
    const caption = parseToWhatsAppFormat(node.data?.caption) || "";

    if (!imageUrl) {
      log.warn(`[Instagram Automation] Image node ${node.id} has no image URL`);
      return;
    }

    await sendInstagramImage(igsId, getFileUrlFromKey(imageUrl), caption, orgId, ibaId);
  } catch (error) {
    log.error(`[Instagram Automation] Error handling image node ${node.id}: %o`, error);
  }
}

/**
 * Handle Instagram generic template node (carousel with buttons)
 */
async function handleInstagramGenericTemplateNode(
  node: InstagramNode,
  igsId: string,
  orgId: string,
  ibaId: string,
): Promise<void> {
  try {
    const elements = (node.data?.elements || []).map((el: any) => ({
      ...el,
      buttons: (el.buttons || []).map((btn: any) => ({
        ...btn,
        // Use the button's id as the payload so it matches the edge sourceHandle
        payload: btn.type === "postback" ? btn.id || btn.payload || btn.title : btn.payload,
      })),
    }));

    if (elements.length === 0) {
      log.warn(`[Instagram Automation] Generic template node ${node.id} has no elements`);
      return;
    }

    await sendInstagramGenericTemplate(igsId, elements, orgId, ibaId);
  } catch (error) {
    log.error(`[Instagram Automation] Error handling generic template node ${node.id}: %o`, error);
  }
}

/**
 * Handle Instagram quick reply node
 */
async function handleInstagramQuickReplyNode(
  node: InstagramNode,
  igsId: string,
  orgId: string,
  ibaId: string,
): Promise<void> {
  try {
    const text = parseToWhatsAppFormat(node.data?.text) || "Choose an option:";
    const quickReplies = (node.data?.quick_replies || node.data?.quickReplies || []).map(
      (qr: any) => ({
        ...qr,
        // Use the reply's id as the payload so it matches the edge sourceHandle
        payload: qr.id || qr.payload || qr.title,
      }),
    );

    if (quickReplies.length === 0) {
      log.warn(`[Instagram Automation] Quick reply node ${node.id} has no quick replies`);
      // Send text only
      await sendInstagramTextMessage(igsId, text, orgId, ibaId);
      return;
    }

    await sendInstagramQuickReply(igsId, text, quickReplies, orgId, ibaId);
  } catch (error) {
    log.error(`[Instagram Automation] Error handling quick reply node ${node.id}: %o`, error);
  }
}

/**
 * Handle Instagram product template node
 */
async function handleInstagramProductTemplateNode(
  node: InstagramNode,
  igsId: string,
  orgId: string,
  ibaId: string,
): Promise<void> {
  try {
    const productIds: string[] =
      node.data?.productIds || (node.data?.product?.id ? [node.data.product.id] : []);

    if (productIds.length === 0) {
      log.warn(`[Instagram Automation] Product template node ${node.id} has no product IDs`);
      return;
    }

    await sendInstagramProductTemplate(igsId, productIds, orgId, ibaId);
  } catch (error) {
    log.error(`[Instagram Automation] Error handling product template node ${node.id}: %o`, error);
  }
}

/**
 * Handle Instagram pause node
 */
async function handleInstagramPauseNode(
  node: InstagramNode,
  igsId: string,
  orgId: string,
  automation: InstagramAutomation,
  automationMessageId: string,
  ibaId: string,
): Promise<void> {
  try {
    const duration = node.data?.duration || 0;
    const unit = node.data?.unit || "seconds";

    let ms = 0;
    if (unit === "seconds") ms = duration * 1000;
    else if (unit === "minutes") ms = duration * 60 * 1000;
    else if (unit === "hours") ms = duration * 60 * 60 * 1000;

    log.info(`[Instagram Automation] Pausing automation ${automation.id} for ${duration} ${unit}`);

    // Update status to paused
    await prisma.waAutomatedReplyMessage.update({
      where: { id: automationMessageId },
      data: { status: "paused" as any },
    });

    // Schedule resumption using setTimeout (for simple implementation)
    // In production, you might want to use a job queue like BullMQ
    setTimeout(async () => {
      try {
        log.info(`[Instagram Automation] Resuming automation ${automation.id} after pause`);

        // Update status back to inProgress
        await prisma.waAutomatedReplyMessage.update({
          where: { id: automationMessageId },
          data: { status: "inProgress" as any },
        });

        // Continue to next node
        const nextEdges = automation.matchData.json.edges.filter((edge) => edge.source === node.id);

        if (nextEdges && nextEdges.length > 0) {
          for (const nextEdge of nextEdges) {
            await processNextInstagramNode(
              igsId,
              automation,
              nextEdge.target,
              orgId,
              automationMessageId,
              ibaId,
            );
          }
        }
      } catch (error) {
        log.error(`[Instagram Automation] Error resuming after pause: %o`, error);
      }
    }, ms);
  } catch (error) {
    log.error(`[Instagram Automation] Error handling pause node ${node.id}: %o`, error);
  }
}

/**
 * Handle user response to Instagram automation
 */
export async function handleInstagramUserResponse(
  igsId: string,
  message: string,
  orgId: string,
  ibaId: string,
  buttonPayload?: string,
): Promise<boolean> {
  try {
    // Find the most recent active automation for this user
    const recentAutomation = await prisma.waAutomatedReplyMessage.findFirst({
      where: {
        phone: igsId,
        orgId,
        status: "inProgress" as any,
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

    if (!recentAutomation || !recentAutomation.waAutomatedReply) {
      return false; // No active automation found
    }

    const automation = recentAutomation.waAutomatedReply as any;
    const currentNodeId = recentAutomation.currentNode;

    // Find the current node
    const currentNode = automation.matchData?.json?.nodes?.find(
      (node: any) => node.id === currentNodeId,
    );

    if (!currentNode) {
      return false;
    }

    // Log the user response
    await logInstagramAutomationAction({
      igsId,
      nodeId: currentNodeId,
      automationId: automation.id,
      orgId,
      response: {
        action: "user_response",
        message,
        buttonPayload,
        nodeType: currentNode.type,
      },
    });

    // Handle different node types that expect user input
    if (currentNode.type === "textInputNode") {
      // Save the user input (you might want to store this in a variable)
      const variableName = currentNode.data?.variableName;

      log.info(
        `[Instagram Automation] Received text input "${message}" for variable "${variableName}"`,
      );

      // Continue to next node
      await processNextInstagramNode(
        igsId,
        automation,
        currentNodeId,
        orgId,
        recentAutomation.id,
        ibaId,
      );

      return true;
    }

    if (
      currentNode.type === "instagramQuickReplyNode" ||
      currentNode.type === "instagramGenericTemplateNode"
    ) {
      // Find the next node based on the button clicked
      const nextEdges = automation.matchData?.json?.edges?.filter(
        (edge: any) =>
          edge.source === currentNodeId &&
          (edge.sourceHandle === buttonPayload || !edge.sourceHandle),
      );

      if (nextEdges && nextEdges.length > 0) {
        for (const nextEdge of nextEdges) {
          await prisma.waAutomatedReplyMessage.updateMany({
            where: { phone: igsId, waAutomatedReplyId: automation.id },
            data: { currentNode: nextEdge.target },
          });

          await processNextInstagramNode(
            igsId,
            automation,
            nextEdge.target,
            orgId,
            recentAutomation.id,
            ibaId,
          );
        }

        return true;
      }
    }

    return false;
  } catch (error) {
    log.error(`[Instagram Automation] Error handling user response: %o`, error);
    return false;
  }
}
