
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { assignedContact, getContactById, getFilteredContacts, markMessageAsRead } from "./contacts.api";
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

export const ASSIGNED_CONTACT_QUERY_KEY = "assigned-contact";
export const useAssignedContact = (contactId:string) => {
  return useQuery({
    queryKey:[ASSIGNED_CONTACT_QUERY_KEY,contactId],
    queryFn:()=> assignedContact(contactId),
    enabled: !!contactId
  })
}

export const CONTACT_BY_ID_QUERY_KEY = 'contact-by-id'
export const useContactById = (contactId: string) =>
  useQuery({
    queryKey: [CONTACT_BY_ID_QUERY_KEY, contactId],
    queryFn: () => getContactById(contactId),
    enabled: !!contactId,
  });

  
  export const useMarkMessageAsRead = () =>
    useMutation({
      mutationFn: (contactId: string) => markMessageAsRead(contactId),
    });
  