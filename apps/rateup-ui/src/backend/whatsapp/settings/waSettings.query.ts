import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { userKeys } from "@/backend/user/user.keys";
import { whatsappKeys } from "@/backend/whatsapp/whatsapp.keys";
import type { ColumnFilterState, PaginationState } from "@/types/api.ts";

import type {
  ConversationalAutomation,
  fbPageQuery,
  UpdateWaSettingsInput,
} from "./waSettings.api";
import {
  createWaSettings,
  deleteWaSettings,
  deRegisterBusinessClient,
  getConversationalAutomation,
  getMetaAssets,
  getWaLogs,
  getWaSettings,
  registerBusinessClient,
  subscribeFieldtoPage,
  syncAdAccounts,
  syncAdsByAdAccount,
  syncConversationalAutomation,
  syncDatasets,
  syncFbPages,
  syncLeadgenFormQuestions,
  syncMetaLeadgenForms,
  updateConversationalAutomation,
  updateUserAccessToken,
  updateWaSettingsById,
  upsertWaSettings,
} from "./waSettings.api";

export const useWaSettings = (enabled = true) =>
  useQuery({
    queryKey: whatsappKeys.settings(),
    queryFn: getWaSettings,
    enabled,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });

export const useCreateWaSettingsMutation = () => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createWaSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.settings() });
      toast.success("Updated Successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating settings!");
    },
  });

  return createMutation;
};

export const useUpsertWaSettingsMutation = () => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: upsertWaSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.settings() });
      queryClient.invalidateQueries({ queryKey: userKeys.info() });
      toast.success("Updated Successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating settings!");
    },
  });

  return updateMutation;
};

export const useUpdateUserAccessToken = () => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: (data: { code: string; waSettingId: string }) => updateUserAccessToken(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.settings() });
      toast.success("Updated Successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating settings!");
    },
  });

  return updateMutation;
};

export const useUpdateWaSettingsMutation = (settingId: string) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: (data: UpdateWaSettingsInput) => updateWaSettingsById(settingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.settings() });
      toast.success("Updated Successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating settings!");
    },
  });

  return updateMutation;
};

export const useDeleteWaSettingsMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteWaSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: whatsappKeys.settings() });
      toast.success("Deleted Successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error deleting settings!");
    },
  });
};

export const useRegisterBusinessClientMutation = (completionFunction: () => void) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: registerBusinessClient,
    onSuccess: () => {
      completionFunction?.();
      qc.invalidateQueries({ queryKey: whatsappKeys.settings() });
    },
    onError: (error) => {
      completionFunction?.();
      toast.error(error?.message || "Error registering business client!");
    },
  });
};

export const useDeregisterBusinessClientMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deRegisterBusinessClient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: whatsappKeys.settings() });
    },
    onError: (error) => {
      toast.error(error?.message || "Error deregistering business client!");
    },
  });
};

export const useWaLogs = (
  pagination: PaginationState,
  search: string,
  sort: { id: string; desc: string },
  columnFilters: ColumnFilterState[],
) =>
  useQuery({
    queryKey: ["waLogs", pagination, search, sort, columnFilters],
    queryFn: () => getWaLogs(pagination, search, sort, columnFilters),
  });

export const useMetaAssets = (waSettingsId: string) =>
  useQuery({
    queryKey: whatsappKeys.metaAssets(waSettingsId),
    queryFn: () => getMetaAssets(waSettingsId),
    enabled: !!waSettingsId,
  });

export const useSyncFbPages = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncFbPages(waSettingsId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: whatsappKeys.metaAssets(waSettingsId) });
      toast.success("success");
    },
    onError: (error) => {
      toast.error(error?.message || "something went wrong");
    },
  });
};

export const useSyncMetaLeadgenForms = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: fbPageQuery) => syncMetaLeadgenForms(waSettingsId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: whatsappKeys.metaAssets(waSettingsId) });
      toast.success("success");
    },
    onError: (error) => {
      toast.error(error?.message || "error");
    },
  });
};

export const useSyncLeadgenFormQuestions = (
  formId: string | undefined,
  waSettingsId: string | null,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: fbPageQuery) => syncLeadgenFormQuestions(formId, waSettingsId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: whatsappKeys.metaAssets(waSettingsId) });
      toast.success("success");
    },
    onError: (error) => {
      toast.error(error?.message || "error");
    },
  });
};

export const useSyncAdaccounts = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncAdAccounts(waSettingsId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: whatsappKeys.metaAssets(waSettingsId) });
      toast.success("success");
    },
    onError: (error) => {
      toast.error(error?.message || "error");
    },
  });
};

export const useSyncAdsByadAccounts = (adAccountId: string, waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncAdsByAdAccount(adAccountId, waSettingsId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: whatsappKeys.metaAssets(waSettingsId) });
      toast.success("success");
    },
    onError: (error) => {
      toast.error(error?.message || "error");
    },
  });
};

export const useSubscribeFieldToPage = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: fbPageQuery) => subscribeFieldtoPage(waSettingsId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: whatsappKeys.metaAssets(waSettingsId) });
      toast.success("success");
    },
    onError: (error) => {
      toast.error(error?.message || "error");
    },
  });
};

export const useConversationalAutomation = (phoneId: string) =>
  useQuery({
    queryKey: ["conversationalAutomation", phoneId],
    queryFn: () => getConversationalAutomation(phoneId),
    enabled: !!phoneId,
  });

export const useUpdateConversationalAutomation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { phoneId: string; data: Partial<ConversationalAutomation> }) =>
      updateConversationalAutomation(params),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["conversationalAutomation", variables.phoneId],
      });
      toast.success("Conversational components updated");
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating conversational components");
    },
  });
};

export const useSyncConversationalAutomation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (phoneId: string) => syncConversationalAutomation(phoneId),
    onSuccess: (_data, phoneId) => {
      qc.invalidateQueries({
        queryKey: ["conversationalAutomation", phoneId],
      });
      toast.success("Synced from Meta successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error syncing from Meta");
    },
  });
};

export const useSyncDatasetsMutation = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncDatasets(waSettingsId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: whatsappKeys.metaAssets(waSettingsId) });
      qc.invalidateQueries({ queryKey: whatsappKeys.settings() });
      toast.success("Successfully synced datasets");
    },
    onError: (error) => {
      toast.error(error?.message || "Error syncing datasets");
    },
  });
};
