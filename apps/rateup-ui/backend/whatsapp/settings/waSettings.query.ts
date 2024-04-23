import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWaSettings,
  deRegisterBusinessClient,
  deleteWaSettings,
  getContactTags,
  getWaSettings,
  registerBusinessClient,
  updateContactTags,
  upsertWaSettings,
} from "./waSettings.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";

export const useWaSettings = (enabled = true) =>
  useQuery({
    queryKey: ["waSettings"],
    queryFn: getWaSettings,
    enabled,
  });

export const useCreateWaSettingsMutation = (onSuccess?, onError?) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createWaSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waSettings"] });
      showSuccessToast("Updated Successfully");
      onSuccess?.();
    },
    onError: () => {
      onError?.();
      showErrorToast("Error updating settings!");
    },
  });

  return createMutation;
};

export const useUpsertWaSettingsMutation = (onSuccess?, onError?) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: upsertWaSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waSettings"] });
      showSuccessToast("Updated Successfully");
      onSuccess?.();
    },
    onError: () => {
      onError?.();
      showErrorToast("Error updating settings!");
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
    },
  });
};

export const useRegisterBusinessClientMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: registerBusinessClient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waSettings"] });
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
  });
};

export function useUpdateContactTagsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: { tags: string[] }) => updateContactTags(values),
    onSuccess: () => {
      showSuccessToast("Contact tags updated successfully");
      queryClient.invalidateQueries({ queryKey: ["campaignContactsData"] });
    },
    onError: (error: any) => {
      showErrorToast(error?.response?.data?.message);
    },
  });
}

export const useGetContactTags = () =>
  useQuery({
    queryKey: ["contactTags"],
    queryFn: getContactTags,
  });
