/**
 * Instagram Automation Execution Service
 * Handles the execution of Instagram automation flows
 * Completely isolated from WhatsApp to prevent cross-platform interference
 */

import { log } from "../../../utils/logger.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import prisma from "../../../utils/prisma.js";
import type { Prisma } from "../../../../generated/prisma/client.js";
import {
  createOrUpdateInstagramAutomationMessage,
  logInstagramAutomationAction,
} from "./instagram_automatedReply.service.js";
import { parseToWhatsAppFormat } from "../whatsappSurvey/wasurvey.utils.js";
import {
  doesUserFollowInstagramAccount,
  sendInstagramGenericTemplate,
  sendInstagramQuickReply,
  sendInstagramTextMessage,
  sendInstagramImage,
  sendInstagramProductTemplate,
  sendInstagramPrivateReply,
} from "../instagram/instagram_messaging.service.js";
import { getFileUrlFromKey } from "../../../utils/upload/s3Upload.js";
import type {
  AutomationEdge,
  AutomationNode,
  InstagramQuickReplyOption,
  InstagramTemplateButton,
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
  | "instagramIceBreakerNode"
  | "instagramFollowCheckNode";

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

/** Nodes that stop the flow until the user answers; handleInstagramUserResponse resumes it. */
const WAITS_FOR_REPLY = new Set([
  "instagramQuickReplyNode",
  "instagramGenericTemplateNode",
  "textInputNode",
]);

/** Meta lets the business message a user only within 24h of their last message. */
const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Kept in the tracking row's `response` column. */
interface InstagramFlowProgress {
  /** When the flow stopped at `currentNode` to wait; absent when it is not waiting. */
  waitingAt?: string;
  /** textInputNode answers, by the node's variableName. */
  answers?: Record<string, string>;
}

function readProgress(value: unknown): InstagramFlowProgress {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as InstagramFlowProgress)
    : {};
}

// Button ids double as the edge sourceHandle; the fallbacks mirror node.tsx in rateup-ui,
// which names the handle of a choice saved without an id.
function quickReplyHandle(option: InstagramQuickReplyOption, index: number): string {
  return option.id || option.payload || `qr_${index}`;
}
function templateButtonHandle(button: InstagramTemplateButton, card: number, index: number) {
  return button.id || button.payload || `btn_${card}_${index}`;
}

/** The tappable choices of a waiting node, as handle id + the title the user sees. */
function nodeChoices(node: InstagramNode): { handle: string; title: string }[] {
  if (node.type === "instagramQuickReplyNode") {
    const options = nodeArray<InstagramQuickReplyOption>(
      node.data?.quick_replies ?? node.data?.quickReplies,
    );
    return options.map((qr, i) => ({ handle: quickReplyHandle(qr, i), title: qr.title ?? "" }));
  }
  if (node.type === "instagramGenericTemplateNode") {
    return nodeArray<InstagramTemplateElement>(node.data?.elements).flatMap((el, ci) =>
      (el.buttons ?? []).flatMap((btn, bi) =>
        btn.type === "postback"
          ? [{ handle: templateButtonHandle(btn, ci, bi), title: btn.title }]
          : [],
      ),
    );
  }
  return [];
}

/**
 * The branch a reply takes out of a choice node. A tapped button must match its own
 * handle: any other payload (a stale button, the persistent menu) is not an answer here.
 * Typed text counts when it equals a choice's title, else it takes the unlabelled branch.
 */
function pickReplyBranch(
  node: InstagramNode,
  edges: AutomationEdge[],
  message: string,
  buttonPayload?: string,
): AutomationEdge[] {
  if (buttonPayload) return edges.filter((edge) => edge.sourceHandle === buttonPayload);
  const typed = message.trim().toLowerCase();
  const choice = nodeChoices(node).find((c) => c.title.trim().toLowerCase() === typed);
  if (choice) return edges.filter((edge) => edge.sourceHandle === choice.handle);
  return edges.filter((edge) => !edge.sourceHandle);
}

