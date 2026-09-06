import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { campaignKeys } from "@/backend/campaign/campaign.keys";
import type { CampaignParticipantStatus } from "@/types/enums.ts";
import { CampaignStatus } from "@/types/enums.ts";
import { getApiErrorData, getApiErrorMessage } from "@/utils/apiError.ts";

import type { CampaignSendParticipantsFilters } from "./campaign.api";
import {
  campaignResponseDownloadById,
  cancelPendingRetries,
  createCampaign,
  deleteCampaign,
  getCampaignAnalytics,
  getCampaignById,
  getCampaignFilterForFlows,
  getCampaigns,
  getCampaignsByTeam,
  getCampaignRetryPolicy,
  getCampaignSendParticipants,
  getCampaignSendPreflight,
  getCampaignSends,
  getCampaignStatsById,
  sendCampaign,
  sendCampaignTest,
  updateCampaign,
  updateCampaignRetryPolicy,
} from "./campaign.api";

export const useCampaignData = (type: string) => {
  return useQuery({
    queryKey: campaignKeys.byType(type),
    queryFn: () => getCampaigns(type),
  });
};

export const useCampaignDataByTeam = (teamId: string, enabled: boolean) => {
  return useQuery({
    queryKey: campaignKeys.byTeam(teamId),
    queryFn: () => getCampaignsByTeam(teamId),
    enabled: enabled,
  });
};

/**
 * What the selected send would cost against the conversation allowance.
 *
 * Read while the send dialog is open so the warning tracks the statuses being picked.
 * Kept fresh rather than cached: the allowance moves as conversations happen, and a stale
 * "45 left" is exactly the number someone would act on.
 */
export const useCampaignSendPreflight = (
  campaignId: string,
  sendToStatuses: CampaignParticipantStatus[],
  enabled: boolean,
) => {
  return useQuery({
    queryKey: campaignKeys.sendPreflight(campaignId, sendToStatuses),
    queryFn: () => getCampaignSendPreflight(campaignId, sendToStatuses),
    enabled: enabled && !!campaignId && sendToStatuses.length > 0,
    staleTime: 0,
  });
};

export const useCreateCampaignMutation = (teamId: string, type: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.byType(type) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.byTeam(teamId) });
      toast.success("Campaign created successfully", {
        id: "campaign-create",
      });
    },
    onError: (error) => {
      if (!(getApiErrorData(error)?.displayMessageInClient ?? false))
        toast.error(error?.message || `Error creating campaign`, {
          id: "campaign-create",
        });
    },
  });
};

/**
 * Statuses a worker is about to move the campaign out of, on its own schedule.
 *
 * QUEUING lasts from the moment the send is accepted until the enqueue worker
 * has fanned it out and set SCHEDULED or ACTIVE; DEQUEUING is the same on the
 * way down. Nothing pushes that transition to the browser, so a campaign
 * launched for later sat on "Sending" until the page was reloaded by hand.
 */
const TRANSIENT_STATUSES: readonly string[] = [CampaignStatus.QUEUING, CampaignStatus.DEQUEUING];

/** How often to look again while a worker still owns the campaign. */
const TRANSIENT_POLL_MS = 3000;

export const useCampaignById = (campaignId: string) => {
  return useQuery({
    queryKey: campaignKeys.byId(campaignId),
    queryFn: () => getCampaignById(campaignId),
    enabled: !!campaignId,
    // Polling only while the status is one a worker is going to change, so a
    // settled campaign costs nothing.
    refetchInterval: (query) =>
      TRANSIENT_STATUSES.includes(query.state.data?.status) ? TRANSIENT_POLL_MS : false,
  });
};

export const useCampaignStatsById = (campaignId: string, selectedDripStage?: string) => {
  return useQuery({
    queryKey: campaignKeys.stats(campaignId, selectedDripStage),
    queryFn: () => getCampaignStatsById(campaignId, selectedDripStage),
    enabled: !!campaignId,
  });
};

export const useUpdateCampaignMutation = (
  campaignId: string,
  teamId: string,
  complete: () => void = () => {},
  type?: string,
  /**
   * Suppresses the success toast. The wizard saves on every step, and six
   * "Campaign updated successfully" toasts while walking through it is noise —
   * it shows a "saved" indicator in its header instead. Failures still toast.
   */
  options: { silent?: boolean } = {},
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCampaign,
    // Returned, not fired and forgotten: `mutateAsync` waits for what `onSuccess`
    // returns, so the campaign is refetched *before* the wizard advances. Without
    // the await the next step mounted against the pre-save cache and its form
    // initialised from stale values — the change was saved, but walking back to
    // the step showed the old ones until the page was reloaded.
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: campaignKeys.byId(campaignId) }),
        queryClient.invalidateQueries({ queryKey: campaignKeys.byType(type) }),
        queryClient.invalidateQueries({ queryKey: campaignKeys.byTeam(teamId) }),
      ]);
      if (!options.silent) {
        toast.success("Campaign updated successfully", {
          id: "campaign-update",
        });
      }
      complete();
    },
    onError: (error) => {
      toast.error(error?.message || `Error updating campaign`, {
        id: "campaign-update",
      });
      complete();
    },
  });
};

