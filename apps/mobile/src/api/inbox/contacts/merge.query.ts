import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addContactIdentity,
  dismissMergeSuggestion,
  getContactFullDetails,
  getContactIdentityOverview,
  getMergePreview,
  mergeContacts,
  removeContactIdentity,
  searchContacts,
  updateContactIdentity,
} from "./merge.api";

export const contactDetailsKey = (contactId: string) => ["contact-details", contactId] as const;
export const identityOverviewKey = (contactId: string) =>
  ["contact-identities", contactId] as const;

export const useContactFullDetails = (contactId: string, enabled = true) =>
  useQuery({
    queryKey: contactDetailsKey(contactId),
    queryFn: () => getContactFullDetails(contactId),
    enabled: !!contactId && enabled,
  });

export const useContactIdentityOverview = (contactId: string, enabled = true) =>
  useQuery({
    queryKey: identityOverviewKey(contactId),
    queryFn: () => getContactIdentityOverview(contactId),
    enabled: !!contactId && enabled,
    // An older API has no identities route; the section hides instead of retrying.
    retry: false,
  });

export const useContactSearch = (search: string) =>
  useQuery({
    queryKey: ["contact-search", search],
    queryFn: () => searchContacts(search),
    placeholderData: keepPreviousData,
  });

export const useMergePreview = (sourceId: string | null, targetId: string | null) =>
  useQuery({
    queryKey: ["contact-merge-preview", sourceId, targetId],
    queryFn: () => getMergePreview(sourceId!, targetId!),
    enabled: !!sourceId && !!targetId,
    placeholderData: keepPreviousData,
  });

/** Refreshes everything that shows a contact's identities or details. */
function useInvalidateContact() {
  const queryClient = useQueryClient();
  return (contactId: string) => {
    queryClient.invalidateQueries({ queryKey: identityOverviewKey(contactId) });
    queryClient.invalidateQueries({ queryKey: contactDetailsKey(contactId) });
    queryClient.invalidateQueries({ queryKey: ["contact-by-id", contactId] });
  };
}

export const useAddIdentity = (contactId: string) => {
  const invalidate = useInvalidateContact();
  return useMutation({
    mutationFn: (body: { kind: "PHONE" | "EMAIL"; value: string }) =>
      addContactIdentity(contactId, body),
    onSuccess: () => invalidate(contactId),
  });
};

export const useMakeIdentityPrimary = (contactId: string) => {
  const invalidate = useInvalidateContact();
  return useMutation({
    mutationFn: (identityId: string) =>
      updateContactIdentity(contactId, identityId, { isPrimary: true }),
    onSuccess: () => invalidate(contactId),
  });
};

export const useRemoveIdentity = (contactId: string) => {
  const invalidate = useInvalidateContact();
  return useMutation({
    mutationFn: (identityId: string) => removeContactIdentity(contactId, identityId),
    onSuccess: () => invalidate(contactId),
  });
};

export const useDismissSuggestion = (contactId: string) => {
  const invalidate = useInvalidateContact();
  return useMutation({
    mutationFn: dismissMergeSuggestion,
    onSuccess: () => invalidate(contactId),
  });
};

export const useMergeContacts = () => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateContact();
  return useMutation({
    mutationFn: mergeContacts,
    onSuccess: (_res, vars) => {
      invalidate(vars.targetId);
      invalidate(vars.sourceId);
      queryClient.invalidateQueries({ queryKey: ["contacts", "filtered"] });
      queryClient.invalidateQueries({ queryKey: ["contactCounts"] });
    },
  });
};
