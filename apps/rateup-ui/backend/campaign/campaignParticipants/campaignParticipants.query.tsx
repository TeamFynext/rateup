import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useExtracted } from "next-intl";
import { toast } from "sonner";

import {
  addCampaignParticipants,
  addContactParticipants,
  addGroupParticipants,
  deleteCampaignParticipant,
  deleteMulitpleGroupParticipants,
  getCampaignParticipants,
} from "./campaignParticipants.api";

export const useAddContactParticipantMutation = (campaignId) => {
  const queryClient = useQueryClient();
  const translations = useExtracted();
  return useMutation({
    mutationFn: addContactParticipants,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaignParticipants", campaignId],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns"],
      });
      toast.success(translations("Added participants successfully."));
    },
    onError: (error) => {
      toast.error(error?.message || `Error adding participants`);
    },
  });
};

export const useAddGroupParticipantMutation = (campaignId) => {
  const queryClient = useQueryClient();
  const translations = useExtracted();
  return useMutation({
    mutationFn: addGroupParticipants,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaignParticipants", campaignId],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns"],
      });
      toast.success(translations("Added group participants successfully."));
    },
    onError: (error) => {
      toast.error(error?.message || `Error adding group participants`);
    },
  });
};

export const useCampaignParticipants = (
  campaignId,
  pagination,
  search,
  sort,
  columnFilters,
  selectedDripStage,
) => {
  return useQuery({
    queryKey: [
      "campaignParticipants",
      campaignId,
      pagination,
      search,
      sort,
      columnFilters,
      selectedDripStage,
    ],
    queryFn: () =>
      getCampaignParticipants(
        campaignId,
        pagination,
        search,
        sort,
        columnFilters,
        selectedDripStage,
      ),
    enabled: !!campaignId,
  });
};

export const useAddCampaignParticipants = (
  campaignId,
  onSuccess = () => {},
) => {
  const queryClient = useQueryClient();
  const translations = useExtracted();
  return useMutation({
    mutationFn: addCampaignParticipants,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaignParticipants", campaignId],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns"],
      });
      toast.success(translations("Campaign particiants added successfully."));
      onSuccess();
    },
    onError: (error) => {
      toast.error(error?.message || `Error on adding participants`);
      onSuccess();
    },
  });
};

export const useRemoveCampaignParticipant = (campaignId: string) => {
  const queryClient = useQueryClient();
  const translations = useExtracted();
  return useMutation({
    mutationFn: deleteCampaignParticipant,
    onSuccess() {
      toast.success(
        translations("Participants removed from campaign successfully."),
        { id: "campaign-participants-remove" },
      );
      queryClient.invalidateQueries({
        queryKey: ["campaignParticipants", campaignId],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns"],
      });
    },
    onError(error) {
      toast.error(
        error?.message || `Error removing participants from campaign`,
        { id: "campaign-participants-remove" },
      );
    },
  });
};

export const useRemoveMulitpleGroupParticipants = (
  campaignId: string,
  onSucess: () => void,
) => {
  const queryClient = useQueryClient();
  const translations = useExtracted();
  return useMutation({
    mutationFn: deleteMulitpleGroupParticipants,
    onSuccess() {
      toast.success(
        translations("Participants removed from campaign successfully."),
      );
      queryClient.invalidateQueries({
        queryKey: ["campaignParticipants", campaignId],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns"],
      });
      onSucess();
    },
    onError(error) {
      toast.error(
        error?.message || `Error removing participants from campaign`,
        { id: "campaign-mulitiple-participants-remove" },
      );
    },
  });
};
