import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/src/config/axios";
import { WaInboxMessage } from "./types";

export const useGetMessagesByContactId = (contactId: string) => {
  return useInfiniteQuery({
    queryKey: ["wa-messages", contactId],
    initialPageParam: "",
    queryFn: ({ pageParam }) => getMessagesByContactId(contactId, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => ({
      pages: [...data.pages].reverse(),
      pageParams: [...data.pageParams].reverse(),
    }),
    enabled: !!contactId,
  });
};

export async function getMessagesByContactId(
  contactId: string,
  cursor: string
) {
  const res = await axios.get(
    `/api/wa/inbox/message/${contactId}?cursor=${cursor}`
  );
  return res.data;
}

export async function sendNewWaMessage(contactId: string, message: any) {
  return await axios.post(
    `/api/wa/inbox/message/${contactId}`,
    message,
  );
}

export const useSendNewWaMessage = (contactId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: any) => sendNewWaMessage(contactId, message),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["wa-messages", contactId] });
    },
    onError: (error) => {
      console.error("Error sending message", error);
    },
  });
};

export type ParsedWaMessage = {
  timeStamp: string;
  messageType: string;
  messageContent: string;
  isSent: boolean;
};



export type ParsedWaMessageReturn = {
  timeStamp: string;
  messageType: string;
  messageContent: string;
};

export function parseWaMessage_(
  messageBody: any,
): ParsedWaMessageReturn {
  let timeStamp: string = new Date().toLocaleTimeString();
  let messageType: string = "text";
  let messageContent: string = "No messages yet";
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
      case "reaction":
        messageContent = send?.reaction.emoji;
        break;
      case "document":
        messageContent = `${send?.document.link}_caption_${send?.document.filename}_caption_${send?.document.caption ?? ""}`;
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
    }
  }
  return { timeStamp, messageType, messageContent };
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
  } else if (parsedMessage.messageType === "contact") {
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