import {
  keepPreviousData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { campaignKeys } from "@/backend/campaign/campaign.keys";
import { whatsappReachKeys } from "@/backend/channels/whatsappReach.query";
import { whatsappKeys } from "@/backend/whatsapp/whatsapp.keys";

import { contactGroupKeys, contactKeys } from "./contacts.keys";
import {
  addContactIdentity,
  dismissMergeSuggestion,
  getContactIdentityOverview,
  getMergePreview,
  getMergeSuggestionCount,
  getMergeSuggestions,
  mergeContacts,
  removeContactIdentity,
  scanForDuplicates,
  updateContactIdentity,
} from "./merge.api";

/**
 * Outside the `["contacts"]` root on purpose: a contact edit sweeps that root, and the merge
 * preview is expensive (counts across every owned table), so it refetches only when asked.
 */
export const contactMergeKeys = {
  all: () => ["contactMerge"] as const,
  preview: (sourceId: string, targetId: string) =>
    ["contactMerge", "preview", sourceId, targetId] as const,
  suggestions: () => ["contactMerge", "suggestions"] as const,
  suggestionCount: () => ["contactMerge", "suggestions", "count"] as const,
  overview: (contactId: string) => ["contactMerge", "contact", contactId] as const,
} as const;

export const useMergePreview = (sourceId: string | null, targetId: string | null) =>
  useQuery({
    enabled: !!sourceId && !!targetId && sourceId !== targetId,
    queryKey: contactMergeKeys.preview(sourceId ?? "", targetId ?? ""),
    queryFn: () => getMergePreview(sourceId ?? "", targetId ?? ""),
    // The swap button flips the pair; keep the old columns on screen while the new ones load.
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

export const useMergeSuggestions = (enabled = true) =>
  useInfiniteQuery({
    enabled,
    queryKey: contactMergeKeys.suggestions(),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => getMergeSuggestions({ cursor: pageParam }),
    getNextPageParam: (last) => last.nextCursor ?? null,
  });

export const useScanForDuplicates = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: scanForDuplicates,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contactMergeKeys.suggestions() });
    },
  });
};

export const useMergeSuggestionCount = (enabled = true) =>
  useQuery({
    enabled,
    queryKey: contactMergeKeys.suggestionCount(),
    queryFn: getMergeSuggestionCount,
    staleTime: 60_000,
  });

export const useContactIdentityOverview = (contactId: string | undefined, enabled = true) =>
  useQuery({
    enabled: enabled && !!contactId,
    queryKey: contactMergeKeys.overview(contactId ?? ""),
    queryFn: () => getContactIdentityOverview(contactId ?? ""),
  });

/** Everything a merge can change: both contacts' rows, the inbox list, audiences, loyalty. */
export function invalidateAfterMerge(
  queryClient: QueryClient,
  pair?: { sourceId: string; targetId: string },
) {
  // The kept contact gains the source's identities, so the numbers that can reach it change.
  if (pair) {
    for (const id of [pair.sourceId, pair.targetId]) {
      void queryClient.invalidateQueries({ queryKey: whatsappReachKeys.forContact(id) });
    }
  } else {
    void queryClient.invalidateQueries({ queryKey: whatsappReachKeys.all() });
  }
  void queryClient.invalidateQueries({ queryKey: contactKeys.all() });
  void queryClient.invalidateQueries({ queryKey: contactKeys.inboxCount() });
  void queryClient.invalidateQueries({ queryKey: contactMergeKeys.all() });
  void queryClient.invalidateQueries({ queryKey: whatsappKeys.assignedInboxUser() });
  void queryClient.invalidateQueries({ queryKey: contactGroupKeys.byTeam() });
  void queryClient.invalidateQueries({ queryKey: contactGroupKeys.byContact() });
  void queryClient.invalidateQueries({ queryKey: campaignKeys.contactGroups() });
  // Loyalty roots are spelled several ways (`loyaltyCustomers`, `loyalty-tiers`); a merge can
  // close an account, so sweep all of them.
  void queryClient.invalidateQueries({
    predicate: (query) =>
      typeof query.queryKey[0] === "string" &&
      query.queryKey[0].toLowerCase().startsWith("loyalty"),
  });
}

export const useMergeContactsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mergeContacts,
    onSuccess: (_data, body) =>
      invalidateAfterMerge(queryClient, { sourceId: body.sourceId, targetId: body.targetId }),
  });
};

export const useDismissMergeSuggestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dismissMergeSuggestion,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contactMergeKeys.all() });
    },
  });
};

export const useAddContactIdentity = (contactId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { kind: "PHONE" | "EMAIL"; value: string }) =>
      addContactIdentity(contactId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contactMergeKeys.overview(contactId) });
      // The legacy phone/email column follows the primary identity.
      void queryClient.invalidateQueries({ queryKey: contactKeys.detail(contactId) });
      void queryClient.invalidateQueries({ queryKey: whatsappReachKeys.forContact(contactId) });
    },
  });
};

export const useUpdateContactIdentity = (contactId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      identityId,
      ...body
    }: {
      identityId: string;
      value?: string;
      isPrimary?: true;
    }) => updateContactIdentity(contactId, identityId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contactMergeKeys.overview(contactId) });
      // The contact's phone/email column follows the main identity, so lists change too.
      void queryClient.invalidateQueries({ queryKey: contactKeys.all() });
      void queryClient.invalidateQueries({ queryKey: whatsappReachKeys.forContact(contactId) });
    },
  });
};

export const useRemoveContactIdentity = (contactId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (identityId: string) => removeContactIdentity(contactId, identityId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contactMergeKeys.overview(contactId) });
      void queryClient.invalidateQueries({ queryKey: contactKeys.detail(contactId) });
      void queryClient.invalidateQueries({ queryKey: whatsappReachKeys.forContact(contactId) });
    },
  });
};
