import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "../../utils";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import {
  createLoyaltyTier,
  deleteLoyaltyTier,
  getLoyaltyTierById,
  getLoyaltyTiers,
  LoyaltyTierInput,
  LoyaltyTierUpdateInput,
  updateLoyaltyTier,
} from "./tier.api";

/**
 * Hook to fetch all loyalty tiers
 */
export const useLoyaltyTiers = () =>
  useQuery({
    queryKey: ["loyalty-tiers"],
    queryFn: getLoyaltyTiers,
  });

/**
 * Hook to fetch a single loyalty tier by ID
 */
export const useLoyaltyTierById = (tierId: string) =>
  useQuery({
    enabled: !!tierId,
    queryKey: ["loyalty-tier", tierId],
    queryFn: () => getLoyaltyTierById(tierId),
  });

/**
 * Hook to create a new loyalty tier
 */
export const useCreateLoyaltyTierMutation = (
  onSuccess?: () => void,
  onError?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tierData: LoyaltyTierInput) => createLoyaltyTier(tierData),
    onSuccess: () => {
      showSuccessToast("Loyalty tier created successfully");
      queryClient.invalidateQueries({ queryKey: ["loyalty-tiers"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      showErrorToast(
        getErrorMessage(error?.response, "Error creating loyalty tier!"),
      );
      onError?.();
    },
  });
};

/**
 * Hook to update an existing loyalty tier
 */
export const useUpdateLoyaltyTierMutation = (
  tierId: string,
  onSuccess?: () => void,
  onError?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tierData: LoyaltyTierUpdateInput) =>
      updateLoyaltyTier(tierId, tierData),
    onSuccess: () => {
      showSuccessToast("Loyalty tier updated successfully");
      queryClient.invalidateQueries({ queryKey: ["loyalty-tiers"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty-tier", tierId] });
      onSuccess?.();
    },
    onError: (error: any) => {
      showErrorToast(
        getErrorMessage(error?.response, "Error updating loyalty tier!"),
      );
      onError?.();
    },
  });
};

/**
 * Hook to delete a loyalty tier
 */
export const useDeleteLoyaltyTierMutation = (
  onSuccess?: () => void,
  onError?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tierId: string) => deleteLoyaltyTier(tierId),
    onSuccess: () => {
      showSuccessToast(
        "Loyalty tier deleted successfully",
        "loyalty-tier-delete",
        null,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["loyalty-tiers"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      showErrorToast(
        getErrorMessage(error?.response, "Error deleting loyalty tier!"),
        "loyalty-tier-delete",
        null,
        true,
      );
      onError?.();
    },
  });
};