async function waitForInstagramReply(automationMessageId: string, nodeId: string) {
  const row = await prisma.waAutomatedReplyMessage.findUnique({
    where: { id: automationMessageId },
    select: { response: true },
  });
  const progress: InstagramFlowProgress = {
    ...readProgress(row?.response),
    waitingAt: new Date().toISOString(),
  };
  await prisma.waAutomatedReplyMessage.update({
    where: { id: automationMessageId },
    data: {
      currentNode: nodeId,
      status: "inProgress",
      response: progress as Prisma.InputJsonValue,
    },
  });
}

export interface InstagramAutomation {
  id: string;
  orgId: string;
  name: string;
  matchData: WaAutomatedReplyMatchData;
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
    // but the tracking row is marked so a half-run flow is queryable rather than
    // indistinguishable from a completed one.
    await markInstagramAutomationStopped(igsId, automation.id, error);
  }
}

/**
 * Records that a flow stopped part-way. Best-effort: a failure to write the marker must
 * not mask the original error, so it is logged and swallowed. updateMany is used because
 * the tracking row may not exist yet if the flow failed before creating it.
 *
 * `paused` is the marker: WaAutomationProgressStatus has no `failed` value, so a crash
 * shares a status with a deliberate wait for user input. Distinguish the two by the
 * accompanying error log, not by the row alone.
 */
async function markInstagramAutomationStopped(igsId: string, automationId: string, cause: unknown) {
  try {
    await prisma.waAutomatedReplyMessage.updateMany({
      where: { phone: igsId, waAutomatedReplyId: automationId },
      data: { status: "paused" },
    });
  } catch (markError) {
    log.error(
      { err: markError, cause },
      `[Instagram Automation] Could not mark automation ${automationId} stopped`,
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
          await sendInstagramPrivateReply(remainingCommentId, fallbackText, ibaId, orgId, igsId);
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

      case "instagramFollowCheckNode":
        await followInstagramFollowBranch(
          node,
          igsId,
          automation,
          orgId,
          automationMessageId,
          ibaId,
          remainingCommentId,
        );
        return;

      case "pauseNode":
        await handleInstagramPauseNode(node, igsId, orgId, automation, automationMessageId, ibaId);
        return; // Pause node returns early

      case "textInputNode": {
        const question = parseToWhatsAppFormat(nodeString(node.data?.question) ?? "");
        if (question && remainingCommentId) {
          await sendInstagramPrivateReply(remainingCommentId, question, ibaId, orgId, igsId);
        } else if (question) {
          await sendInstagramTextMessage(igsId, question, orgId, ibaId);
        }
        remainingCommentId = undefined;
        messageSent = Boolean(question);
        break;
      }

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

    const nextEdges = automation.matchData.json.edges.filter((edge) => edge.source === nodeId);

    // A choice with nowhere to go has nothing to wait for; a question still records its answer.
    if (WAITS_FOR_REPLY.has(node.type) && (nextEdges.length > 0 || node.type === "textInputNode")) {
      await waitForInstagramReply(automationMessageId, nodeId);
      return;
    }

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
          remainingCommentId,
        );
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
    await markInstagramAutomationStopped(igsId, automation.id, error);
  }
}

/** Branch handles of instagramFollowCheckNode; mirror node.tsx in rateup-ui. */
const FOLLOWING_HANDLE = "following";
const NOT_FOLLOWING_HANDLE = "notFollowing";

