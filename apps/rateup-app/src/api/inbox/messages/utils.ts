import { WaTemplateFetchBody } from "@/context/type";
import { WaMessageAssignStatus, WaSendMessageBody } from "../types";
import { WaMessageClosedStatus } from "@/constants/constants";
import { MessagePlatform } from "@/constants/enums";

export type ParsedWaMessageReturn = {
  timeStamp: string;
  messageType: string;
  messageContent: string;
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
        if (message.attachment) {
          messageContent =
            message.attachment.payload.id ||
            message.attachment.payload.url ||
            message.attachment.payload.attachment_id;

          messageType = message.attachment.type;
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
          };
        } else if (receive.message.attachments) {
          messageContent = {
            attachments: receive.message.attachments.map((r: any) => ({
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
      const { send } = messageBody;
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
          default:
            messageContent = "Not Supported Yet";
            break;
        }
      }
    }
    if (messageBody?.exchangeProcess === "internal") {
      const { internal } = messageBody;
      const isClosedType = WaMessageClosedStatus.includes(
        internal?.assignStatus as WaMessageAssignStatus,
      );
      if (isClosedType) {
        messageContent = `${internal?.triggeredByUser?.name} ${internal?.text?.body} `;
      } else {
        messageContent = `${internal?.text?.body} by ${internal?.triggeredByUser?.name}`;
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
    return parsedMessage.messageContent?.attachments?.[
      parsedMessage.messageContent.attachments.length - 1
    ]?.type || "Attachment";
  } else if (parsedMessage.messageType === "ig_comment") {
    return parsedMessage.messageContent?.text || "Comment";
  } else {
    return "Unsupported message type";
  }
}
