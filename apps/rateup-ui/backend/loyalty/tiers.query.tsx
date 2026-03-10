"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { LoyaltyTierInput } from "./tiers.api";
import {
  createLoyaltyTier,
  deleteLoyaltyTier,
  getLoyaltyTiers,
  updateLoyaltyTier,
} from "./tiers.api";

export const useLoyaltyTiers = () =>
  useQuery({
    queryKey: ["loyalty-tiers"],
    queryFn: getLoyaltyTiers,
  });

export const useCreateLoyaltyTierMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoyaltyTierInput) => createLoyaltyTier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-tiers"] });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(
        error?.message ||
          `${error.message || "Error creating loyalty tier: Unknown error"}`,
      );
    },
  });
};

export const useUpdateLoyaltyTierMutation = (
  id: string,
  onSuccess?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<LoyaltyTierInput>) =>
      updateLoyaltyTier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-tiers"] });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(
        error?.message || `Error updating loyalty tier: Unknown error`,
      );
    },
  });
};

export const useDeleteLoyaltyTierMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteLoyaltyTier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-tiers"] });
    },
  });
};
