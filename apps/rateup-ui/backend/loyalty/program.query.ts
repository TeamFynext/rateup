import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "../../utils";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import {
  createLoyaltyProgram,
  deleteLoyaltyProgram,
  getLoyaltyProgram,
  LoyaltyProgramInput,
  LoyaltyProgramUpdateInput,
  resetLoyaltyProgramPoints,
  updateLoyaltyProgram,
} from "./program.api";

/**
 * Hook to fetch the loyalty program
 */
export const useLoyaltyProgram = () =>
  useQuery({
    queryKey: ["loyalty-program"],
    queryFn: getLoyaltyProgram,
  });

/**
 * Hook to create a new loyalty program
 */
export const useCreateLoyaltyProgramMutation = (
  onSuccess?: () => void,
  onError?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (programData: LoyaltyProgramInput) =>
      createLoyaltyProgram(programData),
    onSuccess: () => {
      showSuccessToast("Loyalty program created successfully");
      queryClient.invalidateQueries({ queryKey: ["loyalty-program"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      showErrorToast(
        getErrorMessage(error?.response, "Error creating loyalty program!"),
      );
      onError?.();
    },
  });
};

/**
 * Hook to update an existing loyalty program
 */
export const useUpdateLoyaltyProgramMutation = (
  programId: string,
  onSuccess?: () => void,
  onError?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (programData: LoyaltyProgramUpdateInput) =>
      updateLoyaltyProgram(programId, programData),
    onSuccess: () => {
      showSuccessToast("Loyalty program updated successfully");
      queryClient.invalidateQueries({ queryKey: ["loyalty-program"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      showErrorToast(
        getErrorMessage(error?.response, "Error updating loyalty program!"),
      );
      onError?.();
    },
  });
};

/**
 * Hook to delete a loyalty program
 */
export const useDeleteLoyaltyProgramMutation = (
  onSuccess?: () => void,
  onError?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      programId,
      force = false,
    }: {
      programId: string;
      force?: boolean;
    }) => deleteLoyaltyProgram(programId, force),
    onSuccess: () => {
      showSuccessToast(
        "Loyalty program deleted successfully",
        "loyalty-program-delete",
        null,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["loyalty-program"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      showErrorToast(
        getErrorMessage(error?.response, "Error deleting loyalty program!"),
        "loyalty-program-delete",
        null,
        true,
      );
      onError?.();
    },
  });
};

/**
 * Hook to reset loyalty program points
 */
export const useResetLoyaltyProgramPointsMutation = (
  onSuccess?: () => void,
  onError?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (programId: string) => resetLoyaltyProgramPoints(programId),
    onSuccess: () => {
      showSuccessToast(
        "Loyalty points reset successfully",
        "loyalty-points-reset",
        null,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["loyalty-program"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      showErrorToast(
        getErrorMessage(error?.response, "Error resetting loyalty points!"),
        "loyalty-points-reset",
        null,
        true,
      );
      onError?.();
    },
  });
};
