import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import { showErrorToastFromError } from "../../../utils/query";
import {
  createWaSettings,
  deleteWaSettings,
  deRegisterBusinessClient,
  fbPageQuery,
  getContactTags,
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
  updateContactTags,
  upsertWaSettings,
} from "./waSettings.api";

export const useWaSettings = (enabled = true) =>
  useQuery({
    queryKey: ["waSettings"],
    queryFn: getWaSettings,
    enabled,
  });

export const useCreateWaSettingsMutation = () => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createWaSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waSettings"] });
      showSuccessToast("Updated Successfully");
    },
    onError: (e) => {
      showErrorToastFromError(e, "Error updating settings!");
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
      showSuccessToast("Updated Successfully");
    },
    onError: (e) => {
      showErrorToastFromError(e, "Error updating settings!");
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
      showSuccessToast("Deleted Successfully");
    },
    onError: (e) => {
      showErrorToastFromError(e, "Error deleting settings!");
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
    onError: (e) => {
      completionFunction?.();
      showErrorToastFromError(e, "Error registering business client!");
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
    onError: (e) => {
      showErrorToastFromError(e, "Error deregistering business client!");
    },
  });
};

export function useUpdateContactTagsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: { tags: string[] }) => updateContactTags(values),
    onSuccess: () => {
      showSuccessToast(
        "Contact tags updated successfully",
        "c-tags",
        null,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["contactTags"] });
    },
    onError: (error: any) => {
      showErrorToast(error?.response?.data?.message, "c-tags", null, true);
    },
  });
}

export const useGetContactTags = () =>
  useQuery({
    queryKey: ["contactTags"],
    queryFn: getContactTags,
  });

export const useWaLogs = (pagination, search, sort, columnFilters) =>
  useQuery({
    queryKey: ["waLogs", pagination, search, sort, columnFilters],
    queryFn: () => getWaLogs(pagination, search, sort, columnFilters),
  });

export const useMetaAssets = (enabled = true) =>
  useQuery({
    queryKey: ["metaAssets"],
    queryFn: getMetaAssets,
    enabled,
  });

export const useSyncFbPages = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncFbPages,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metaAssets"] });
      showSuccessToast("success");
    },
    onError: () => {
      showErrorToast("error");
    },
  });
};

export const useSyncMetaLeadgenForms = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncMetaLeadgenForms,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metaAssets"] });
      showSuccessToast("success");
    },
    onError: () => {
      showErrorToast("error");
    },
  });
};

export const useSyncLeadgenFormQuestions = (formId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: fbPageQuery) => syncLeadgenFormQuestions(formId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metaAssets"] });
      showSuccessToast("success");
    },
    onError: () => {
      showErrorToast("error");
    },
  });
};

export const useSyncAdaccounts = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncAdAccounts,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metaAssets"] });
      showSuccessToast("success");
    },
    onError: () => {
      showErrorToast("error");
    },
  });
};

export const useSyncAdsByadAccounts = (adAccountId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncAdsByAdAccount(adAccountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metaAssets"] });
      showSuccessToast("success");
    },
    onError: () => {
      showErrorToast("error");
    },
  });
};

export const useSubscribeFieldToPage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: subscribeFieldtoPage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metaAssets"] });
      showSuccessToast("success");
    },
    onError: () => {
      showErrorToast("error");
    },
  });
};
