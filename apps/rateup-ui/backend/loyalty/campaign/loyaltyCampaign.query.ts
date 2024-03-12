import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCampaign,
  deleteCampaign,
  getCampaign,
  getCampaignParticipants,
  getCampaigns,
  getLoyaltyCampaignInsights,
  getLoyaltyInsights,
  getPublicCampaign,
  registerCampaign,
  updateCampaign,
} from "./loyaltyCampaign.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";

export const useCampaigns = (enabled: boolean) =>
  useQuery({
    queryKey: ["lcampaign"],
    queryFn: getCampaigns,
    enabled,
  });

export const useCampaign = (campaignId: string) =>
  useQuery({
    queryKey: ["lcampaign", campaignId],
    queryFn: () => getCampaign(campaignId),
    enabled: !!campaignId,
  });
export const usePublicCampaign = (campaignId: string) =>
  useQuery({
    queryKey: ["lcampaign", campaignId, "public"],
    queryFn: () => getPublicCampaign(campaignId),
    enabled: !!campaignId,
  });

export const useCreateCampaignMutation = () => {
  const qc = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lcampaigns"] });
      showSuccessToast("Campaign created successfully");
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ["lcampaigns"] });
      showErrorToast("Error creating campaign");
    },
  });
  return createMutation;
};

export const useUpdateCampaignMutation = (campaignId: string) => {
  const qc = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: (data: Partial<LoyaltyCampaign>) =>
      updateCampaign(campaignId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lcampaign", campaignId] });
      showSuccessToast("Campaign updated successfully");
    },
    onError: () => {
      showErrorToast("Error updating campaign");
    },
  });
  return updateMutation;
};

export const useDeleteCampaignMutation = () => {
  const qc = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lcampaigns"] });
      showSuccessToast("Campaign deleted successfully");
    },
    onError: () => {
      showErrorToast("Error deleting campaign");
    },
  });
  return deleteMutation;
};

export const useRegisterCampaignMutation = () => {
  return useMutation({
    mutationFn: registerCampaign,
  });
};

export const useCampaignParticipants = (campaignId: string) =>
  useQuery({
    queryFn: () => getCampaignParticipants(campaignId),
    queryKey: ["lcampaign", campaignId, "participants"],
    enabled: !!campaignId,
  });

export const useLoyaltyCampaignInsights = (campaignId: string) =>
  useQuery({
    queryFn: () => getLoyaltyCampaignInsights(campaignId),
    queryKey: ["lcampaign", campaignId, "insights"],
    enabled: !!campaignId,
  });

export const useLoyaltyInsights = () =>
  useQuery({
    queryFn: getLoyaltyInsights,
    queryKey: ["lcampaign", "insights"],
  });
