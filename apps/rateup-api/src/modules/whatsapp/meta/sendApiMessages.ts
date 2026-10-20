/**
 * Senders for Meta's Send API (`/me/messages`), shared by Instagram and Messenger.
 *
 * The two surfaces take the same payloads; they differ only in which settings row
 * holds the token, which `sendMetaMessage` resolves from the platform. So every
 * sender here takes the channel it goes out on, and anything genuinely
 * Instagram-only (private replies, product templates, story replies) stays in
 * `instagram/instagram_messaging.service.ts`.
 *
 * Each sender throws when Meta refuses the message or the channel is not
 * connected, so a flow can stop at the step that failed.
 */

import { PlatformType } from "../../../../generated/prisma/enums.js";
import { log } from "../../../utils/logger.js";
import { sendMetaMessage } from "./metaMessage.service.js";

/** Where a Send API message goes out from. */
export interface MetaFlowChannel {
  platform: typeof PlatformType.INSTAGRAM | typeof PlatformType.FACEBOOK;
  /** The IBA id for Instagram, the Page id for Messenger. */
  accountId: string;
  /**
   * Messenger only: a Page comment being answered. See {@link PendingComment}. Instagram
   * passes its comment id separately, because a comment there already names the person.
   */
  pendingComment?: PendingComment;
}

/**
 * A Facebook Page comment a rule or chatbot is answering. A Page comment names the person
 * by an id that is not their Messenger id, so the first send goes out as a private reply to
 * the comment and Meta's answer names them: `recipientId` is set then, and every later send
 * on the same channel goes to it. Shared by reference, so the caller reads who was reached.
 */
export interface PendingComment {
  commentId: string;
  recipientId?: string;
}

export interface SendApiQuickReply {
  content_type: "text";
  title: string;
  payload: string;
  image_url?: string;
}

export interface SendApiTemplateElement {
  title: string;
  subtitle?: string;
  image_url?: string;
  buttons?: Array<{
    type: "postback" | "web_url";
    title: string;
    payload?: string;
    url?: string;
  }>;
}

const LOG_PREFIX: Record<MetaFlowChannel["platform"], string> = {
  [PlatformType.INSTAGRAM]: "[Instagram Messaging]",
  [PlatformType.FACEBOOK]: "[Messenger Messaging]",
};

async function send(
  channel: MetaFlowChannel,
  to: string,
  orgId: string,
  message: Record<string, unknown>,
): Promise<{ message_id?: string }> {
  const comment = channel.pendingComment;
  const privateReply = Boolean(comment && !comment.recipientId);
  const recipientId = comment?.recipientId ?? to;
  const result = await sendMetaMessage({
    platform: channel.platform,
    orgId,
    // A private reply is addressed to the comment; Meta's answer says who it reached.
    to: privateReply ? undefined : recipientId,
    sourceIdentifier: channel.accountId,
    payload: {
      recipient: privateReply ? { comment_id: comment!.commentId } : { id: recipientId },
      message,
    },
    messageType: "AUTOMATED",
    isAutomated: true,
    enforcePlanLimits: true,
  });
  if (!result.ok) throw new Error(result.error);
  if (privateReply) comment!.recipientId = result.recipientId;
  return { message_id: result.messageId };
}

function attachment(type: "image" | "video" | "audio" | "file", url: string) {
  return { attachment: { type, payload: { url, is_reusable: true } } };
}

export async function sendSendApiText(
  channel: MetaFlowChannel,
  to: string,
  orgId: string,
  text: string,
) {
  try {
    const result = await send(channel, to, orgId, { text });
    log.info(`${LOG_PREFIX[channel.platform]} Sent text to ${to}: "${text.substring(0, 50)}..."`);
    return result;
  } catch (error) {
    log.error({ err: error }, `${LOG_PREFIX[channel.platform]} Error sending text to ${to}`);
    throw error;
  }
}

/**
 * The Send API has no captions, so a caption goes out as its own text message after the
 * media. A caption that fails is reported, not thrown: the media itself was delivered.
 */
