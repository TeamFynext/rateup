import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCampaign,
  deleteCampaign,
  getCampaignById,
  getCampaigns,
  getCampaignsByTeam,
  updateCampaign,
} from "./campaign.api";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";

export const useCampaignData = () => {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: () => getCampaigns(),
  });
};

export const useCampaignDataByTeam = (teamId: string) => {
  return useQuery({
    queryKey: ["campaignsbyTeam", teamId],
    queryFn: () => getCampaignsByTeam(teamId),
  });
};

export const useCreateCampaignMutation = (teamId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaignsbyTeam", teamId] });
      showSuccessToast("Campaign created successfully");
    },
    onError: (error: any) => {
      showErrorToast(
        `Error creating campaign: ${error?.response?.data?.error}`,
      );
    },
  });
};

export const useCampaignById = (campaignId) => {
  return useQuery({
    queryKey: ["campaignById", campaignId],
    queryFn: () => getCampaignById(campaignId),
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
      showSuccessToast("Campaign updated successfully");
    },
    onError: (error: any) => {
      showErrorToast(
        `Error updating campaign: ${error?.response?.data?.error}`,
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
      showSuccessToast("Campaign deleted successfully.");
    },
    onError: (error: any) => {
      showErrorToast(`Error deleting campaign: ${error?.response?.data.error}`);
    },
  });
};
