import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { userKeys } from "@/backend/user/user.keys";
import { whatsappKeys } from "@/backend/whatsapp/whatsapp.keys";
import { getApiErrorMessage } from "@/utils/apiError";

import type {
  ConversationalAutomation,
  fbPageQuery,
  UpdateWaSettingsInput,
} from "./waSettings.api";
import {
  createWaSettings,
  deleteWaSettings,
  deRegisterBusinessClient,
  getBusinessProfile,
  getConversationalAutomation,
  getMetaAssets,
  getWaSettings,
  registerBusinessClient,
  reRegisterPhoneNumber,
  subscribeFieldtoPage,
  syncDisplayName,
  syncAdAccounts,
  syncAdsByAdAccount,
  syncConversationalAutomation,
  syncDatasets,
  syncFbPages,
  syncLeadgenFormQuestions,
  syncMetaLeadgenForms,
  updateBusinessProfile,
  updateConversationalAutomation,
  updateDisplayName,
  updateProfilePicture,
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

/**
 * The number's display name straight from Meta. It is read live and never stored — the
 * channel's own `phoneDisplayName` is an internal label and stays untouched.
 */
export const useDisplayNameStatus = (phoneId: string, enabled = true) =>
  useQuery({
    queryKey: whatsappKeys.displayName(phoneId),
    queryFn: () => syncDisplayName(phoneId),
    enabled: enabled && !!phoneId,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

export const useUpdateDisplayNameMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateDisplayName,
    onSuccess: (data, variables) => {
      qc.setQueryData(whatsappKeys.displayName(variables.phoneId), data);
      toast.success("Display name submitted for review");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error updating display name"));
    },
  });
};

export const useReRegisterPhoneNumberMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reRegisterPhoneNumber,
    onSuccess: (_data, phoneId) => {
      qc.invalidateQueries({ queryKey: whatsappKeys.displayName(phoneId) });
      toast.success("Phone number re-registered");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error re-registering phone number"));
    },
  });
};

export const useBusinessProfile = (phoneId: string, enabled = true) =>
  useQuery({
    queryKey: whatsappKeys.businessProfile(phoneId),
    queryFn: () => getBusinessProfile(phoneId),
    enabled: enabled && !!phoneId,
    retry: false,
  });

export const useUpdateBusinessProfileMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateBusinessProfile,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: whatsappKeys.businessProfile(variables.phoneId) });
      toast.success("Profile updated");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error updating profile"));
    },
  });
};

export const useUpdateProfilePictureMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateProfilePicture,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: whatsappKeys.businessProfile(variables.phoneId) });
      toast.success("Profile photo updated");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error updating profile photo"));
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
