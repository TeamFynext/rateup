/**
 * Runs chatbot flows over Meta's Send API: Instagram DMs and Facebook Messenger.
 *
 * Both surfaces take the same message payloads, so one engine serves them; the channel a
 * run goes out on is passed in as a `MetaFlowChannel`. Nodes that only exist on Instagram
 * (product template, follow check, comment private replies) are skipped on Messenger.
 * WhatsApp flows have their own engine in whatsappSurvey/wasurvey.controller.ts.
 */

import { log } from "../../../utils/logger.js";
import { PlatformType } from "../../../generated/prisma/enums.js";
import prisma from "../../../utils/prisma.js";
import type { Prisma } from "../../../generated/prisma/client.js";
import { createOrUpdateMetaFlowRun, logMetaFlowAction } from "./instagramRules.service.js";
import { parseToWhatsAppFormat } from "../../meta/whatsapp/webhook/whatsapp.utils.js";
import {
  doesUserFollowInstagramAccount,
  sendInstagramPrivateReply,
  sendInstagramProductTemplate,
} from "../../meta/instagram/instagram_messaging.service.js";
import {
  sendSendApiAudio,
  sendSendApiFile,
  sendSendApiGenericTemplate,
  sendSendApiImage,
  sendSendApiQuickReply,
  sendSendApiText,
  sendSendApiVideo,
  type MetaFlowChannel,
} from "../../meta/shared/sendApiMessages.js";
import { getFileUrlFromKey } from "../../../utils/upload/s3Upload.js";
import {
  getOrCreateContactByIgsId,
  getOrCreateContactByPsid,
} from "../../contacts/contact.service.js";
import { runAssignNode } from "./assignNode.service.js";
import {
  runContinueOnWhatsappStep,
  type ContinueOnWhatsappData,
} from "../../contacts/handoff/handoff.journey.js";
import type {
  AssignNodeData,
  AutomationEdge,
  AutomationNode,
  InstagramQuickReplyOption,
  InstagramTemplateButton,
  InstagramTemplateElement,
} from "../../meta/whatsapp/webhook/node-types.js";

export type { MetaFlowChannel } from "../../meta/shared/sendApiMessages.js";

/** Nodes on a Meta flow graph are the shared node shape, narrowed by `type`. */
type MetaFlowNode = AutomationNode;

// A node's `data` is a free-form JSON blob written by the flow builder; these read one
// field out of it without pretending the whole blob has a fixed shape.
function nodeString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
/**
 * A message field as the text that goes out. The flow builder saves bodies, questions and
 * captions as rich-text documents and quick-reply text as a plain string; both come out
 * here as a string, empty when the field is missing.
 */
function nodeText(value: unknown): string {
  if (typeof value === "string") return parseToWhatsAppFormat(value);
  if (value && typeof value === "object") {
    return parseToWhatsAppFormat(value as Parameters<typeof parseToWhatsAppFormat>[0]);
  }
  return "";
}
function nodeNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}
function nodeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Nodes that stop the flow until the user answers; handleMetaFlowUserResponse resumes it. */
const WAITS_FOR_REPLY = new Set([
  "instagramQuickReplyNode",
  "instagramGenericTemplateNode",
  "textInputNode",
]);

/** Meta lets the business message a user only within 24h of their last message. */
const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

function logPrefix(channel: MetaFlowChannel) {
  return channel.platform === PlatformType.FACEBOOK
    ? "[Messenger Automation]"
    : "[Instagram Automation]";
}

function isInstagram(channel: MetaFlowChannel) {
  return channel.platform === PlatformType.INSTAGRAM;
}

/** Kept in the tracking row's `response` column. */
interface MetaFlowProgress {
  /** When the flow stopped at `currentNode` to wait; absent when it is not waiting. */
  waitingAt?: string;
  /** textInputNode answers, by the node's variableName. */
  answers?: Record<string, string>;
}

