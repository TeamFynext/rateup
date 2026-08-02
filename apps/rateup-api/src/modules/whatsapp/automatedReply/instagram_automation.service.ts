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
import type {
  AutomationNode,
  InstagramQuickReplyOption,
  InstagramTemplateElement,
} from "../whatsappSurvey/node-types.js";

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

/** Nodes on an Instagram automation graph are the shared node shape, narrowed by `type`. */
type InstagramNode = AutomationNode;

// A node's `data` is a free-form JSON blob written by the flow builder; these read one
// field out of it without pretending the whole blob has a fixed shape.
function nodeString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
function nodeNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}
function nodeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export interface InstagramAutomation {
  id: string;
  orgId: string;
  name: string;
  matchData: WaAutomatedReplyMatchData;
  sendOnceIn24Hours?: boolean;
  whatsappSettingsPhoneId?: string | null;
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
    log.error({ err: error }, `[Instagram Automation] Error starting flow ${automation.id}`);
    // Still not thrown — a broken flow must not take down the webhook that triggered it —
    // but the tracking row is marked failed so a half-run flow is queryable rather than
    // indistinguishable from a completed one.
    await markInstagramAutomationFailed(igsId, automation.id, error);
  }
}

/**
 * Records that a flow stopped part-way. Best-effort: a failure to write the marker must
 * not mask the original error, so it is logged and swallowed. updateMany is used because
 * the tracking row may not exist yet if the flow failed before creating it.
 */
async function markInstagramAutomationFailed(igsId: string, automationId: string, cause: unknown) {
  try {
    await prisma.waAutomatedReplyMessage.updateMany({
      where: { phone: igsId, waAutomatedReplyId: automationId },
      data: { status: "failed" },
    });
  } catch (markError) {
    log.error(
      { err: markError, cause },
      `[Instagram Automation] Could not mark automation ${automationId} failed`,
    );
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
          const rawText =
            nodeString(node.data?.caption) ??
            nodeString(node.data?.body) ??
            nodeString(node.data?.text) ??
            "";
          const fallbackText = parseToWhatsAppFormat(rawText) || "Thanks for your comment!";
          await sendInstagramPrivateReply(remainingCommentId, fallbackText, ibaId, orgId);
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
    log.error({ err: error }, `[Instagram Automation] Error processing node ${nodeId}`);
    // As in startInstagramAutomationFlow: not thrown, but recorded so the flow that
    // stopped here can be found later.
    await markInstagramAutomationFailed(igsId, automation.id, error);
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
    const rawText = nodeString(node.data?.body) ?? nodeString(node.data?.text) ?? "Hello!";
    const text = parseToWhatsAppFormat(rawText) || "Hello!";
    if (commentId) {
      await sendInstagramPrivateReply(commentId, text, ibaId, orgId);
    } else {
      await sendInstagramTextMessage(igsId, text, orgId, ibaId);
    }
  } catch (error) {
    log.error({ err: error }, `[Instagram Automation] Error handling text node ${node.id}`);
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
    const imageUrl = nodeString(node.data?.link) ?? nodeString(node.data?.url);
    const caption = parseToWhatsAppFormat(nodeString(node.data?.caption) ?? "") || "";

    if (!imageUrl) {
      log.warn(`[Instagram Automation] Image node ${node.id} has no image URL`);
      return;
    }

    await sendInstagramImage(igsId, getFileUrlFromKey(imageUrl), orgId, ibaId, caption);
  } catch (error) {
    log.error({ err: error }, `[Instagram Automation] Error handling image node ${node.id}`);
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
    const elements = nodeArray<InstagramTemplateElement>(node.data?.elements).map((el) => ({
      ...el,
      buttons: (el.buttons ?? []).map((btn) => ({
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
    log.error(
      { err: error },
      `[Instagram Automation] Error handling generic template node ${node.id}`,
    );
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
    const text = parseToWhatsAppFormat(nodeString(node.data?.text) ?? "") || "Choose an option:";
    const rawQuickReplies = node.data?.quick_replies ?? node.data?.quickReplies;
    const quickReplies = nodeArray<InstagramQuickReplyOption>(rawQuickReplies).map((qr) => ({
      ...qr,
      // Use the reply's id as the payload so it matches the edge sourceHandle
      payload: qr.id || qr.payload || qr.title,
    }));

    if (quickReplies.length === 0) {
      log.warn(`[Instagram Automation] Quick reply node ${node.id} has no quick replies`);
      // Send text only
      await sendInstagramTextMessage(igsId, text, orgId, ibaId);
      return;
    }

    await sendInstagramQuickReply(igsId, text, quickReplies, orgId, ibaId);
  } catch (error) {
    log.error({ err: error }, `[Instagram Automation] Error handling quick reply node ${node.id}`);
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
    const productId = nodeString((node.data?.product as { id?: unknown } | undefined)?.id);
    const declaredIds = nodeArray<string>(node.data?.productIds);
    const productIds: string[] = declaredIds.length ? declaredIds : productId ? [productId] : [];

    if (productIds.length === 0) {
      log.warn(`[Instagram Automation] Product template node ${node.id} has no product IDs`);
      return;
    }

    await sendInstagramProductTemplate(igsId, productIds, orgId, ibaId);
  } catch (error) {
    log.error(
      { err: error },
      `[Instagram Automation] Error handling product template node ${node.id}`,
    );
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
    const duration = nodeNumber(node.data?.duration);
    const unit = nodeString(node.data?.unit) ?? "seconds";

    let ms = 0;
    if (unit === "seconds") ms = duration * 1000;
    else if (unit === "minutes") ms = duration * 60 * 1000;
    else if (unit === "hours") ms = duration * 60 * 60 * 1000;

    log.info(`[Instagram Automation] Pausing automation ${automation.id} for ${duration} ${unit}`);

    // Update status to paused
    await prisma.waAutomatedReplyMessage.update({
      where: { id: automationMessageId },
      data: { status: "paused" },
    });

    // Schedule resumption using setTimeout (for simple implementation)
    // In production, you might want to use a job queue like BullMQ
    setTimeout(async () => {
      try {
        log.info(`[Instagram Automation] Resuming automation ${automation.id} after pause`);

        // Update status back to inProgress
        await prisma.waAutomatedReplyMessage.update({
          where: { id: automationMessageId },
          data: { status: "inProgress" },
        });

        // Continue to next node
        const nextEdges = automation.matchData.json?.edges.filter(
          (edge) => edge.source === node.id,
        );

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
        log.error({ err: error }, `[Instagram Automation] Error resuming after pause`);
      }
    }, ms);
  } catch (error) {
    log.error({ err: error }, `[Instagram Automation] Error handling pause node ${node.id}`);
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
        status: "inProgress",
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

    const automation = recentAutomation.waAutomatedReply as InstagramAutomation;
    const currentNodeId = recentAutomation.currentNode;

    if (!currentNodeId) {
      return false; // No current node tracked for this automation
    }

    // Find the current node
    const currentNode = automation.matchData?.json?.nodes?.find(
      (node) => node.id === currentNodeId,
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
        (edge) =>
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
    log.error({ err: error }, `[Instagram Automation] Error handling user response`);
    return false;
  }
}
