import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWaSettings,
  deRegisterBusinessClient,
  getWaSettings,
  registerBusinessClient,
  upsertWaSettings,
} from "./waSettings.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";

export const useWaSettings = () =>
  useQuery({
    queryKey: ["waSettings"],
    queryFn: getWaSettings,
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
