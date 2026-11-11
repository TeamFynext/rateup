import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Toast } from "@/components/common/Notice";
import { setConversationFavorite } from "./contacts.api";
import { useContactsStore } from "@/store/inboxStore";
import { useSelectedContactStore } from "@/utils/store";
import {
  assignedContact,
  editContact,
  getContactLabels,
  getContactById,
  getFilteredContacts,
  markMessageAsRead,
} from "./contacts.api";
import { filteredContactsCount } from "./contacts.api";

export const getDefaultFilter = (messageType: string) => ({
  messageType: messageType,
  strictFilter: false,
  searchTerm: "",
  contactGroups: [],
  campaigns: [],
  tags: [],
});

export const useFilteredContacts = (filterData: string) => {
  return useInfiniteQuery({
    queryKey: ["contacts", "filtered", filterData],
    queryFn: ({ pageParam = 1 }) => getFilteredContacts(filterData, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage?.nextOffset ?? null;
    },
  });
};

export const useContactCounts = () => {
  return useQuery({
    queryKey: ["contactCounts"],
    queryFn: filteredContactsCount,
  });
};

export const useAssignedContact = (contactId: string) => {
  return useQuery({
    queryKey: ["assigned-contact", contactId],
    queryFn: () => assignedContact(contactId),
    enabled: !!contactId,
  });
};

export const useContactById = (contactId: string) =>
  useQuery({
    queryKey: ["contact-by-id", contactId],
    queryFn: () => getContactById(contactId),
    enabled: !!contactId,
  });

export const useMarkMessageAsRead = () =>
  useMutation({
    mutationFn: (contactId: string) => markMessageAsRead(contactId),
  });

export const useContactLabels = () => {
  return useQuery({
    queryKey: ["contacts", "labels"],
    queryFn: getContactLabels,
  });
};

export const useEditContactMutation = () => {
  return useMutation({
    mutationFn: editContact,
  });
};

/**
 * Star / un-star a ticket. The endpoint sets rather than toggles, so the caller
 * passes the value it wants. Mirrors the web inbox's `useToggleFavorite`:
 * patch the local row, then refresh the counts and the list.
 *
 * The star lives on the ticket: `conversationId` is what the API keys on and
 * which of the contact's inbox rows is patched.
 */
export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { contactId: string; conversationId: string; isFavorite: boolean }) =>
      setConversationFavorite({
        conversationId: vars.conversationId,
        isFavorite: vars.isFavorite,
      }),
    onSuccess: (_res, vars) => {
      useContactsStore
        .getState()
        .setContactFavorite(vars.contactId, vars.isFavorite, vars.conversationId);

      const { selectedContact, setSelectedContact } = useSelectedContactStore.getState();
      if (
        selectedContact?.id === vars.contactId &&
        (!selectedContact.conversationId || selectedContact.conversationId === vars.conversationId)
      ) {
        setSelectedContact({ ...selectedContact, isFavorite: vars.isFavorite });
      }

      queryClient.invalidateQueries({ queryKey: ["contactCounts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts", "filtered"] });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: "Could not update star",
        text2: error?.response?.data?.message ?? error?.message ?? "Please try again.",
      });
    },
  });
};
