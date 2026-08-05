import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import type { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";
import type { OrderContent } from "@/components/whatsapp/inbox/chatdisplay/chatdisplayBody/components/order";
import type { WaTemplateDefaultValues } from "@/components/whatsapp/templates/Schema/templateSchema.ts";
import type { WaMessageAssignStatus } from "@/types/enums.ts";
import { MessagePlatform, WaTemplateComponentTypeUpperCase } from "@/types/enums.ts";
import type {
  IgReceiveMessageBody,
  IgSendMessageBody,
  WaReceiveMessageBody,
  WaSendMessageBody,
  WaTemplateComponent,
  WaTemplateFetchBody,
  WaTemplateFetchBodyComponent,
} from "@/types/global";

import { WaMessageClosedStatus } from "../constants.ts";

dayjs.extend(utc);

/**
 * Resolve the channel (WhatsApp / Instagram / Facebook / Webchat) a conversation
 * lives on. `lastMessage.sourcePlatform` alone is unreliable: the last message can
 * be an INTERNAL note (private or system message), whose `sourcePlatform` is
 * "INTERNAL" — not the real channel — and "INTERNAL" is truthy so a plain
 * `|| WHATSAPP` fallback never fires. Resolve in order of confidence:
 *   1. the last message, when it is a real channel message
 *   2. the most recent non-internal message the row already carries
 *   3. the contact's channel identity (igsId → Instagram, psid → Facebook)
 *   4. WhatsApp as the default
 */
export function getContactPlatform(
  contact?: {
    lastMessage?: { sourcePlatform?: MessagePlatform | string | null } | null;
    messages?: Array<
      { sourcePlatform?: MessagePlatform | string | null } | null | undefined
    > | null;
    igsId?: string | null;
    psid?: string | null;
  } | null,
): MessagePlatform {
  const asChannel = (p?: MessagePlatform | string | null): MessagePlatform | undefined =>
    p && p !== "INTERNAL" ? (p as MessagePlatform) : undefined;

  return (
    asChannel(contact?.lastMessage?.sourcePlatform) ??
    asChannel(contact?.messages?.find((m) => asChannel(m?.sourcePlatform))?.sourcePlatform) ??
    (contact?.igsId
      ? MessagePlatform.INSTAGRAM
      : contact?.psid
        ? MessagePlatform.FACEBOOK
        : MessagePlatform.WHATSAPP)
  );
}

/**
 * A parsed message body. Which member applies follows `messageType`: the media
 * and text kinds are strings (media pack `link_caption_caption`), and the
 * structured kinds keep the shape their renderer expects.
 */
export type ParsedWaMessageContent =
  | string
  | { text?: string; commentId?: string; mediaId?: string; permalink?: string }
  | {
      attachments: Array<{
        content: string;
        type: NonNullable<NonNullable<IgReceiveMessageBody["message"]>["attachments"]>[0]["type"];
      }>;
      text?: string;
    }
  | WaSendMessageBody["contacts"]
  | WaSendMessageBody["location"]
  | OrderContent;

export interface ParsedWaMessageReturn {
  timeStamp: string;
  messageType: string;
  messageContent: ParsedWaMessageContent;
  template?: WaTemplateFetchBody;
  interactive?: WaSendMessageBody["interactive"];
}
/** The attachments body carries a list of media entries. */
function isAttachmentContent(
  content: ParsedWaMessageContent,
): content is { attachments: Array<{ content: string; type: string }>; text?: string } {
  return typeof content === "object" && content !== null && "attachments" in content;
}

/** The Instagram comment body carries the comment's text and ids. */
function isCommentContent(
  content: ParsedWaMessageContent,
): content is { text?: string; commentId?: string; mediaId?: string } {
  return typeof content === "object" && content !== null && "commentId" in content;
}

export function parseWaMessage(message: Partial<WaGetMessagesBody>): ParsedWaMessageReturn {
  const { messageBody, waCreatedAt } = message;

  let timeStamp: string = waCreatedAt ?? new Date().toLocaleTimeString();
  let messageType = "text";
  let messageContent: ParsedWaMessageContent = "No messages yet";
  let template: WaTemplateFetchBody = {} as WaTemplateFetchBody;
  let interactive: WaSendMessageBody["interactive"] = {} as WaSendMessageBody["interactive"];
  if (
    message.sourcePlatform === MessagePlatform.INSTAGRAM ||
    message.sourcePlatform === MessagePlatform.FACEBOOK
  ) {
    if (messageBody?.exchangeProcess === "send") {
      const { send } = messageBody as { send: IgSendMessageBody };
      const { message, sender_action, payload } = send;
      if (message) {
        if (message.attachment) {
          messageContent =
            message.attachment.payload?.id ||
            message.attachment.payload?.url ||
            message.attachment.payload?.attachment_id;

          messageType = message.attachment.type;
        } else if (message.text) {
          messageType = "text";
          messageContent = message.text;
        }
      } else if (sender_action && sender_action === "react") {
        messageType = "reaction";
        messageContent = payload?.emoji || payload?.reaction;
      }
    }
    if (messageBody?.exchangeProcess === "receive") {
      const { receive } = messageBody as { receive: IgReceiveMessageBody };
      if (receive.message) {
        if (receive.message.comment_id || receive.message.mid?.startsWith("ig_comment_")) {
          messageType = "ig_comment";
          messageContent = {
            text: receive.message.text,
            commentId: receive.message.comment_id,
            mediaId: receive.message.media_id,
            permalink: receive.message.media_permalink,
          };
        } else if (receive.message.attachments) {
          messageContent = {
            attachments: receive.message.attachments.map((r) => ({
              content: r.payload ? r.payload.url : "",
              type: r.type,
            })),
            text: receive.message.text,
          };
          messageType = "attachments";
        } else if (receive.message.text) {
          messageContent = receive.message.text;
          messageType = "text";
        } else if (receive.message.quick_reply) {
          messageContent = receive.message.quick_reply.payload;
          messageType = "quickreply";
        }
      } else if (receive.reaction && receive.reaction.action === "react") {
        messageContent = receive.reaction.emoji || receive.reaction.reaction;
        messageType = "reaction";
      }
    }
  } else {
    if (messageBody?.exchangeProcess === "send") {
      const { send } = messageBody as { send: WaSendMessageBody };
      messageType = send.type;
      switch (messageType) {
        case "text":
          messageContent = send?.text?.body;
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
          template = send.template!;
          break;
        case "interactive":
          messageContent = "";
          interactive = send.interactive;
          break;
        case "reaction":
          messageContent = send.reaction!.emoji;
          break;
        case "document":
          messageContent = `${send?.document!.link}_caption_${send?.document!.filename}_caption_${send?.document!.caption ?? ""}`;
          break;
        case "contacts":
          messageContent = [...send.contacts!];
          break;
        case "location":
          messageContent = { ...send.location! };
          break;
      }
    }
    if (messageBody?.exchangeProcess === "receive") {
      const { receive } = messageBody as { receive: WaReceiveMessageBody };
      // The `type` discriminant guarantees its matching payload field is set.
      const inbound = receive.messages[0]!;
      timeStamp = inbound.timestamp;
      messageType = inbound.type;
      switch (messageType) {
        case "text":
          messageContent = inbound.text!.body;
          break;
        case "image":
          messageContent = `${inbound.image?.link}_caption_${inbound.image?.caption ?? ""}`;
          break;
        case "button":
          messageContent = inbound.button!.text;
          break;
        case "audio":
          messageContent = `${inbound.audio?.id}_caption_${inbound.audio?.caption ?? ""}`;
          break;
        case "video":
          messageContent = `${inbound.video?.id}_caption_${inbound.video?.caption ?? ""}`;
          break;
        case "document":
          messageContent = `${inbound.document!.id}_caption_${inbound.document!.filename}_caption_${inbound.document!.caption ?? ""}`;
          break;
        case "interactive":
          switch (inbound.interactive!.type) {
            case "button_reply":
              messageContent = inbound.interactive!.button_reply.title;
              break;
            case "list_reply":
              messageContent = inbound.interactive!.list_reply.title;
              break;
            case "nfm_reply":
              messageContent = inbound.interactive!.nfm_reply.name;
              break;
          }
          break;
        case "reaction":
          messageContent = inbound.reaction!.emoji;
          break;
        case "contacts":
          messageContent = [...inbound.contacts!];
          break;
        case "location":
          messageContent = { ...inbound.location! };
          break;
        case "order":
          messageContent = { ...inbound.order! };
          break;
      }
    }
    if (messageBody?.exchangeProcess === "internal") {
      const { internal } = messageBody;
      const isClosedType = WaMessageClosedStatus.includes(
        internal?.assignStatus as WaMessageAssignStatus,
      );
      if (isClosedType) {
        messageContent = `${internal?.triggeredByUser?.name} ${internal!.text.body} `;
      } else {
        messageContent = `${internal!.text.body} by ${internal?.triggeredByUser?.name}`;
      }
    }
    if (messageBody?.exchangeProcess === "privateNote") {
      const { privateNote } = messageBody;
      messageContent = `${privateNote!.text.body}`;
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

/** One-line preview of a message, for the chat list and notifications. */
export function returnMessageContentBasedOnParsedMessage(
  parsedMessage: ParsedWaMessageReturn,
  exchangeProcess: "send" | "receive" | "internal" | "privateNote",
): string {
  if (parsedMessage.messageType === "text") {
    return typeof parsedMessage.messageContent === "string" ? parsedMessage.messageContent : "";
  } else if (parsedMessage.messageType === "image") {
    return "Image";
  } else if (parsedMessage.messageType === "video") {
    return "Video";
  } else if (parsedMessage.messageType === "audio") {
    return "Audio";
  } else if (parsedMessage.messageType === "document") {
    return "Document";
  } else if (parsedMessage.messageType === "location") {
    return "Location";
  } else if (parsedMessage.messageType === "contacts") {
    return "Contact";
  } else if (parsedMessage.messageType === "sticker") {
    return "Sticker";
  } else if (parsedMessage.messageType === "voice") {
    return "Voice";
  } else if (parsedMessage.messageType === "gif") {
    return "GIF";
  } else if (parsedMessage.messageType === "template") {
    return "Template";
  } else if (parsedMessage.messageType === "button") {
    return typeof parsedMessage.messageContent === "string" ? parsedMessage.messageContent : "";
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
    const attachments = isAttachmentContent(parsedMessage.messageContent)
      ? parsedMessage.messageContent.attachments
      : [];
    return attachments.at(-1)?.type ?? "Attachment";
  } else if (parsedMessage.messageType === "ig_comment") {
    return isCommentContent(parsedMessage.messageContent)
      ? (parsedMessage.messageContent.text ?? "Comment")
      : "Comment";
  } else {
    return "Unsupported message type";
  }
}

export function isInboxSessionExpired(timeStamp?: string) {
  if (!timeStamp) return true;
  const currentTime = dayjs().utc();
  const givenTime = dayjs(timeStamp).utc();
  const diffInHours = currentTime.diff(givenTime, "hours");
  return diffInHours >= 24;
}

export function validateInboxTemplateSending(
  createTemplateComponents: WaTemplateFetchBodyComponent[],
  sendTemplateComponents: WaTemplateComponent[],
  defaultValues: WaTemplateDefaultValues,
) {
  return createTemplateComponents?.map((componentC) => {
    switch (componentC.type) {
      case "HEADER":
        const sendHeaderComponent = sendTemplateComponents.find(
          (componentS) => componentS.type === "header",
        );
        switch (componentC.format) {
          case "IMAGE":
            const hasDefaultImage = !!defaultValues?.image?.link;
            const hasSelectedImage = !!sendHeaderComponent?.parameters[0]?.image?.link;
            return hasDefaultImage || hasSelectedImage;
          case "VIDEO":
          case "DOCUMENT":
            const hasDefaultFile = !!createTemplateComponents.find(
              (data) => data.type === WaTemplateComponentTypeUpperCase.HEADER,
            )?.example?.header_handle?.[0];
            // "VIDEO" | "DOCUMENT" lowercased — the media key on the parameter.
            const mediaKey = componentC.format.toLowerCase() as "video" | "document";
            const hasSelectedFile = !!sendHeaderComponent?.parameters[0]?.[mediaKey]?.link;
            return hasDefaultFile || hasSelectedFile;
          case "LOCATION":
            if (!sendHeaderComponent) return false;
            if (
              sendHeaderComponent?.parameters[0]?.location?.latitude &&
              sendHeaderComponent?.parameters[0]?.location?.longitude &&
              sendHeaderComponent?.parameters[0]?.location?.name &&
              sendHeaderComponent?.parameters[0]?.location?.address
            )
              return true;
            else return false;
          default:
            return true;
        }
      default:
        return true;
    }
  });
}
