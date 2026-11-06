import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { asApiError, getApiErrorMessage } from "@/utils/apiError.ts";

import { apiKeyGrantDenialMessage } from "./apiKeyErrors.ts";
import {
  createApiKey,
  getApiUsage,
  listApiKeys,
  listApiRequests,
  revokeApiKey,
  rotateApiKey,
  updateApiKey,
  MAX_API_KEYS,
  type ApiRequestsFilter,
  type ApiUsageFilter,
} from "./apiKeys.api";

/** Under the `apiAccessToken` root the single-key console used, so one invalidation reaches both. */
export const apiKeyKeys = {
  all: () => ["apiAccessToken"] as const,
  list: () => ["apiAccessToken", "keys"] as const,
  usageRoot: () => ["apiAccessToken", "usage"] as const,
  usage: (filter: ApiUsageFilter) => ["apiAccessToken", "usage", filter] as const,
  requests: (filter: ApiRequestsFilter) => ["apiAccessToken", "usage", "requests", filter] as const,
};

export function useApiKeys(enabled = true) {
  return useQuery({ queryKey: apiKeyKeys.list(), queryFn: listApiKeys, enabled });
}

export function useApiUsage(filter: ApiUsageFilter, enabled = true) {
  return useQuery({
    queryKey: apiKeyKeys.usage(filter),
    queryFn: () => getApiUsage(filter),
    enabled,
    // Switching the key filter keeps the last chart up instead of blanking it.
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useApiRequests(filter: ApiRequestsFilter, enabled = true) {
  return useQuery({
    queryKey: apiKeyKeys.requests(filter),
    queryFn: () => listApiRequests(filter),
    enabled,
    // Turning a page keeps the current rows up until the next ones arrive.
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: createApiKey,
    onSuccess: () => qc.invalidateQueries({ queryKey: apiKeyKeys.list() }),
    onError: (error) => {
      const message =
        apiKeyGrantDenialMessage(error, t) ??
        (asApiError(error).response?.status === 409
          ? t(
              "This organisation has reached its limit of {max} API keys. Revoke one you no longer use.",
              {
                max: MAX_API_KEYS,
              },
            )
          : getApiErrorMessage(error, t("Could not create the API key")));
      toast.error(message, { id: "api-key-create" });
    },
  });
}

export function useUpdateApiKey() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: updateApiKey,
    onSuccess: () => {
      toast.success(t("API key updated"), { id: "api-key-update" });
      return qc.invalidateQueries({ queryKey: apiKeyKeys.list() });
    },
    onError: (error) => {
      const message =
        apiKeyGrantDenialMessage(error, t) ??
        getApiErrorMessage(error, t("Could not update the API key"));
      toast.error(message, {
        id: "api-key-update",
      });
    },
  });
}

export function useRotateApiKey() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: rotateApiKey,
    onSuccess: () => qc.invalidateQueries({ queryKey: apiKeyKeys.list() }),
    onError: (error) => {
      const message =
        apiKeyGrantDenialMessage(error, t) ??
        getApiErrorMessage(error, t("Could not rotate the API key"));
      toast.error(message, {
        id: "api-key-rotate",
      });
    },
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      toast.success(t("API key revoked"), { id: "api-key-revoke" });
      return qc.invalidateQueries({ queryKey: apiKeyKeys.list() });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, t("Could not revoke the API key")), {
        id: "api-key-revoke",
      });
    },
  });
}
