import { useMutation, useQuery } from "@tanstack/react-query";

import {
  getZohoContacts,
  getZohoLeads,
  syncZohoContacts,
  syncZohoLeads,
} from "./zoho.api";

export function useZohoContacts(orgId?: string) {
  return useQuery({
    queryKey: ["zoho-contacts", orgId],

    queryFn: () => getZohoContacts(orgId!),

    enabled: !!orgId,
  });
}

export function useSyncZohoContactsMutation() {
  return useMutation({
    mutationFn: syncZohoContacts,
  });
}

export function useZohoLeads(orgId?: string) {
  return useQuery({
    queryKey: ["zoho-leads", orgId],

    queryFn: () => getZohoLeads(orgId!),

    enabled: !!orgId,
  });
}

export function useSyncZohoLeadsMutation() {
  return useMutation({
    mutationFn: syncZohoLeads,
  });
}
