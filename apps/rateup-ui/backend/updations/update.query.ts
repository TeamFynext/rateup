//For New Migrations and Updations

import { useMutation } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import { updateUsageStats } from "./update.api";

export const useUpdateUsageStats = () => {
  return useMutation({
    mutationFn: updateUsageStats,
    onSuccess: () => {
      showSuccessToast("Update Success");
    },
    onError: () => {
      showErrorToast("Update Error");
    },
  });
};
