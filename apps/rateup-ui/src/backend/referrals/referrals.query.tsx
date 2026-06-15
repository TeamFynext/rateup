import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  createReferral,
  deleteReferral,
  getAllReferrals,
  trackVisit,
} from "./referrals.api";

export function useCreateReferralMutation({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { referral_code: string }) => void;
  onError?: (error: any) => void;
} = {}) {
  const { t: translations } = useTranslation();

  return useMutation({
    mutationFn: ({ name, email }: { name: string; email: string }) =>
      createReferral(name, email),
    onSuccess: (data) => {
      toast.success(translations("Referral code created successfully!"));
      if (onSuccess) onSuccess(data);
    },
    onError: (error: any) => {
      console.error("Error creating referral:", error);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create referral code";
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
  onError?: (error: any) => void;
} = {}) {
  const { t: translations } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteReferral(id),
    onSuccess: () => {
      toast.success(translations("Referral deleted successfully!"));
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Error deleting referral:", error);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to delete referral";
      toast.error(translations(msg));
      if (onError) onError(error);
    },
  });
}

export function useAllReferralsQuery() {
  return useQuery({
    queryKey: ["referrals"],
    queryFn: () => getAllReferrals(),
  });
}

export function useTrackVisitMutation({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: (error: any) => void;
} = {}) {
  return useMutation({
    mutationFn: (code: string) => trackVisit(code),
    onSuccess: () => {
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Error tracking visit:", error);
      if (onError) onError(error);
    },
  });
}