export const useDeleteCampaignMutation = (teamId: string, type: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.byTeam(teamId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.byType(type) });
      toast.success("Campaign deleted successfully.", {
        id: "campaign-delete",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error deleting campaign`, {
        id: "campaign-delete",
      });
    },
  });
};
interface sendCampaignProps {
  campaignSentAt?: Date;
  statuses: CampaignParticipantStatus[];
  sentCampaignChoice: string;
  participantId?: string;
  status?: CampaignStatus;
  type?: string;
  /** Max messages dispatched per day. Null/undefined = send to everyone at once. */
  dailySendLimit?: number | null;
}

// Codes whose server-supplied message already describes what was scheduled.
const SCHEDULED_CODES = ["MSG_SCHEDULED", "MSG_SCHEDULE_REQUESTED"];

export const useSendCampaign = (campaignId: string, teamId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      statuses,
      participantId,
      campaignSentAt,
      sentCampaignChoice,
      status,
      type,
      dailySendLimit,
    }: sendCampaignProps) =>
      sendCampaign(
        campaignId,
        statuses,
        sentCampaignChoice,
        participantId,
        campaignSentAt,
        status,
        type,
        dailySendLimit,
      ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.byTeam(teamId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.byId(campaignId) });
      // The list card carries the status too, and a launch is the moment it
      // changes — without this, going back to the list showed the old one.
      queryClient.invalidateQueries({ queryKey: campaignKeys.all() });
      queryClient.invalidateQueries({ queryKey: campaignKeys.statsRoot(campaignId) });
      // A send opens a new CampaignSend, so the attempts table and the funnel
      // are both stale the moment this returns.
      queryClient.invalidateQueries({ queryKey: campaignKeys.sends(campaignId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.analytics(campaignId) });
      toast.success(
        SCHEDULED_CODES.includes(res?.data?.code)
          ? (res?.data?.message ?? "Campaign scheduled successfully")
          : "Campaign started successfully. It may take a few minutes to send to all participants.",
        { id: "campaign-start" },
      );
    },
    onError: (error) => {
      if (!(getApiErrorData(error)?.displayMessageInClient ?? false))
        // The API's own sentence, not axios's "Request failed with status code 403" — a
        // send refused for a spent conversation allowance has to say so.
        toast.error(getApiErrorMessage(error, "Error sending campaign"), {
          id: "campaign-start",
        });
    },
  });
};

export const useCampaignFilterForFlows = (surveyId: string) => {
  return useQuery({
    queryFn: () => getCampaignFilterForFlows(surveyId),
    queryKey: campaignKeys.filterForFlows(surveyId),
    enabled: !!surveyId,
  });
};
export const useCampaignResponseDownloadById = () => {
  return useMutation({
    mutationFn: campaignResponseDownloadById,
    onSuccess: () => {
      // queryClient.invalidateQueries({ queryKey: campaignKeys.byTeam(teamId) });
      // queryClient.invalidateQueries({ queryKey: campaignKeys.all() });
      toast.success("Delivery report generated successfully.", {
        id: "delivery-report",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Error generating delivery report.", {
        id: "delivery-report",
      });
    },
  });
};

// ── Per-attempt analytics ─────────────────────────────────────────────────────

/**
 * One row per send session, newest attempt last.
 *
 * Polled while a send is live: an attempt in RUNNING has counters moving as the
 * queue drains, and a SCHEDULED one is counting down to its fire time.
 */
export const useCampaignSends = (campaignId: string, poll = false) => {
  return useQuery({
    queryKey: campaignKeys.sends(campaignId),
    queryFn: () => getCampaignSends(campaignId),
    enabled: !!campaignId,
    refetchInterval: poll ? 15_000 : false,
  });
};

export const useCampaignAnalytics = (campaignId: string, poll = false) => {
  return useQuery({
    queryKey: campaignKeys.analytics(campaignId),
    queryFn: () => getCampaignAnalytics(campaignId),
    enabled: !!campaignId,
    refetchInterval: poll ? 15_000 : false,
  });
};

/** The drill-down behind one attempt row, or one failure-breakdown row. */
export const useCampaignSendParticipants = (
  campaignId: string,
  sendId: string | null,
  filters: CampaignSendParticipantsFilters = {},
) => {
  return useQuery({
    queryKey: campaignKeys.sendParticipants(campaignId, sendId, filters),
    queryFn: () => getCampaignSendParticipants(campaignId, sendId ?? "", filters),
    enabled: !!campaignId && !!sendId,
  });
};

// ── Automatic retries ─────────────────────────────────────────────────────────

/** Resolves to null when the campaign has no policy — that is "retries off". */
export const useCampaignRetryPolicy = (campaignId: string) => {
  return useQuery({
    queryKey: campaignKeys.retryPolicy(campaignId),
    queryFn: () => getCampaignRetryPolicy(campaignId),
    enabled: !!campaignId,
  });
};

export const useUpdateCampaignRetryPolicyMutation = (campaignId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCampaignRetryPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.retryPolicy(campaignId) });
      toast.success("Retry settings saved", { id: "campaign-retry-policy" });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not save the retry settings"), {
        id: "campaign-retry-policy",
      });
    },
  });
};

export const useCancelPendingRetriesMutation = (campaignId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelPendingRetries(campaignId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.sends(campaignId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.analytics(campaignId) });
      // The API's own sentence: it knows whether anything was actually pending.
      toast.success(result.message, { id: "campaign-retries-cancel" });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not cancel the pending retries"), {
        id: "campaign-retries-cancel",
      });
    },
  });
};

/**
 * Send the campaign's template to one number before committing to the real send.
 *
 * No cache to invalidate: a test deliberately leaves no trace on the campaign.
 */
export const useSendCampaignTestMutation = () => {
  return useMutation({
    mutationFn: sendCampaignTest,
    onSuccess: (result) => {
      toast.success(result.message, { id: "campaign-test-send" });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not send the test message"), {
        id: "campaign-test-send",
      });
    },
  });
};
