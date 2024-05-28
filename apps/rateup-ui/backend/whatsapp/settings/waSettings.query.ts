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
import { showErrorToastFromError } from "../../../utils/query";

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

export const useRegisterBusinessClientMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: registerBusinessClient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waSettings"] });
    },
    onError: (e) => {
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
