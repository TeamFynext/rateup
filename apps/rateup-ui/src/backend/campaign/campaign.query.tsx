import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { campaignKeys } from "@/backend/campaign/campaign.keys";
import type { CampaignParticipantStatus, CampaignStatus } from "@/types/enums.ts";
import { getApiErrorData, getApiErrorMessage } from "@/utils/apiError.ts";

import {
  campaignResponseDownloadById,
  createCampaign,
  deleteCampaign,
  getCampaignById,
  getCampaignFilterForFlows,
  getCampaigns,
  getCampaignsByTeam,
  getCampaignSendPreflight,
  getCampaignStatsById,
  sendCampaign,
  updateCampaign,
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

export const useCampaignById = (campaignId: string) => {
  return useQuery({
    queryKey: ["campaignById", campaignId],
    queryFn: () => getCampaignById(campaignId),
    enabled: !!campaignId,
  });
};

export const useCampaignStatsById = (campaignId: string, selectedDripStage?: string) => {
  return useQuery({
    queryKey: ["campaignStats", campaignId, selectedDripStage],
    queryFn: () => getCampaignStatsById(campaignId, selectedDripStage),
    enabled: !!campaignId,
  });
};

export const useUpdateCampaignMutation = (
  campaignId: string,
  teamId: string,
  complete: () => void = () => {},
  type?: string,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignById", campaignId] });
      queryClient.invalidateQueries({ queryKey: campaignKeys.byType(type) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.byTeam(teamId) });
      toast.success("Campaign updated successfully", {
        id: "campaign-update",
      });
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
      queryClient.invalidateQueries({ queryKey: ["campaignById", campaignId] });
      queryClient.invalidateQueries({
        queryKey: ["campaignStats", campaignId],
      });
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
    queryKey: ["campaignFilterForFlows", surveyId],
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
