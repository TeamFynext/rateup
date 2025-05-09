import dayjs from "dayjs";

import { WaTemplateComponentTypeUpperCase } from "@/types/enums";

import { WaTemplateDefaultValues } from "../../components/whatsapp/templates/Schema/templateSchema";
import {
  WaInboxMessage,
  WaSendMessageBody,
  WaTemplateComponent,
  WaTemplateFetchBody,
  WaTemplateFetchBodyComponent,
} from "../../types/global";

export type ParsedWaMessageReturn = {
  timeStamp: string;
  messageType: string;
  messageContent: any;
  template?: WaTemplateFetchBody;
  interactive?: WaSendMessageBody["interactive"];
};
export function parseWaMessage(
  messageBody: WaInboxMessage,
): ParsedWaMessageReturn {
  let timeStamp: string = new Date().toLocaleTimeString();
  let messageType: string = "text";
  let messageContent = "No messages yet" as any;
  let template: WaTemplateFetchBody = {} as WaTemplateFetchBody;
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
        messageContent = send.reaction.emoji;
        break;
      case "document":
        messageContent = `${send?.document.link}_caption_${send?.document.filename}_caption_${send?.document.caption ?? ""}`;
        break;
      case "contacts":
        messageContent = [...send.contacts];
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
        messageContent = `${receive.messages[0].image?.link}_caption_${receive.messages[0].image?.caption ?? ""}`;
        break;
      case "button":
        messageContent = receive.messages[0].button.text;
        break;
      case "audio":
        messageContent = `${receive.messages[0].audio?.id}_caption_${receive.messages[0].audio?.caption ?? ""}`;
        break;
      case "video":
        messageContent = `${receive.messages[0].video?.id}_caption_${receive.messages[0].video?.caption ?? ""}`;
        break;
      case "document":
        messageContent = `${receive.messages[0].document.id}_caption_${receive.messages[0].document.filename}_caption_${receive.messages[0].document.caption ?? ""}`;
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
      case "contacts":
        messageContent = [...receive.messages[0].contacts];
        break;
    }
  }
  return { timeStamp, messageType, messageContent, template, interactive };
}

export function returnMessageContentBasedOnParsedMessage(
  parsedMessage: ParsedWaMessageReturn,
  exchangeProcess: "send" | "receive",
) {
  if (parsedMessage.messageType === "text") {
    return parsedMessage.messageContent;
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

export function isInboxSessionExpired(timeStamp: string) {
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
            const hasSelectedImage =
              !!sendHeaderComponent?.parameters[0]?.[
                componentC?.format.toLowerCase()
              ]?.link;
            return hasDefaultImage || hasSelectedImage;
          case "VIDEO":
          case "DOCUMENT":
            const hasDefaultFile = !!createTemplateComponents.find(
              (data) => data.type === WaTemplateComponentTypeUpperCase.HEADER,
            )?.example?.header_handle?.[0];
            const hasSelectedFile =
              !!sendHeaderComponent?.parameters[0]?.[
                componentC?.format.toLowerCase()
              ]?.link;
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
