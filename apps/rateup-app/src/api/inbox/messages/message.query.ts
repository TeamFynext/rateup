import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getMessagesByContactId,
  getWaChatMediaFile,
  orgWsAuthCheck,
  sendNewWaMessage,
} from "./message.api";
import { useLiveMessages } from "@/src/utils/store";
import { useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";

export const useGetMessagesByContactId = (contactId: string) => {
  return useInfiniteQuery({
    queryKey: ["wa-messages", contactId],
    initialPageParam: "",
    queryFn: ({ pageParam }) => getMessagesByContactId(contactId, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
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

export const useOrgWsAuthCheck = (enabled: boolean) => {
  return useQuery({
    queryKey: ["org_auth_check_for_ws"],
    queryFn: orgWsAuthCheck,
    enabled,
  });
};