async function sendMediaWithCaption(
  type: "image" | "video",
  channel: MetaFlowChannel,
  to: string,
  orgId: string,
  url: string,
  caption?: string,
): Promise<{ media: unknown; caption?: { sent: boolean; error?: unknown } }> {
  const prefix = LOG_PREFIX[channel.platform];
  let media: { message_id?: string };
  try {
    media = await send(channel, to, orgId, attachment(type, url));
    log.info(`${prefix} Sent ${type} to ${to}: ${url}`);
  } catch (error) {
    log.error({ err: error }, `${prefix} Error sending ${type} to ${to}`);
    throw error;
  }

  if (!caption) return { media };

  try {
    await sendSendApiText(channel, to, orgId, caption);
    return { media, caption: { sent: true } };
  } catch (captionError) {
    log.error({ err: captionError }, `${prefix} ${type} delivered to ${to} but its caption failed`);
    return { media, caption: { sent: false, error: captionError } };
  }
}

export async function sendSendApiImage(
  channel: MetaFlowChannel,
  to: string,
  orgId: string,
  imageUrl: string,
  caption?: string,
): Promise<{ image: unknown; caption?: { sent: boolean; error?: unknown } }> {
  const { media, caption: captionResult } = await sendMediaWithCaption(
    "image",
    channel,
    to,
    orgId,
    imageUrl,
    caption,
  );
  return captionResult ? { image: media, caption: captionResult } : { image: media };
}

export async function sendSendApiVideo(
  channel: MetaFlowChannel,
  to: string,
  orgId: string,
  videoUrl: string,
  caption?: string,
) {
  return sendMediaWithCaption("video", channel, to, orgId, videoUrl, caption);
}

async function sendAttachment(
  type: "audio" | "file",
  channel: MetaFlowChannel,
  to: string,
  orgId: string,
  url: string,
) {
  try {
    const result = await send(channel, to, orgId, attachment(type, url));
    log.info(`${LOG_PREFIX[channel.platform]} Sent ${type} to ${to}: ${url}`);
    return result;
  } catch (error) {
    log.error({ err: error }, `${LOG_PREFIX[channel.platform]} Error sending ${type} to ${to}`);
    throw error;
  }
}

export async function sendSendApiAudio(
  channel: MetaFlowChannel,
  to: string,
  orgId: string,
  audioUrl: string,
) {
  return sendAttachment("audio", channel, to, orgId, audioUrl);
}

export async function sendSendApiFile(
  channel: MetaFlowChannel,
  to: string,
  orgId: string,
  fileUrl: string,
) {
  return sendAttachment("file", channel, to, orgId, fileUrl);
}

export async function sendSendApiQuickReply(
  channel: MetaFlowChannel,
  to: string,
  orgId: string,
  text: string,
  quickReplies: SendApiQuickReply[],
) {
  try {
    const result = await send(channel, to, orgId, {
      text,
      quick_replies: quickReplies.map((qr) => ({
        content_type: qr.content_type || "text",
        title: qr.title,
        payload: qr.payload,
        image_url: qr.image_url,
      })),
    });
    log.info(
      `${LOG_PREFIX[channel.platform]} Sent quick reply to ${to} with ${quickReplies.length} options`,
    );
    return result;
  } catch (error) {
    log.error({ err: error }, `${LOG_PREFIX[channel.platform]} Error sending quick reply to ${to}`);
    throw error;
  }
}

export async function sendSendApiGenericTemplate(
  channel: MetaFlowChannel,
  to: string,
  orgId: string,
  elements: SendApiTemplateElement[],
) {
  try {
    const result = await send(channel, to, orgId, {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: elements.map((element) => ({
            title: element.title,
            subtitle: element.subtitle || "",
            image_url: element.image_url || "",
            buttons:
              element.buttons?.map((button) => ({
                type: button.type,
                title: button.title,
                payload: button.payload,
                url: button.url,
              })) || [],
          })),
        },
      },
    });
    log.info(
      `${LOG_PREFIX[channel.platform]} Sent generic template to ${to} with ${elements.length} elements`,
    );
    return result;
  } catch (error) {
    log.error(
      { err: error },
      `${LOG_PREFIX[channel.platform]} Error sending generic template to ${to}`,
    );
    throw error;
  }
}
