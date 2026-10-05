import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { referralKeys } from "@/backend/campaign/campaign.keys";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { createReferral, deleteReferral, getAllReferrals } from "./referrals.api";

export function useCreateReferralMutation({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { referral_code: string }) => void;
  onError?: (error: Error) => void;
} = {}) {
  const { t: translations } = useTranslation();

  return useMutation({
    mutationFn: ({ name, email }: { name: string; email: string }) => createReferral(name, email),
    onSuccess: (data) => {
      toast.success(translations("Referral code created successfully!"));
      if (onSuccess) onSuccess(data);
    },
    onError: (error) => {
      console.error("Error creating referral:", error);
      const msg = getApiErrorMessage(error, "Failed to create referral code");
      toast.error(translations(msg));
      if (onError) onError(error);
    },
  });
}

export function useDeleteReferralMutation({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
} = {}) {
  const { t: translations } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteReferral(id),
    onSuccess: () => {
      toast.success(translations("Referral deleted successfully!"));
      queryClient.invalidateQueries({ queryKey: referralKeys.all() });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      console.error("Error deleting referral:", error);
      const msg = getApiErrorMessage(error, "Failed to delete referral");
      toast.error(translations(msg));
      if (onError) onError(error);
    },
  });
}

export function useAllReferralsQuery() {
  return useQuery({
    queryKey: referralKeys.all(),
    queryFn: () => getAllReferrals(),
  });
}
