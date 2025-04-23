import { useInfiniteQuery } from "@tanstack/react-query"
import axios from "@/src/config/axios";

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
    cursor: string,
  ) {
      const res = await axios.get(`/api/wa/inbox/message/${contactId}?cursor=${cursor}`)
      return res.data
  }


export type ParsedWaMessage = {
  timeStamp: string;
  messageType: string;
  messageContent: string;
  isSent: boolean;
};

export function parseWaMessage(messageBody: any): ParsedWaMessage {
  let timeStamp = new Date().toLocaleTimeString();
  let messageType = "text";
  let messageContent = "No messages yet";
  let isSent = false;

  if (messageBody?.exchangeProcess === "send") {
    const { send } = messageBody;
    isSent = true;
    if (send.type === "text") {
      messageContent = send?.text?.body || "";
    }
  }

  if (messageBody?.exchangeProcess === "receive") {
    const { receive } = messageBody;
    isSent = false;
    timeStamp = receive.messages[0]?.timestamp || timeStamp;
    if (receive.messages[0]?.type === "text") {
      messageContent = receive.messages[0]?.text?.body || "";
    }
  }

  return { timeStamp, messageType, messageContent, isSent};
}
