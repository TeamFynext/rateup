import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import {
  assignedContact,
  editContact,
  getChatFilterData,
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
    getNextPageParam: (lastPage, allPages) => {
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

export const useChatFilterData = () => {
  return useQuery({
    queryKey: ["contacts", "filter-data"],
    queryFn: getChatFilterData,
  });
};

export const useEditContactMutation = () => {
  return useMutation({
    mutationFn: editContact,
  });
};