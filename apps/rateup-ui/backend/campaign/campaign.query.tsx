import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCampaign,
  deleteCampaign,
  getCampaignById,
  getCampaigns,
  getCampaignsByTeam,
  startCampaign,
  updateCampaign,
} from "./campaign.api";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";

export const useCampaignData = () => {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: () => getCampaigns(),
  });
};

export const useCampaignDataByTeam = (teamId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ["campaignsbyTeam", teamId],
    queryFn: () => getCampaignsByTeam(teamId),
    enabled: enabled,
  });
};

export const useCreateCampaignMutation = (teamId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaignsbyTeam", teamId] });
      showSuccessToast(
        "Campaign created successfully",
        "campaign-create",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error creating campaign: ${error?.response?.data?.error}`,
        "campaign-create",
        <IconX />,
      );
    },
  });
};

export const useCampaignById = (campaignId) => {
  return useQuery({
    queryKey: ["campaignById", campaignId],
    queryFn: () => getCampaignById(campaignId),
    enabled: !!campaignId,
  });
};

export const useUpdateCampaignMutation = (campaignId, teamId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignById", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaignsbyTeam", teamId] });
      showSuccessToast(
        "Campaign updated successfully",
        "campaign-update",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error updating campaign: ${error?.response?.data?.error}`,
        "campaign-delete",
        <IconX />,
      );
    },
  });
};

export const useDeleteCampaignMutation = (teamId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignsbyTeam", teamId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      showSuccessToast(
        "Campaign deleted successfully.",
        "campaign-delete",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error deleting campaign: ${error?.response?.data.error}`,
        "campaign-delete",
        <IconX />,
      );
    },
  });
};

export const useStartCampaign = (campaignId, teamId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignsbyTeam", teamId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaignById", campaignId] });
      showSuccessToast(
        "Campaign Started successfully.",
        "campaign-start",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error starting campaign: ${error?.response?.data.error}`,
        "campaign-start",
        <IconX />,
      );
    },
  });
};
