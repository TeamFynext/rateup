import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { ColumnFilterState, PaginationState } from "@/types/api.ts";

import {
  addCampaignParticipants,
  addContactParticipants,
  addGroupParticipants,
  deleteCampaignParticipant,
  deleteMulitpleGroupParticipants,
  getCampaignParticipants,
} from "./campaignParticipants.api";

export const useAddContactParticipantMutation = (campaignId: string) => {
  const queryClient = useQueryClient();
  const { t: translations } = useTranslation();
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

export const useAddGroupParticipantMutation = (campaignId: string) => {
  const queryClient = useQueryClient();
  const { t: translations } = useTranslation();
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
  campaignId: string,
  pagination: PaginationState,
  search: string,
  sort: { id: string; desc: string },
  columnFilters: ColumnFilterState[],
  selectedDripStage?: string,
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
  campaignId: string,
  onSuccess: () => void = () => {},
) => {
  const queryClient = useQueryClient();
  const { t: translations } = useTranslation();
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
  const { t: translations } = useTranslation();
  return useMutation({
    mutationFn: deleteCampaignParticipant,
    onSuccess() {
      toast.success(translations("Participants removed from campaign successfully."), {
        id: "campaign-participants-remove",
      });
      queryClient.invalidateQueries({
        queryKey: ["campaignParticipants", campaignId],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns"],
      });
    },
    onError(error) {
      toast.error(error?.message || `Error removing participants from campaign`, {
        id: "campaign-participants-remove",
      });
    },
  });
};

export const useRemoveMulitpleGroupParticipants = (campaignId: string, onSucess: () => void) => {
  const queryClient = useQueryClient();
  const { t: translations } = useTranslation();
  return useMutation({
    mutationFn: deleteMulitpleGroupParticipants,
    onSuccess() {
      toast.success(translations("Participants removed from campaign successfully."));
      queryClient.invalidateQueries({
        queryKey: ["campaignParticipants", campaignId],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns"],
      });
      onSucess();
    },
    onError(error) {
      toast.error(error?.message || `Error removing participants from campaign`, {
        id: "campaign-mulitiple-participants-remove",
      });
    },
  });
};
