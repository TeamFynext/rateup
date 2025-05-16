import { WaSendMessageBody } from "../types";

export type ParsedWaMessageReturn = {
  timeStamp: string;
  messageType: string;
  messageContent: string;
    interactive?: WaSendMessageBody["interactive"];
};

export function parseWaMessage_(messageBody: any): ParsedWaMessageReturn {
  let timeStamp: string = new Date().toLocaleTimeString();
  let messageType: string = "text";
  let messageContent: string = "No messages yet";
  let interactive: WaSendMessageBody["interactive"] =
    {} as WaSendMessageBody["interactive"];
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
  return { timeStamp, messageType, messageContent, interactive };
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
