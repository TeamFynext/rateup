import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessagesByContactId, getWaChatMediaFile, sendNewWaMessage } from "./message.api";

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


  export const useGetMediaFile = () => {
    return useMutation({
      mutationFn: getWaChatMediaFile,
    });
  };