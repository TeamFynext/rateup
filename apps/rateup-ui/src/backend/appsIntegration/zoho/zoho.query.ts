import { useMutation, useQuery } from "@tanstack/react-query";

import {
  getZohoContacts,
  getZohoLeads,
  getZohoPipelines,
  syncZohoContacts,
  syncZohoLeads,
  unsubscribeZoho,
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

export function useZohoPipelines(product: string) {
  return useQuery({
    queryKey: ["zoho-pipelines", product],
    queryFn: () => getZohoPipelines(product),
  });
}

export function useSyncZohoLeadsMutation() {
  return useMutation({
    mutationFn: syncZohoLeads,
  });
}

export function useUnsubscribeZoho() {
  return useMutation({
    mutationFn: async (orgId: string) => {
      return await unsubscribeZoho(orgId);
    },
  });
}
