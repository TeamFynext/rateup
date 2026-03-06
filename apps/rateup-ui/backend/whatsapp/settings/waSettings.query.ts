import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { showErrorToastFromError } from "../../../utils/query";
import {
  createWaSettings,
  deleteWaSettings,
  deRegisterBusinessClient,
  fbPageQuery,
  getMetaAssets,
  getWaLogs,
  getWaSettings,
  registerBusinessClient,
  subscribeFieldtoPage,
  syncAdAccounts,
  syncAdsByAdAccount,
  syncFbPages,
  syncLeadgenFormQuestions,
  syncMetaLeadgenForms,
  updateUserAccessToken,
  updateWaSettingsById,
  UpdateWaSettingsInput,
  upsertWaSettings,
  WaSettings,
} from "./waSettings.api";

export const useWaSettings = (enabled = true) =>
  useQuery({
    queryKey: ["waSettings"],
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
      queryClient.invalidateQueries({ queryKey: ["waSettings"] });
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
      queryClient.invalidateQueries({ queryKey: ["waSettings"] });
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
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
    mutationFn: (data: { code: string; waSettingId: string }) =>
      updateUserAccessToken(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waSettings"] });
      toast.success("Updated Successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating settings!");
    },
  });

  return updateMutation;
};

export const useUpdateWaSettingsMutation = (settingId) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: (data: UpdateWaSettingsInput) =>
      updateWaSettingsById(settingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waSettings"] });
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
      qc.invalidateQueries({ queryKey: ["waSettings"] });
      toast.success("Deleted Successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error deleting settings!");
    },
  });
};

export const useRegisterBusinessClientMutation = (completionFunction) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: registerBusinessClient,
    onSuccess: () => {
      completionFunction?.();
      qc.invalidateQueries({ queryKey: ["waSettings"] });
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
      qc.invalidateQueries({ queryKey: ["waSettings"] });
    },
    onError: (error) => {
      toast.error(error?.message || "Error deregistering business client!");
    },
  });
};

export const useWaLogs = (pagination, search, sort, columnFilters) =>
  useQuery({
    queryKey: ["waLogs", pagination, search, sort, columnFilters],
    queryFn: () => getWaLogs(pagination, search, sort, columnFilters),
  });

export const useMetaAssets = (waSettingsId: string) =>
  useQuery({
    queryKey: ["metaAssets", waSettingsId],
    queryFn: () => getMetaAssets(waSettingsId),
    enabled: !!waSettingsId,
  });

export const useSyncFbPages = (waSettingsId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncFbPages(waSettingsId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metaAssets", waSettingsId] });
      toast.success("success");
    },
    onError: (error) => {
      toast.error(error?.message || "something went wrong");
    },
  });
};

export const useSyncMetaLeadgenForms = (waSettingsId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: fbPageQuery) => syncMetaLeadgenForms(waSettingsId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metaAssets", waSettingsId] });
      toast.success("success");
    },
    onError: (error) => {
      toast.error(error?.message || "error");
    },
  });
};

export const useSyncLeadgenFormQuestions = (formId, waSettingsId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: fbPageQuery) =>
      syncLeadgenFormQuestions(formId, waSettingsId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metaAssets", waSettingsId] });
      toast.success("success");
    },
    onError: (error) => {
      toast.error(error?.message || "error");
    },
  });
};

export const useSyncAdaccounts = (waSettingsId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncAdAccounts(waSettingsId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metaAssets", waSettingsId] });
      toast.success("success");
    },
    onError: (error) => {
      toast.error(error?.message || "error");
    },
  });
};

export const useSyncAdsByadAccounts = (adAccountId, waSettingsId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncAdsByAdAccount(adAccountId, waSettingsId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metaAssets", waSettingsId] });
      toast.success("success");
    },
    onError: (error) => {
      toast.error(error?.message || "error");
    },
  });
};

export const useSubscribeFieldToPage = (waSettingsId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: fbPageQuery) => subscribeFieldtoPage(waSettingsId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metaAssets", waSettingsId] });
      toast.success("success");
    },
    onError: (error) => {
      toast.error(error?.message || "error");
    },
  });
};
