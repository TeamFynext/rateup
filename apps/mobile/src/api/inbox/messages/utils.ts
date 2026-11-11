import { WaTemplateFetchBody } from "@/context/type";
import { WaMessageAssignStatus, WaSendMessageBody } from "../types";
import { WaMessageClosedStatus } from "@/constants/constants";
import { MessagePlatform } from "@/constants/enums";

/** One attachment of an Instagram/Messenger DM, flattened for the bubble. Mirrors rateup-ui. */
export type IgAttachmentItem = {
  /** The media URL (for a shared post or reel, Meta's CDN link to it). */
  content: string;
  type: string;
  /** Shared post / reel only: the title (caption) Meta sends with it. */
  title?: string;
  /** Shared post / reel only: the shared media's id. */
  mediaId?: string;
};

/** A customer's reply to one of the business's stories. */
export type IgStoryReplyContent = {
  text?: string;
  story: { id: string; url?: string; linkStickerUrl?: string };
};

/** Attachment types that are a post or reel someone shared, not their own media. */
const SHARED_POST_TYPES: ReadonlySet<string> = new Set(["ig_post", "ig_reel", "share", "reel"]);

export const isSharedPostAttachment = (type: string) => SHARED_POST_TYPES.has(type);
export const isReelAttachment = (type: string) => type === "ig_reel" || type === "reel";

const ATTACHMENT_PREVIEW: Record<string, string> = {
  image: "📷 Image",
  video: "🎥 Video",
  audio: "🎧 Audio",
  file: "📄 Document",
  sticker: "Sticker",
  story_mention: "Mentioned you in their story",
  ephemeral: "Disappearing media",
  ig_post: "Shared a post",
  share: "Shared a post",
  ig_reel: "Shared a reel",
  reel: "Shared a reel",
  story: "Story",
  ig_story: "Story",
};

export type ParsedWaMessageReturn = {
  timeStamp: string;
  messageType: string;
  messageContent: any;
  template?: WaTemplateFetchBody;
  interactive?: WaSendMessageBody["interactive"];
};

