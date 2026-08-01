import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { loyaltyKeys } from "@/backend/loyalty/loyalty.keys";

import type { LoyaltyProgramInput, LoyaltyProgramUpdateInput } from "./program.api";
import {
  createLoyaltyProgram,
  deleteLoyaltyProgram,
  getLoyaltyProgram,
  resetLoyaltyProgramPoints,
  updateLoyaltyProgram,
} from "./program.api";

/**
 * Hook to fetch the loyalty program
 */
export const useLoyaltyProgram = () =>
  useQuery({
    queryKey: loyaltyKeys.program(),
    queryFn: getLoyaltyProgram,
  });

/**
 * Hook to create a new loyalty program
 */
export const useCreateLoyaltyProgramMutation = (onSuccess?: () => void, onError?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (programData: LoyaltyProgramInput) => createLoyaltyProgram(programData),
    onSuccess: () => {
      toast.success("Loyalty program created successfully");
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.program() });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error creating loyalty program!");
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
      toast.success("Loyalty program updated successfully");
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.program() });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating loyalty program!");
      onError?.();
    },
  });
};

/**
 * Hook to delete a loyalty program
 */
export const useDeleteLoyaltyProgramMutation = (onSuccess?: () => void, onError?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ programId, force = false }: { programId: string; force?: boolean }) =>
      deleteLoyaltyProgram(programId, force),
    onSuccess: () => {
      toast.success("Loyalty program deleted successfully", {
        id: "loyalty-program-delete",
      });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.program() });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error deleting loyalty program!", {
        id: "loyalty-program-delete",
      });
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
      toast.success("Loyalty points reset successfully", {
        id: "loyalty-points-reset",
      });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.program() });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error resetting loyalty points!", {
        id: "loyalty-points-reset",
      });
      onError?.();
    },
  });
};
