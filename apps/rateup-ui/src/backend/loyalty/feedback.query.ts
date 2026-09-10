import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/utils/apiError";

import {
  getFeedbackDrafts,
  getFeedbackRequests,
  getFeedbackResults,
  getFeedbackState,
  resetFeedback,
  setupFeedback,
  submitFeedbackFlow,
  updateFeedbackSettings,
  type FeedbackPeriod,
  type FeedbackRequestsQuery,
  type FeedbackSettingsPatch,
  type FeedbackSetupPayload,
  type FeedbackState,
} from "./feedback.api.ts";
import { loyaltyKeys } from "./loyalty.keys.ts";

/**
 * The WhatsApp → Flow list and the flow editor read the same rows under their own inline
 * keys (`flow.query.ts`), so anything that creates, publishes or removes the feedback flow
 * refreshes them too.
 */
const FLOW_KEY_ROOT = ["flow"] as const;

/** The catalogue never changes between deploys, so it does not need refetching. */
export const useFeedbackDrafts = () =>
  useQuery({
    queryKey: loyaltyKeys.feedbackDrafts(),
    queryFn: getFeedbackDrafts,
    staleTime: Infinity,
  });

export const useLoyaltyFeedback = (enabled = true) =>
  useQuery({
    queryKey: loyaltyKeys.feedback(),
    queryFn: getFeedbackState,
    enabled,
    // Read by the sidebar as well as the page; a short stale window keeps that from
    // becoming a request per click.
    staleTime: 30_000,
  });

export const useFeedbackResults = (period: FeedbackPeriod, tz?: string) =>
  useQuery({
    queryKey: loyaltyKeys.feedbackResults(period, tz),
    queryFn: () => getFeedbackResults(period, tz),
  });

export const useFeedbackRequests = (query: FeedbackRequestsQuery) =>
  useQuery({
    queryKey: loyaltyKeys.feedbackRequests(query),
    queryFn: () => getFeedbackRequests(query),
    placeholderData: keepPreviousData,
  });

function useApplyFeedbackState() {
  const queryClient = useQueryClient();
  return (state: FeedbackState) => {
    queryClient.setQueryData(loyaltyKeys.feedback(), state);
    queryClient.invalidateQueries({ queryKey: loyaltyKeys.feedback() });
  };
}

export const useSetupFeedbackMutation = (onSuccess?: (state: FeedbackState) => void) => {
  const queryClient = useQueryClient();
  const apply = useApplyFeedbackState();
  return useMutation({
    mutationFn: (payload: FeedbackSetupPayload) => setupFeedback(payload),
    onSuccess: (state) => {
      apply(state);
      queryClient.invalidateQueries({ queryKey: FLOW_KEY_ROOT });
      toast.success("Feedback flow created as a draft");
      onSuccess?.(state);
    },
    onError: (error) => {
      // 409: another tab finished setup first — show what exists rather than the error.
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.feedback() });
      toast.error(getApiErrorMessage(error, "Could not create the feedback flow"));
    },
  });
};

export const useUpdateFeedbackSettingsMutation = (onSuccess?: (state: FeedbackState) => void) => {
  const apply = useApplyFeedbackState();
  return useMutation({
    mutationFn: (patch: FeedbackSettingsPatch) => updateFeedbackSettings(patch),
    onSuccess: (state) => {
      apply(state);
      toast.success("Feedback settings saved");
      onSuccess?.(state);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not save the feedback settings"));
    },
  });
};

export const useSubmitFeedbackFlowMutation = (onSuccess?: (state: FeedbackState) => void) => {
  const queryClient = useQueryClient();
  const apply = useApplyFeedbackState();
  return useMutation({
    mutationFn: submitFeedbackFlow,
    onSuccess: (state) => {
      apply(state);
      queryClient.invalidateQueries({ queryKey: FLOW_KEY_ROOT });
      toast.success("Flow submitted to Meta");
      onSuccess?.(state);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not submit the flow to Meta"));
    },
  });
};

export const useResetFeedbackMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resetFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.feedback() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.feedbackResults() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.feedbackRequests() });
      queryClient.invalidateQueries({ queryKey: FLOW_KEY_ROOT });
      toast.success("Feedback reset — pick a draft to start again");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not reset feedback"));
    },
  });
};