export function parseWaMessage_(message: any): ParsedWaMessageReturn {
  if (!message || !message.messageBody) {
    return {
      timeStamp: "",
      messageType: "text",
      messageContent: "No messages yet",
      interactive: {} as any,
      template: {} as any,
    };
  }
  const { messageBody, waCreatedAt } = message;

  let timeStamp: string = waCreatedAt ?? new Date().toLocaleTimeString();
  let messageType = "text";
  let messageContent = "No messages yet" as any;
  let template: WaTemplateFetchBody = {} as WaTemplateFetchBody;
  let interactive: WaSendMessageBody["interactive"] = {} as WaSendMessageBody["interactive"];

  if (
    message.sourcePlatform === MessagePlatform.INSTAGRAM ||
    message.sourcePlatform === MessagePlatform.FACEBOOK
  ) {
    if (messageBody?.exchangeProcess === "send") {
      const { send } = messageBody;
      const { message, sender_action, payload } = send;
      if (message) {
        if (message.attachment?.type === "template") {
          messageType = "text";
          messageContent = igTemplateText(message.attachment.payload);
        } else if (message.attachment) {
          messageContent =
            message.attachment.payload.id ||
            message.attachment.payload.url ||
            message.attachment.payload.attachment_id;

          messageType = message.attachment.type;
          if (messageType === "file") {
            // Shown with the document bubble, in its `link_caption_filename_caption_` form.
            const url: string = message.attachment.payload.url ?? "";
            const filename = decodeURIComponent(url.split("?")[0].split("/").pop() || "") || "file";
            messageType = "document";
            messageContent = `${url}_caption_${filename}_caption_`;
          }
        } else if (message.attachments?.length) {
          // Several images in one message.
          messageType = "attachments";
          messageContent = {
            attachments: message.attachments.map(
              (a: { type: string; payload?: { url?: string; attachment_id?: string } }) => ({
                content: a.payload?.url ?? a.payload?.attachment_id ?? "",
                type: a.type,
              }),
            ),
            text: message.text,
          };
        } else if (message.text) {
          messageType = "text";
          messageContent = message.text;
        }
      } else if (sender_action && sender_action === "react") {
        messageType = "reaction";
        messageContent = payload.emoji || payload.reaction;
      }
    }
    if (messageBody?.exchangeProcess === "receive") {
      const { receive } = messageBody;
      if (receive.message) {
        if (receive.message.comment_id || receive.message.mid?.startsWith("ig_comment_")) {
          messageType = "ig_comment";
          messageContent = {
            text: receive.message.text,
            commentId: receive.message.comment_id,
            mediaId: receive.message.media_id,
            permalink: receive.message.media_permalink,
          };
        } else if (receive.message.reply_to?.story) {
          const story: { id: string; url?: string; link_sticker_url?: string } =
            receive.message.reply_to.story;
          messageType = "ig_story_reply";
          messageContent = {
            text: receive.message.text,
            story: { id: story.id, url: story.url, linkStickerUrl: story.link_sticker_url },
          } satisfies IgStoryReplyContent;
        } else if (receive.message.attachments?.length) {
          const attachments: IgAttachmentItem[] = receive.message.attachments.map(
            (r: {
              type: string;
              payload?: {
                url?: string;
                title?: string;
                ig_post_media_id?: string;
                reel_video_id?: string;
                id?: string;
              };
            }) => ({
              content: r.payload?.url ?? "",
              type: r.type,
              title: r.payload?.title,
              mediaId: r.payload?.ig_post_media_id ?? r.payload?.reel_video_id ?? r.payload?.id,
            }),
          );
          messageContent = { attachments, text: receive.message.text };
          messageType = attachments.every((a) => isSharedPostAttachment(a.type))
            ? "ig_shared_post"
            : "attachments";
        } else if (receive.message.text) {
          messageContent = receive.message.text;
          messageType = "text";
        } else if (receive.message.quick_reply) {
          messageContent = receive.message.quick_reply.payload;
          messageType = "quickreply";
        } else if (receive.message.is_unsupported) {
          // Instagram withholds the content (an unsupported media type).
          messageType = "ig_unsupported";
          messageContent = "";
        }
      } else if (receive.reaction && receive.reaction.action === "react") {
        messageContent = receive.reaction.emoji || receive.reaction.reaction;
        messageType = "reaction";
      }
    }
  } else {
    if (messageBody?.exchangeProcess === "send") {
      const { send } = messageBody;
      messageType = send?.type || "text";
      switch (messageType) {
        case "text":
          messageContent = send?.text?.body || messageBody?.text?.body || "";
          break;
        case "image":
          messageContent = `${send?.image?.link}_caption_${send?.image?.caption ?? ""}`;
          break;
        case "video":
          messageContent = `${send?.video?.link}_caption_${send?.video?.caption ?? ""}`;
          break;
        case "audio":
          messageContent = `${send?.audio?.link}`;
          break;
        case "template":
          messageContent = send.template?.name ?? "";
          template = send.template;
          break;
        case "interactive":
          messageContent = "";
          interactive = send.interactive;
          break;
        case "reaction":
          messageContent = send.reaction?.emoji;
          break;
        case "document":
          messageContent = `${send?.document?.link}_caption_${send?.document?.filename}_caption_${send?.document?.caption ?? ""}`;
          break;
        case "contacts":
          messageContent = [...(send.contacts || [])];
          break;
        case "location":
          messageContent = { ...send.location };
          break;
        default:
          messageContent = "Not supported yet";
          break;
      }
    }
    if (messageBody?.exchangeProcess === "receive") {
      const { receive } = messageBody;
      if (receive.messages && receive.messages.length > 0) {
        timeStamp = receive.messages[0].timestamp;
        messageType = receive.messages[0].type;
        switch (messageType) {
          case "text":
            messageContent = receive.messages[0].text?.body;
            break;
          case "image":
            messageContent = `${receive.messages[0].image?.link}_caption_${receive.messages[0].image?.caption ?? ""}`;
            break;
          case "button":
            messageContent = receive.messages[0].button?.text;
            break;
          case "audio":
            messageContent = `${receive.messages[0].audio?.id}_caption_${receive.messages[0].audio?.caption ?? ""}`;
            break;
          case "video":
            messageContent = `${receive.messages[0].video?.id}_caption_${receive.messages[0].video?.caption ?? ""}`;
            break;
          case "document":
            messageContent = `${receive.messages[0].document?.id}_caption_${receive.messages[0].document?.filename}_caption_${receive.messages[0].document?.caption ?? ""}`;
            break;
          case "interactive":
            switch (receive.messages[0].interactive?.type) {
              case "button_reply":
                messageContent = receive.messages[0].interactive.button_reply?.title;
                break;
              case "list_reply":
                messageContent = receive.messages[0].interactive.list_reply?.title;
                break;
              case "nfm_reply":
                messageContent = receive.messages[0].interactive.nfm_reply?.name;
                break;
            }
            break;
          case "reaction":
            messageContent = receive.messages[0].reaction?.emoji;
            break;
          case "contacts":
            messageContent = [...(receive.messages[0].contacts || [])];
            break;
          case "location":
            messageContent = { ...receive.messages[0].location };
            break;
          case "order":
            messageContent = { ...receive.messages[0].order };
            break;
          case "sticker":
            messageContent = receive.messages[0].sticker?.id ?? "";
            break;
          default:
            messageContent = "Not Supported Yet";
            break;
        }
      }
    }
    if (messageBody?.exchangeProcess === "internal") {
      const { internal } = messageBody;
      if (internal?.summary) {
        messageContent = internal.summary;
      } else {
        // Rows written before the server composed the sentence: the actor is still glued on
        // here, and where it goes depends on how the fragment was phrased. Mirrors
        // rateup-ui/src/utils/whatsapp/inbox.ts.
        const isClosedType = WaMessageClosedStatus.includes(
          internal?.assignStatus as WaMessageAssignStatus,
        );
        messageContent = isClosedType
          ? `${internal?.triggeredByUser?.name} ${internal?.text?.body}`
          : `${internal?.text?.body} by ${internal?.triggeredByUser?.name}`;
      }
    }
    if (messageBody?.exchangeProcess === "privateNote") {
      const { privateNote } = messageBody;
      messageContent = privateNote?.text?.body?.trim();
    }
  }

  return {
    timeStamp,
    messageType,
    messageContent,
    template,
    interactive,
  };
}

