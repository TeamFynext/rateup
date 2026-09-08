import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { campaignKeys } from "@/backend/campaign/campaign.keys";
import { contactKeys } from "@/backend/campaign/contacts/contacts.keys";
import type { ColumnFilterState, PaginationState, SortState } from "@/types/api.ts";

import {
  addCampaignParticipants,
  addContactParticipants,
  addGroupParticipants,
  deleteCampaignParticipant,
  deleteMulitpleGroupParticipants,
  getCampaignParticipants,
} from "./campaignParticipants.api";

/**
 * Participant ids per bulk delete.
 *
 * The endpoint takes an id array, and a campaign can hold tens of thousands —
 * one request carrying all of them is a body no proxy should have to take, so
 * they go in batches.
 */
const CLEAR_BATCH_SIZE = 500;

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
        queryKey: campaignKeys.all(),
      });
      // The campaign row carries campaignParticipantsCount, and the wizard reads
      // it to decide whether Audience is done. `campaignKeys.all()` is the list
      // key ["campaigns"] — it does not cover ["campaignById", id], so without
      // this the count stayed stale and the step never ticked.
      queryClient.invalidateQueries({ queryKey: campaignKeys.byId(campaignId) });
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
        queryKey: campaignKeys.all(),
      });
      // The campaign row carries campaignParticipantsCount, and the wizard reads
      // it to decide whether Audience is done. `campaignKeys.all()` is the list
      // key ["campaigns"] — it does not cover ["campaignById", id], so without
      // this the count stayed stale and the step never ticked.
      queryClient.invalidateQueries({ queryKey: campaignKeys.byId(campaignId) });
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
  sort: SortState | SortState[],
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
  /**
   * Suppresses the success toast. Enrolling recipients is how the wizard's
   * Audience step advances, so the toast fired on Next and covered the button
   * that had just been pressed. Failures still toast.
   */
  options: { silent?: boolean } = {},
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
        queryKey: campaignKeys.all(),
      });
      // The campaign row carries campaignParticipantsCount, and the wizard reads
      // it to decide whether Audience is done. `campaignKeys.all()` is the list
      // key ["campaigns"] — it does not cover ["campaignById", id], so without
      // this the count stayed stale and the step never ticked.
      queryClient.invalidateQueries({ queryKey: campaignKeys.byId(campaignId) });
      // The available list greys out contacts already on this campaign, and it
      // reads that off the contact rows — so it goes stale the moment enrolment
      // changes.
      queryClient.invalidateQueries({ queryKey: contactKeys.all() });
      if (!options.silent) {
        toast.success(translations("Campaign particiants added successfully."));
      }
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
        queryKey: campaignKeys.all(),
      });
      // The campaign row carries campaignParticipantsCount, and the wizard reads
      // it to decide whether Audience is done. `campaignKeys.all()` is the list
      // key ["campaigns"] — it does not cover ["campaignById", id], so without
      // this the count stayed stale and the step never ticked.
      queryClient.invalidateQueries({ queryKey: campaignKeys.byId(campaignId) });
      queryClient.invalidateQueries({ queryKey: contactKeys.all() });
    },
    onError(error) {
      toast.error(error?.message || `Error removing participants from campaign`, {
        id: "campaign-participants-remove",
      });
    },
  });
};

/**
 * Take everyone off a campaign.
 *
 * There is no "delete every participant" endpoint — the ones that exist are by
 * id — so this reads the campaign's participants and deletes them in batches.
 * Sequential rather than parallel: this is a destructive sweep, and a failure
 * halfway should stop rather than race the rest through.
 */
export const useClearCampaignParticipants = (campaignId: string) => {
  const queryClient = useQueryClient();
  const { t: translations } = useTranslation();
  return useMutation({
    mutationFn: async () => {
      const first = await getCampaignParticipants(
        campaignId,
        { pageIndex: 0, pageSize: 1 },
        "",
        [],
        [],
      );
      const total = first?.totalCount ?? 0;
      if (total === 0) return 0;

      const all = await getCampaignParticipants(
        campaignId,
        { pageIndex: 0, pageSize: total },
        "",
        [],
        [],
      );
      const ids = (all?.participants ?? []).map((participant) => participant.id);
      for (let start = 0; start < ids.length; start += CLEAR_BATCH_SIZE) {
        await deleteMulitpleGroupParticipants({
          data: ids.slice(start, start + CLEAR_BATCH_SIZE),
          campaignId,
        });
      }
      return ids.length;
    },
    onSuccess: () => {
      toast.success(translations("Participants removed from campaign successfully."));
      queryClient.invalidateQueries({ queryKey: ["campaignParticipants", campaignId] });
      queryClient.invalidateQueries({ queryKey: campaignKeys.all() });
      queryClient.invalidateQueries({ queryKey: campaignKeys.byId(campaignId) });
      queryClient.invalidateQueries({ queryKey: contactKeys.all() });
    },
    onError: (error) => {
      toast.error(error?.message || `Error removing participants from campaign`);
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
        queryKey: campaignKeys.all(),
      });
      // The campaign row carries campaignParticipantsCount, and the wizard reads
      // it to decide whether Audience is done. `campaignKeys.all()` is the list
      // key ["campaigns"] — it does not cover ["campaignById", id], so without
      // this the count stayed stale and the step never ticked.
      queryClient.invalidateQueries({ queryKey: campaignKeys.byId(campaignId) });
      onSucess();
    },
    onError(error) {
      toast.error(error?.message || `Error removing participants from campaign`, {
        id: "campaign-mulitiple-participants-remove",
      });
    },
  });
};