function readProgress(value: unknown): MetaFlowProgress {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as MetaFlowProgress)
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
function nodeChoices(node: MetaFlowNode): { handle: string; title: string }[] {
  if (node.type === "instagramQuickReplyNode") {
    const options = nodeArray<InstagramQuickReplyOption>(
      node.data?.quick_replies ?? node.data?.quickReplies,
    );
    return options.map((qr, i) => ({
      handle: quickReplyHandle(qr, i),
      title: qr.title ?? "",
    }));
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
  node: MetaFlowNode,
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

async function waitForReply(automationMessageId: string, nodeId: string) {
  const row = await prisma.waAutomatedReplyMessage.findUnique({
    where: { id: automationMessageId },
    select: { response: true },
  });
  const progress: MetaFlowProgress = {
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

export interface MetaFlowAutomation {
  id: string;
  orgId: string;
  name: string;
  matchData: WaAutomatedReplyMatchData;
  whatsappSettingsPhoneId?: string | null;
}

/**
 * Start a flow from the beginning. `recipientId` is the igsId on Instagram and the psid
 * on Messenger; `commentId` (Instagram only) makes the first message a private reply.
 */
export async function startMetaFlow(
  recipientId: string,
  automation: MetaFlowAutomation,
  orgId: string,
  channel: MetaFlowChannel,
  commentId?: string,
): Promise<void> {
  const prefix = logPrefix(channel);
  try {
    log.info(`${prefix} Starting flow ${automation.id} for ${recipientId}`);

    // Find the start node
    const startNode = automation.matchData?.json?.nodes?.find((node) => node.type === "startNode");

    if (!startNode) {
      log.error(`${prefix} No start node found in automation ${automation.id}`);
      return;
    }

    // Create automation message tracking
    const automationMessage = await createOrUpdateMetaFlowRun({
      recipientId,
      automationId: automation.id,
      orgId,
      currentNode: startNode.id,
      status: "inProgress",
    });

    // Log the action
    await logMetaFlowAction({
      recipientId,
      nodeId: startNode.id,
      automationId: automation.id,
      orgId,
      response: {
        action: "automation_started",
        startNode: startNode.id,
      },
    });

    // Process the next node after start
    await processNextMetaFlowNode(
      recipientId,
      automation,
      startNode.id,
      orgId,
      automationMessage.id,
      channel,
      commentId,
    );

    await adoptCommentRecipientRun(
      automationMessage.id,
      recipientId,
      automation.id,
      orgId,
      channel,
    );
  } catch (error) {
    log.error({ err: error }, `${prefix} Error starting flow ${automation.id}`);
    // Still not thrown — a broken flow must not take down the webhook that triggered it —
    // but the tracking row is marked so a half-run flow is queryable rather than
    // indistinguishable from a completed one.
    await markMetaFlowStopped(recipientId, automation.id, error);
  }
}

/**
 * A flow started from a Facebook comment runs under a stand-in id until its first message,
 * the private reply, names the person. The run is then filed under their Messenger id, so
 * their reply finds it. Their earlier run of the same chatbot, if any, gives way.
 */
async function adoptCommentRecipientRun(
  runId: string,
  standIn: string,
  automationId: string,
  orgId: string,
  channel: MetaFlowChannel,
): Promise<void> {
  const reached = channel.pendingComment?.recipientId;
  if (!reached || reached === standIn) return;
  await prisma.$transaction([
    prisma.waAutomatedReplyMessage.deleteMany({
      where: {
        phone: reached,
        waAutomatedReplyId: automationId,
        orgId,
        NOT: { id: runId },
      },
    }),
    prisma.waAutomatedReplyMessage.update({
      where: { id: runId },
      data: { phone: reached },
    }),
  ]);
  log.info(`${logPrefix(channel)} Run ${runId} now follows ${reached} after the comment reply`);
}

/**
 * Records that a flow stopped part-way. Best-effort: a failure to write the marker must
 * not mask the original error, so it is logged and swallowed. updateMany is used because
 * the tracking row may not exist yet if the flow failed before creating it.
 *
 * `paused` is the marker: WaAutomationProgressStatus has no `failed` value, so a crash —
 * or a message Meta refused, such as one outside the 24-hour window — shares a status
 * with a deliberate pause. Distinguish the two by the accompanying error log.
 */
async function markMetaFlowStopped(recipientId: string, automationId: string, cause: unknown) {
  try {
    await prisma.waAutomatedReplyMessage.updateMany({
      where: { phone: recipientId, waAutomatedReplyId: automationId },
      data: { status: "paused" },
    });
  } catch (markError) {
    log.error(
      { err: markError, cause },
      `[Meta Automation] Could not mark automation ${automationId} stopped`,
    );
  }
}

/**
 * Process the next node in a flow
 */
export async function processNextMetaFlowNode(
  recipientId: string,
  automation: MetaFlowAutomation,
  nodeId: string,
  orgId: string,
  automationMessageId: string,
  channel: MetaFlowChannel,
  commentId?: string,
): Promise<void> {
  const prefix = logPrefix(channel);
  try {
    if (!nodeId || !automation?.matchData?.json?.nodes) {
      log.error(`${prefix} Invalid node ID or automation data`);
      return;
    }

    // Find the current node
    const node = automation.matchData.json.nodes.find((n) => n.id === nodeId);

    if (!node) {
      log.error(`${prefix} Node ${nodeId} not found in automation ${automation.id}`);
      return;
    }

    log.info(`${prefix} Processing node ${nodeId} (${node.type}) for ${recipientId}`);

    // Skip processing for special nodes
    if (["endNode", "startNode"].includes(node.type)) {
      // For start node, just move to the next node
      const nextEdges = automation.matchData.json.edges.filter((edge) => edge.source === nodeId);

      if (nextEdges && nextEdges.length > 0) {
        for (const nextEdge of nextEdges) {
          await prisma.waAutomatedReplyMessage.updateMany({
            where: { phone: recipientId, waAutomatedReplyId: automation.id },
            data: { currentNode: nextEdge.target },
          });

          await processNextMetaFlowNode(
            recipientId,
            automation,
            nextEdge.target,
            orgId,
            automationMessageId,
            channel,
            commentId,
          );
        }
      } else if (node.type === "endNode") {
        // Mark as completed
        await prisma.waAutomatedReplyMessage.updateMany({
          where: { phone: recipientId, waAutomatedReplyId: automation.id },
          data: { status: "completed" },
        });

        log.info(`${prefix} Completed automation ${automation.id} for ${recipientId}`);
      }

      return;
    }

    // Only Instagram can answer a comment privately; Messenger flows never carry one.
    let remainingCommentId = isInstagram(channel) ? commentId : undefined;
    let messageSent = false;

    switch (node.type) {
      case "textNode":
        await handleTextNode(node, recipientId, orgId, channel, remainingCommentId);
        remainingCommentId = undefined;
        messageSent = true;
        break;

      case "imageNode":
      case "videoNode":
      case "audioNode":
      case "documentNode": {
        // Media cannot be sent as a private reply; send a text private reply first.
        const facebookCommentPending = Boolean(
          channel.pendingComment && !channel.pendingComment.recipientId,
        );
        if (remainingCommentId || facebookCommentPending) {
          const fallbackText =
            nodeText(node.data?.caption) ||
            nodeText(node.data?.body) ||
            nodeText(node.data?.text) ||
            "Thanks for your comment!";
          if (remainingCommentId) {
            await sendInstagramPrivateReply(
              remainingCommentId,
              fallbackText,
              channel.accountId,
              orgId,
              recipientId,
            );
          } else {
            // The channel's pending comment makes this send the private reply.
            await sendSendApiText(channel, recipientId, orgId, fallbackText);
          }
          remainingCommentId = undefined;
        }
        messageSent = await handleMediaNode(node, recipientId, orgId, channel);
        break;
      }

      case "instagramGenericTemplateNode":
        await handleGenericTemplateNode(node, recipientId, orgId, channel);
        remainingCommentId = undefined;
        messageSent = true;
        break;

      case "instagramQuickReplyNode":
        await handleQuickReplyNode(node, recipientId, orgId, channel);
        remainingCommentId = undefined;
        messageSent = true;
        break;

      case "instagramProductTemplateNode":
        if (!isInstagram(channel)) {
          log.warn(`${prefix} Skipping Instagram-only product template node ${nodeId}`);
          break;
        }
        await handleProductTemplateNode(node, recipientId, orgId, channel);
        remainingCommentId = undefined;
        messageSent = true;
        break;

      case "instagramStoryReplyNode":
        // Story replies are handled differently - they respond to story mentions
        log.info(`${prefix} Story reply node ${nodeId} - waiting for story mention`);
        messageSent = false;
        break;

      case "instagramIceBreakerNode":
        // Ice breakers are set at profile level, not sent as messages
        log.info(`${prefix} Ice breakers node ${nodeId} - configuration node`);
        messageSent = false;
        break;

      case "instagramFollowCheckNode":
        if (!isInstagram(channel)) {
          log.warn(`${prefix} Skipping Instagram-only follow check node ${nodeId}`);
          break;
        }
        await followInstagramFollowBranch(
          node,
          recipientId,
          automation,
          orgId,
          automationMessageId,
          channel,
          remainingCommentId,
        );
        return;

      // Sends a wa.me button carrying a handoff code; see contact/handoff/handoff.journey.ts.
      case "continueOnWhatsappNode":
        messageSent = await runContinueOnWhatsappStep({
          data: node.data as ContinueOnWhatsappData | undefined,
          recipientId,
          orgId,
          channel,
          commentId: remainingCommentId,
        });
        if (messageSent) remainingCommentId = undefined;
        break;

      case "assignNode":
        await handleAssignNode(node, recipientId, orgId, channel, automation.id);
        break;

      case "pauseNode":
        await handlePauseNode(node, recipientId, orgId, automation, automationMessageId, channel);
        return; // Pause node returns early

      case "textInputNode": {
        const question = nodeText(node.data?.question);
        if (question && remainingCommentId) {
          await sendInstagramPrivateReply(
            remainingCommentId,
            question,
            channel.accountId,
            orgId,
            recipientId,
          );
        } else if (question) {
          await sendSendApiText(channel, recipientId, orgId, question);
        }
        remainingCommentId = undefined;
        messageSent = Boolean(question);
        break;
      }

      default:
        log.warn(`${prefix} Unknown node type: ${node.type} at node ${nodeId}`);
        break;
    }

    // Log the node execution
    await logMetaFlowAction({
      recipientId,
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
      await waitForReply(automationMessageId, nodeId);
      return;
    }

    if (nextEdges && nextEdges.length > 0) {
      for (const nextEdge of nextEdges) {
        await prisma.waAutomatedReplyMessage.updateMany({
          where: { phone: recipientId, waAutomatedReplyId: automation.id },
          data: { currentNode: nextEdge.target },
        });

        await processNextMetaFlowNode(
          recipientId,
          automation,
          nextEdge.target,
          orgId,
          automationMessageId,
          channel,
          remainingCommentId,
        );
      }
    } else {
      // No next node, mark as completed
      await prisma.waAutomatedReplyMessage.updateMany({
        where: { phone: recipientId, waAutomatedReplyId: automation.id },
        data: { status: "completed" },
      });

      log.info(`${prefix} Completed automation ${automation.id} for ${recipientId}`);
    }
  } catch (error) {
    // A send Meta refused lands here too, so the flow stops at the step that failed
    // instead of walking on with nothing delivered. Not thrown, but recorded so the
    // flow that stopped here can be found later.
    log.error({ err: error }, `${prefix} Error processing node ${nodeId}`);
    await markMetaFlowStopped(recipientId, automation.id, error);
  }
}

/** Branch handles of instagramFollowCheckNode; mirror node.tsx in rateup-ui. */
const FOLLOWING_HANDLE = "following";
const NOT_FOLLOWING_HANDLE = "notFollowing";

async function followInstagramFollowBranch(
  node: MetaFlowNode,
  recipientId: string,
  automation: MetaFlowAutomation,
  orgId: string,
  automationMessageId: string,
  channel: MetaFlowChannel,
  commentId?: string,
): Promise<void> {
  const follows = await doesUserFollowInstagramAccount(recipientId, channel.accountId);
  const handle = follows ? FOLLOWING_HANDLE : NOT_FOLLOWING_HANDLE;

  await logMetaFlowAction({
    recipientId,
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
      where: { phone: recipientId, waAutomatedReplyId: automation.id },
      data: { status: "completed" },
    });
    return;
  }

  for (const edge of branch) {
    await prisma.waAutomatedReplyMessage.updateMany({
      where: { phone: recipientId, waAutomatedReplyId: automation.id },
      data: { currentNode: edge.target },
    });
    await processNextMetaFlowNode(
      recipientId,
      automation,
      edge.target,
      orgId,
      automationMessageId,
      channel,
      commentId,
    );
  }
}

// The node handlers below let a failed send throw: processNextMetaFlowNode's catch stops
// the flow there. A node with nothing to send is skipped with a warning instead.

async function handleTextNode(
  node: MetaFlowNode,
  recipientId: string,
  orgId: string,
  channel: MetaFlowChannel,
  commentId?: string,
): Promise<void> {
  const text = nodeText(node.data?.body) || nodeText(node.data?.text) || "Hello!";
  if (commentId) {
    await sendInstagramPrivateReply(commentId, text, channel.accountId, orgId, recipientId);
  } else {
    await sendSendApiText(channel, recipientId, orgId, text);
  }
}

/** imageNode, videoNode, audioNode or documentNode (a PDF on Instagram). Returns whether anything was sent. */
async function handleMediaNode(
  node: MetaFlowNode,
  recipientId: string,
  orgId: string,
  channel: MetaFlowChannel,
): Promise<boolean> {
  const mediaKey = nodeString(node.data?.link) ?? nodeString(node.data?.url);
  const caption = nodeText(node.data?.caption);

  if (!mediaKey) {
    log.warn(`${logPrefix(channel)} ${node.type} ${node.id} has no media URL`);
    return false;
  }

  const url = getFileUrlFromKey(mediaKey);
  if (node.type === "audioNode") {
    await sendSendApiAudio(channel, recipientId, orgId, url);
  } else if (node.type === "documentNode") {
    await sendSendApiFile(channel, recipientId, orgId, url);
    // Send API file attachments take no caption, so it follows as its own message.
    if (caption) await sendSendApiText(channel, recipientId, orgId, caption);
  } else if (node.type === "videoNode") {
    await sendSendApiVideo(channel, recipientId, orgId, url, caption);
  } else {
    await sendSendApiImage(channel, recipientId, orgId, url, caption);
  }
  return true;
}

async function handleGenericTemplateNode(
  node: MetaFlowNode,
  recipientId: string,
  orgId: string,
  channel: MetaFlowChannel,
): Promise<void> {
  const elements = nodeArray<InstagramTemplateElement>(node.data?.elements).map((el, ci) => ({
    ...el,
    buttons: (el.buttons ?? []).map((btn, bi) => ({
      ...btn,
      payload: btn.type === "postback" ? templateButtonHandle(btn, ci, bi) : btn.payload,
    })),
  }));

  if (elements.length === 0) {
    log.warn(`${logPrefix(channel)} Generic template node ${node.id} has no elements`);
    return;
  }

  await sendSendApiGenericTemplate(channel, recipientId, orgId, elements);
}

async function handleQuickReplyNode(
  node: MetaFlowNode,
  recipientId: string,
  orgId: string,
  channel: MetaFlowChannel,
): Promise<void> {
  const text = nodeText(node.data?.text) || "Choose an option:";
  const rawQuickReplies = node.data?.quick_replies ?? node.data?.quickReplies;
  const quickReplies = nodeArray<InstagramQuickReplyOption>(rawQuickReplies).map((qr, i) => ({
    ...qr,
    payload: quickReplyHandle(qr, i),
  }));

  if (quickReplies.length === 0) {
    log.warn(`${logPrefix(channel)} Quick reply node ${node.id} has no quick replies`);
    // Send text only
    await sendSendApiText(channel, recipientId, orgId, text);
    return;
  }

  await sendSendApiQuickReply(channel, recipientId, orgId, text, quickReplies);
}

async function handleProductTemplateNode(
  node: MetaFlowNode,
  recipientId: string,
  orgId: string,
  channel: MetaFlowChannel,
): Promise<void> {
  const productId = nodeString((node.data?.product as { id?: unknown } | undefined)?.id);
  const declaredIds = nodeArray<string>(node.data?.productIds);
  const productIds: string[] = declaredIds.length ? declaredIds : productId ? [productId] : [];

  if (productIds.length === 0) {
    log.warn(`${logPrefix(channel)} Product template node ${node.id} has no product IDs`);
    return;
  }

  await sendInstagramProductTemplate(recipientId, productIds, orgId, channel.accountId);
}

/** Assigns the conversation, finding the contact by the id this channel knows them by. */
async function handleAssignNode(
  node: MetaFlowNode,
  recipientId: string,
  orgId: string,
  channel: MetaFlowChannel,
  automationId: string,
): Promise<void> {
  const contactResult = isInstagram(channel)
    ? await getOrCreateContactByIgsId(recipientId, orgId, undefined, true)
    : await getOrCreateContactByPsid(recipientId, orgId, undefined, true);
  if (!contactResult?.contact) {
    log.error(`${logPrefix(channel)} No contact for ${recipientId} at assign node ${node.id}`);
    return;
  }
  await runAssignNode(
    node.data as unknown as AssignNodeData | undefined,
    contactResult.contact.id,
    orgId,
    automationId,
  );
}

async function handlePauseNode(
  node: MetaFlowNode,
  recipientId: string,
  orgId: string,
  automation: MetaFlowAutomation,
  automationMessageId: string,
  channel: MetaFlowChannel,
): Promise<void> {
  const prefix = logPrefix(channel);
  try {
    const duration = nodeNumber(node.data?.duration);
    const unit = nodeString(node.data?.unit) ?? "seconds";

    let ms = 0;
    if (unit === "seconds") ms = duration * 1000;
    else if (unit === "minutes") ms = duration * 60 * 1000;
    else if (unit === "hours") ms = duration * 60 * 60 * 1000;

    log.info(`${prefix} Pausing automation ${automation.id} for ${duration} ${unit}`);

    // Update status to paused
    await prisma.waAutomatedReplyMessage.update({
      where: { id: automationMessageId },
      data: { status: "paused" },
    });

    // Schedule resumption using setTimeout (for simple implementation)
    // In production, you might want to use a job queue like BullMQ
    setTimeout(async () => {
      try {
        log.info(`${prefix} Resuming automation ${automation.id} after pause`);

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
            await processNextMetaFlowNode(
              recipientId,
              automation,
              nextEdge.target,
              orgId,
              automationMessageId,
              channel,
            );
          }
        }
      } catch (error) {
        log.error({ err: error }, `${prefix} Error resuming after pause`);
      }
    }, ms);
  } catch (error) {
    log.error({ err: error }, `${prefix} Error handling pause node ${node.id}`);
  }
}

/**
 * Continues the flow a user is waiting in, if their message answers it. Returns true when
 * the message was consumed, so the caller skips the keyword rules for it.
 */
export async function handleMetaFlowUserResponse(
  recipientId: string,
  message: string,
  orgId: string,
  channel: MetaFlowChannel,
  buttonPayload?: string,
): Promise<boolean> {
  try {
    const rows = await prisma.waAutomatedReplyMessage.findMany({
      where: {
        phone: recipientId,
        orgId,
        status: "inProgress",
        waAutomatedReply: {
          platform: channel.platform,
        },
      },
      include: {
        waAutomatedReply: true,
      },
    });

    const now = Date.now();
    const waiting = rows
      .map((row) => ({
        row,
        waitingAt: Date.parse(readProgress(row.response).waitingAt ?? ""),
      }))
      .filter(({ waitingAt }) => now - waitingAt < REPLY_WINDOW_MS)
      .sort((a, b) => b.waitingAt - a.waitingAt)[0]?.row;

    if (!waiting?.waAutomatedReply || !waiting.currentNode) {
      return false;
    }

    const automation = waiting.waAutomatedReply as unknown as MetaFlowAutomation;
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

    await logMetaFlowAction({
      recipientId,
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
    const progress: MetaFlowProgress = {
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

      await processNextMetaFlowNode(
        recipientId,
        automation,
        nextEdge.target,
        orgId,
        waiting.id,
        channel,
      );
    }

    return true;
  } catch (error) {
    log.error({ err: error }, `${logPrefix(channel)} Error handling user response`);
    return false;
  }
}