export function returnMessageContentBasedOnParsedMessage(
  parsedMessage: ParsedWaMessageReturn,
  exchangeProcess?: "send" | "receive" | "internal" | "privateNote",
) {
  if (parsedMessage.messageType === "text") {
    return parsedMessage.messageContent;
  } else if (parsedMessage.messageType === "image") {
    return "📷 Image";
  } else if (parsedMessage.messageType === "video") {
    return "🎥 Video";
  } else if (parsedMessage.messageType === "audio") {
    return "🎧 Audio";
  } else if (parsedMessage.messageType === "document") {
    return "📄 Document";
  } else if (parsedMessage.messageType === "location") {
    return "Location";
  } else if (parsedMessage.messageType === "contacts") {
    return "Contact";
  } else if (parsedMessage.messageType === "sticker") {
    return "Sticker";
  } else if (parsedMessage.messageType === "order") {
    return "🛒 Order";
  } else if (parsedMessage.messageType === "voice") {
    return "Voice";
  } else if (parsedMessage.messageType === "gif") {
    return "GIF";
  } else if (parsedMessage.messageType === "template") {
    return "Template";
  } else if (parsedMessage.messageType === "button") {
    return parsedMessage.messageContent;
  } else if (parsedMessage.messageType === "interactive") {
    return "Interactive Message";
  } else if (parsedMessage.messageType === "reaction") {
    return exchangeProcess === "send"
      ? parsedMessage.messageContent === "love"
        ? "You Liked a message"
        : `You reacted ${parsedMessage.messageContent}`
      : parsedMessage.messageContent === "love"
        ? "Liked a message"
        : `Reacted ${parsedMessage.messageContent}`;
  } else if (parsedMessage.messageType === "attachments") {
    const attachments: IgAttachmentItem[] = parsedMessage.messageContent?.attachments ?? [];
    const last = attachments[attachments.length - 1]?.type;
    return (last && ATTACHMENT_PREVIEW[last]) || "Attachment";
  } else if (parsedMessage.messageType === "ig_shared_post") {
    const attachments: IgAttachmentItem[] = parsedMessage.messageContent?.attachments ?? [];
    return attachments.some((a) => isReelAttachment(a.type)) ? "Shared a reel" : "Shared a post";
  } else if (parsedMessage.messageType === "ig_unsupported") {
    return "Unsupported message";
  } else if (parsedMessage.messageType === "ig_story_reply") {
    return parsedMessage.messageContent?.text || "Replied to your story";
  } else if (parsedMessage.messageType === "ig_comment") {
    return parsedMessage.messageContent?.text || "Comment";
  } else {
    return "Unsupported message type";
  }
}

/**
 * A sent Instagram/Messenger template (product cards, or text with a link button) shown as
 * plain text, since the thread has no card bubble for it.
 */
function igTemplateText(payload: {
  template_type?: string;
  text?: string;
  elements?: { title?: string; subtitle?: string }[];
  buttons?: { title?: string }[];
}): string {
  if (payload?.text) {
    const labels = (payload.buttons ?? []).map((b) => b.title).filter(Boolean);
    return labels.length ? `${payload.text}\n[${labels.join("] [")}]` : payload.text;
  }
  const items = (payload?.elements ?? [])
    .map((e) => [e.title, e.subtitle].filter(Boolean).join(" · "))
    .filter(Boolean);
  return items.length ? items.map((i) => `🛍 ${i}`).join("\n") : "Products";
}

/**
 * The Meta id (`mid`) of the message this one quotes: an inbound inline reply carries it
 * on `message.reply_to.mid`, an agent's quoted reply on the send payload's `reply_to.mid`.
 * Instagram and Messenger only.
 */
export function getReplyToMid(message: {
  sourcePlatform?: string | null;
  messageBody?: {
    exchangeProcess?: string;
    receive?: { message?: { reply_to?: { mid?: string } } } | null;
    send?: { reply_to?: { mid?: string } } | null;
  } | null;
}): string | undefined {
  if (
    message.sourcePlatform !== MessagePlatform.INSTAGRAM &&
    message.sourcePlatform !== MessagePlatform.FACEBOOK
  )
    return undefined;
  const body = message.messageBody;
  if (body?.exchangeProcess === "receive") return body.receive?.message?.reply_to?.mid || undefined;
  if (body?.exchangeProcess === "send") return body.send?.reply_to?.mid || undefined;
  return undefined;
}

/** One line of what a message says, for a quote block. */
export function getMessagePreview(message: {
  messageBody?: { exchangeProcess?: "send" | "receive" | "internal" | "privateNote" } | null;
}): string {
  const preview = returnMessageContentBasedOnParsedMessage(
    parseWaMessage_(message),
    message.messageBody?.exchangeProcess,
  );
  return typeof preview === "string" ? preview : "";
}
