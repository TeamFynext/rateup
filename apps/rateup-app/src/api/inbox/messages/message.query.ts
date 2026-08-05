import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { MessagePlatform } from "@/constants/enums";
import {
  assignInboxToUser,
  createPrivateMessage,
  getAssignedUserForContact,
  getMessagesByContactId,
  getWaChatMediaFile,
  sendNewWaMessage,
} from "./message.api";

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

export const useSendNewWaMessage = (
  contactId: string,
  teamId: string | null,
  whatsappSettingsPhoneId: string,
  platform = MessagePlatform.WHATSAPP
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: any) =>
      sendNewWaMessage(contactId, {
        ...message,
        whatsappSettingsPhoneId,
        platform,
        teamId,
      }),
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


export const useAssignInboxToUser = (contactId: any) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: assignInboxToUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignedInboxUser"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contactInboxCount"] });
      qc.invalidateQueries({ queryKey: ["notification"] });
      qc.invalidateQueries({ queryKey: ["notificationCount"] });
    },
  });
};

export const useGetAssignedUserForContact = (contactId: any) => {
  return useQuery({
    queryKey: ["assignedInboxUser", contactId],
    queryFn: () => getAssignedUserForContact(contactId),
    enabled: !!contactId,
  });
};

export function useCreatePrivateMessage(contactId: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createPrivateMessage(contactId, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["wa-messages", contactId] });
    },
    onError: (error) => {
      console.error("Error sending message", error);
    },
  });
}
