import { useMutation, useQuery } from "@tanstack/react-query";

import {
  getZohoContacts,
  getZohoLeads,
  syncZohoContacts,
  syncZohoLeads,
} from "./zoho.api";

export function useZohoContacts(
  orgId?: string,
  product: "crm" | "bigin" = "crm",
) {
  return useQuery({
    queryKey: ["zoho-contacts", orgId, product],

    queryFn: () => getZohoContacts(orgId!, product),

    enabled: !!orgId,
  });
}

export function useSyncZohoContactsMutation(product: "crm" | "bigin" = "crm") {
  return useMutation({
    mutationFn: () => syncZohoContacts(product),
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
