import { WaTemplateFetchBody } from "@/src/context/type";
import { WaSendMessageBody } from "../types";

export type ParsedWaMessageReturn = {
  timeStamp: string;
  messageType: string;
  messageContent: string;
  template?: WaTemplateFetchBody;
  interactive?: WaSendMessageBody["interactive"];
};

export function parseWaMessage_(message: any): ParsedWaMessageReturn {
  const { messageBody, waCreatedAt } = message;
  let timeStamp: string = waCreatedAt ?? new Date().toLocaleTimeString();
  let messageType: string = "text";
  let messageContent: any = "No messages yet";
  let template: WaTemplateFetchBody = {} as WaTemplateFetchBody;
  let interactive: WaSendMessageBody["interactive"] =
    {} as WaSendMessageBody["interactive"];
    if (message.sourcePlatform === "INSTAGRAM") {
    if (messageBody?.exchangeProcess === "send") {
      const { send } = messageBody
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
      const { receive } = messageBody
      if (receive.message) {
        if (receive.message.attachments) {
          messageContent = {
            attachments: receive.message.attachments.map((r:any) => ({
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
  }
  else{
    if (messageBody?.exchangeProcess === "send") {
    const { send } = messageBody;
    messageType = send.type;
    switch (messageType) {
      case "text":
        messageContent = send?.text?.body;
        break;
      case "image":
        messageContent = `${send?.image?.link}_caption_${
          send?.image?.caption ?? ""
        }`;
        break;
      case "video":
        messageContent = `${send?.video?.link}_caption_${
          send?.video?.caption ?? ""
        }`;
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
        messageContent = send?.reaction.emoji;
        break;
      case "document":
        messageContent = `${send?.document.link}_caption_${
          send?.document.filename
        }_caption_${send?.document.caption ?? ""}`;
        break;
      default:
        messageContent = "Not supported yet";
        break;
    }
  }
  if (messageBody?.exchangeProcess === "receive") {
    const { receive } = messageBody;
    timeStamp = receive.messages[0].timestamp;
    messageType = receive.messages[0].type;
    switch (messageType) {
      case "text":
        messageContent = receive.messages[0].text.body;
        break;
      case "image":
        messageContent = `${receive.messages[0].image?.link}_caption_${
          receive.messages[0].image?.caption ?? ""
        }`;
        break;
      case "button":
        messageContent = receive.messages[0].button.text;
        break;
      case "audio":
        messageContent = `${receive.messages[0].audio?.id}_caption_${
          receive.messages[0].audio?.caption ?? ""
        }`;
        break;
      case "video":
        messageContent = `${receive.messages[0].video?.id}_caption_${
          receive.messages[0].video?.caption ?? ""
        }`;
        break;
      case "document":
        messageContent = `${receive.messages[0].document.id}_caption_${
          receive.messages[0].document.filename
        }_caption_${receive.messages[0].document.caption ?? ""}`;
        break;
      case "interactive":
        switch (receive.messages[0].interactive.type) {
          case "button_reply":
            messageContent = receive.messages[0].interactive.button_reply.title;
            break;
          case "list_reply":
            messageContent = receive.messages[0].interactive.list_reply.title;
            break;
          case "nfm_reply":
            messageContent = receive.messages[0].interactive.nfm_reply.name;
            break;
        }
        break;
      case "reaction":
        messageContent = receive.messages[0].reaction.emoji;
        break;
      default:
        messageContent = "Not Supported Yet";
    }
  }
  if(messageBody?.exchangeProcess === "privateNote"){
    const {privateNote} = messageBody;
    messageContent = privateNote.text.body.trim();
  }
  if(messageBody?.exchangeProcess === "internal"){
    const {internal} = messageBody;
    messageContent = internal.text.body.trim();
  }
  }
  return { timeStamp, messageType, messageContent, interactive, template };
}

export function returnMessageContentBasedOnParsedMessage(
  parsedMessage: ParsedWaMessageReturn,
  exchangeProcess: "send" | "receive"
) {
  if (parsedMessage.messageType === "text") {
    return parsedMessage.messageContent;
  } else if (parsedMessage.messageType === "image") {
    return "📷Image";
  } else if (parsedMessage.messageType === "video") {
    return "🎥Video";
  } else if (parsedMessage.messageType === "audio") {
    return "🎧Audio";
  } else if (parsedMessage.messageType === "document") {
    return "📄Document";
  } else if (parsedMessage.messageType === "template") {
    return "Template";
  } else if (parsedMessage.messageType === "button") {
    return parsedMessage.messageContent;
  } else if (parsedMessage.messageType === "interactive") {
    return "Interactive Message";
  } else if (parsedMessage.messageType === "reaction") {
    return exchangeProcess === "send"
      ? `You reacted ${parsedMessage.messageContent}`
      : `Reacted ${parsedMessage.messageContent}`;
  } else {
    return "Unsupported message type";
  }
}
