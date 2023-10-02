import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createWaSettings, getWaSettings, upsertWaSettings } from "./waSettings.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";

export const useWaSettings = () => useQuery({
  queryKey: ['waSettings'],
  queryFn: getWaSettings
})

export const useCreateWaSettingsMutation = (onSuccess?, onError?) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createWaSettings,
    onSuccess: () => {
      queryClient.invalidateQueries(["waSettings"])
      showSuccessToast("Updated Successfully")
      onSuccess?.()
    },
    onError: () => {
      onError?.()
      showErrorToast("Error updating settings!")
    }
  })

  return createMutation
}

export const useUpsertWaSettingsMutation = (onSuccess?, onError?) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: upsertWaSettings,
    onSuccess: () => {
      queryClient.invalidateQueries(["waSettings"])
      showSuccessToast("Updated Successfully")
      onSuccess?.()
    },
    onError: () => {
      onError?.()
      showErrorToast("Error updating settings!")
    }
  })

  return updateMutation
}