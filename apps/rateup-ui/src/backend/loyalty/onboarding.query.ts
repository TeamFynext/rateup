import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/utils/apiError";

import { loyaltyKeys } from "./loyalty.keys";
import {
  activateLoyaltyProgram,
  applyBasicsStep,
  applyEarningStep,
  applyMessagesStep,
  applyRewardsStep,
  applyTiersStep,
  getLoyaltyOnboardingState,
  getLoyaltyPresets,
  type BasicsStepPayload,
  type EarningStepPayload,
  type RewardsStepPayload,
  type TiersStepPayload,
} from "./onboarding.api";

/** The catalogue never changes between deploys, so it does not need refetching. */
export const useLoyaltyPresets = () =>
  useQuery({
    queryKey: loyaltyKeys.onboardingPresets(),
    queryFn: getLoyaltyPresets,
    staleTime: Infinity,
  });

export const useLoyaltyOnboardingState = (enabled = true) =>
  useQuery({
    queryKey: loyaltyKeys.onboardingState(),
    queryFn: getLoyaltyOnboardingState,
    enabled,
    // The loyalty layout route fetches this on every navigation between loyalty pages;
    // a short stale window keeps that from becoming a request per click.
    staleTime: 30_000,
  });

/**
 * Every step writes to the same underlying loyalty tables the normal editors read, so a
 * successful step has to sweep those caches as well as the wizard's own state.
 */
function useStepMutation<TPayload, TResult>(
  mutationFn: (payload: TPayload) => Promise<TResult>,
  affectedKeys: readonly (readonly unknown[])[],
  onSuccess?: (result: TResult) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      // Every step changes what the programme costs, so the Overview's numbers and the
      // server-side giveback are swept along with the wizard's own state.
      for (const queryKey of [
        loyaltyKeys.onboardingState(),
        loyaltyKeys.dashboard(),
        loyaltyKeys.giveback(),
        ...affectedKeys,
      ]) {
        queryClient.invalidateQueries({ queryKey });
      }
      onSuccess?.(result);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Could not save this step"));
    },
  });
}

export const useApplyBasicsStepMutation = (onSuccess?: () => void) =>
  useStepMutation<BasicsStepPayload, unknown>(applyBasicsStep, [loyaltyKeys.program()], onSuccess);

export const useApplyEarningStepMutation = (onSuccess?: () => void) =>
  useStepMutation<EarningStepPayload, unknown>(
    applyEarningStep,
    [loyaltyKeys.earningRules(), loyaltyKeys.program()],
    onSuccess,
  );

export const useApplyTiersStepMutation = (onSuccess?: () => void) =>
  useStepMutation<TiersStepPayload, unknown>(
    applyTiersStep,
    [loyaltyKeys.tiers(), loyaltyKeys.program()],
    onSuccess,
  );

export const useApplyRewardsStepMutation = (onSuccess?: () => void) =>
  useStepMutation<RewardsStepPayload, unknown>(
    applyRewardsStep,
    [loyaltyKeys.rewards(), loyaltyKeys.program()],
    onSuccess,
  );

export const useApplyMessagesStepMutation = (
  onSuccess?: (result: Awaited<ReturnType<typeof applyMessagesStep>>) => void,
) =>
  useStepMutation(applyMessagesStep, [loyaltyKeys.templates(), loyaltyKeys.program()], onSuccess);

export const useActivateLoyaltyProgramMutation = (
  onSuccess?: (result: Awaited<ReturnType<typeof activateLoyaltyProgram>>) => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: activateLoyaltyProgram,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.onboardingState() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.program() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.giveback() });
      toast.success("Your loyalty program is live");
      onSuccess?.(result);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Could not activate the program"));
    },
  });
};