async function followInstagramFollowBranch(
  node: InstagramNode,
  igsId: string,
  automation: InstagramAutomation,
  orgId: string,
  automationMessageId: string,
  ibaId: string,
  commentId?: string,
): Promise<void> {
  const follows = await doesUserFollowInstagramAccount(igsId, ibaId);
  const handle = follows ? FOLLOWING_HANDLE : NOT_FOLLOWING_HANDLE;

  await logInstagramAutomationAction({
    igsId,
    nodeId: node.id,
    automationId: automation.id,
    orgId,
    response: { action: "follow_checked", follows },
  });

  const branch = (automation.matchData.json?.edges ?? []).filter(
    (edge) => edge.source === node.id && edge.sourceHandle === handle,
  );
  if (branch.length === 0) {
    await prisma.waAutomatedReplyMessage.updateMany({
      where: { phone: igsId, waAutomatedReplyId: automation.id },
      data: { status: "completed" },
    });
    return;
  }

  for (const edge of branch) {
    await prisma.waAutomatedReplyMessage.updateMany({
      where: { phone: igsId, waAutomatedReplyId: automation.id },
      data: { currentNode: edge.target },
    });
    await processNextInstagramNode(
      igsId,
      automation,
      edge.target,
      orgId,
      automationMessageId,
      ibaId,
      commentId,
    );
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
      await sendInstagramPrivateReply(commentId, text, ibaId, orgId, igsId);
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
    const elements = nodeArray<InstagramTemplateElement>(node.data?.elements).map((el, ci) => ({
      ...el,
      buttons: (el.buttons ?? []).map((btn, bi) => ({
        ...btn,
        payload: btn.type === "postback" ? templateButtonHandle(btn, ci, bi) : btn.payload,
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
    const quickReplies = nodeArray<InstagramQuickReplyOption>(rawQuickReplies).map((qr, i) => ({
      ...qr,
      payload: quickReplyHandle(qr, i),
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
 * Continues the flow a user is waiting in, if their message answers it. Returns true when
 * the message was consumed, so the caller skips the keyword rules for it.
 */
export async function handleInstagramUserResponse(
  igsId: string,
  message: string,
  orgId: string,
  ibaId: string,
  buttonPayload?: string,
): Promise<boolean> {
  try {
    const rows = await prisma.waAutomatedReplyMessage.findMany({
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
    });

    const now = Date.now();
    const waiting = rows
      .map((row) => ({ row, waitingAt: Date.parse(readProgress(row.response).waitingAt ?? "") }))
      .filter(({ waitingAt }) => now - waitingAt < REPLY_WINDOW_MS)
      .sort((a, b) => b.waitingAt - a.waitingAt)[0]?.row;

    if (!waiting?.waAutomatedReply || !waiting.currentNode) {
      return false;
    }

    const automation = waiting.waAutomatedReply as unknown as InstagramAutomation;
    const currentNodeId = waiting.currentNode;
    const currentNode = automation.matchData?.json?.nodes?.find(
      (node) => node.id === currentNodeId,
    );

    if (!currentNode || !WAITS_FOR_REPLY.has(currentNode.type)) {
      return false;
    }

    const edges = (automation.matchData?.json?.edges ?? []).filter(
      (edge) => edge.source === currentNodeId,
    );
    const isQuestion = currentNode.type === "textInputNode";
    const nextEdges = isQuestion
      ? edges
      : pickReplyBranch(currentNode, edges, message, buttonPayload);

    if (!isQuestion && nextEdges.length === 0) {
      return false;
    }

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

    // Dropping waitingAt first means a second message cannot answer the same step twice.
    const { answers } = readProgress(waiting.response);
    const variableName = isQuestion ? nodeString(currentNode.data?.variableName) : undefined;
    const progress: InstagramFlowProgress = {
      answers: variableName ? { ...answers, [variableName]: message } : answers,
    };
    await prisma.waAutomatedReplyMessage.update({
      where: { id: waiting.id },
      data: {
        response: progress as Prisma.InputJsonValue,
        ...(nextEdges.length === 0 && { status: "completed" }),
      },
    });

    for (const nextEdge of nextEdges) {
      await prisma.waAutomatedReplyMessage.update({
        where: { id: waiting.id },
        data: { currentNode: nextEdge.target },
      });

      await processNextInstagramNode(igsId, automation, nextEdge.target, orgId, waiting.id, ibaId);
    }

    return true;
  } catch (error) {
    log.error({ err: error }, `[Instagram Automation] Error handling user response`);
    return false;
  }
}
