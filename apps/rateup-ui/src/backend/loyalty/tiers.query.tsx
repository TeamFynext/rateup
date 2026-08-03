import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { loyaltyKeys } from "@/backend/loyalty/loyalty.keys";

import type { LoyaltyTierInput } from "./tiers.api";
import {
  createLoyaltyTier,
  deleteLoyaltyTier,
  getLoyaltyTiers,
  updateLoyaltyTier,
} from "./tiers.api";

export const useLoyaltyTiers = () =>
  useQuery({
    queryKey: loyaltyKeys.tiers(),
    queryFn: getLoyaltyTiers,
  });

export const useCreateLoyaltyTierMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoyaltyTierInput) => createLoyaltyTier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.tiers() });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(
        error?.message || `${error.message || "Error creating loyalty tier: Unknown error"}`,
      );
    },
  });
};

export const useUpdateLoyaltyTierMutation = (id: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<LoyaltyTierInput>) => updateLoyaltyTier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.tiers() });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || `Error updating loyalty tier: Unknown error`);
    },
  });
};

export const useDeleteLoyaltyTierMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; downgradeCustomers?: boolean }) =>
      deleteLoyaltyTier(input.id, {
        downgradeCustomers: input.downgradeCustomers,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.tiers() });
    },
    onError: (error) => {
      toast.error(error?.message || `Error deleting loyalty tier: Unknown error`);
    },
  });
};
