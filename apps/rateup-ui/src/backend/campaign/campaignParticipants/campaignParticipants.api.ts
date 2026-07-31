import type { ColumnFilterState, RequestPayload, SortState } from "@/types/api.ts";
import type { CampaignParticipantStatus } from "@/types/enums.ts";

/** A campaign participant row, with the contact the campaign targets. */
export interface CampaignParticipant {
  id: string;
  createdAt: string;
  status: CampaignParticipantStatus;
  sentAt?: string | null;
  respondedAt?: string | null;
  source?: string;
  errorMessage?: string | null;
  campaignId: string;
  contactId: string;
  contact?: ContactsData;
}

import { axiosClient } from "../../apiClient";

type CampaignPayload = { data: RequestPayload; campaignId: string };

export const addContactParticipants = async ({ data, campaignId }: CampaignPayload) => {
  const res = await axiosClient.post(`/campaign/${campaignId}/participants/contacts`, data);
  return res;
};

export const addGroupParticipants = async ({ data, campaignId }: CampaignPayload) => {
  const res = await axiosClient.post(`/campaign/${campaignId}/participants/groups`, data);
  return res;
};

export const getCampaignParticipants = async (
  campaignId: string,
  pagination: {
    pageIndex: number;
    pageSize: number;
  },
  search: string,
  /**
   * The campaign page passes the whole TanStack sorting array here rather than
   * a single entry; in that shape there is no `desc` flag to read and the
   * request falls back to ascending, which is the behaviour today.
   */
  sort: SortState | SortState[],
  columnFilters: ColumnFilterState[],
  selectedDripStage?: string,
) => {
  const filter = columnFilters.map((data) => `&${data.id}=${data.value}`).join("&");
  const desc = !Array.isArray(sort) && sort.desc ? "desc" : "asc";
  const url = `/campaign/${campaignId}/participants?page=${pagination.pageIndex}&limit=${pagination.pageSize}&search=${search}&desc=${desc}${filter}${selectedDripStage ? `&selectedDripStage=${selectedDripStage}` : ""}`;
  const res = await axiosClient.get(url);
  return res?.data as {
    participants: CampaignParticipant[];
    searchCount: number;
    totalCount: number;
  };
};

export const addCampaignParticipants = async ({ data, campaignId }: CampaignPayload) => {
  const res = await axiosClient.post(`/campaign/${campaignId}/participants/`, data);
  return res;
};

export const deleteCampaignParticipant = async ({
  participantId,
  campaignId,
}: {
  participantId: string;
  campaignId: string;
}) => {
  const res = await axiosClient.delete(`/campaign/${campaignId}/participants/${participantId}`);
  return res;
};
export const deleteMulitpleGroupParticipants = async ({
  data,
  campaignId,
}: {
  data: string[];
  campaignId: string;
}) => {
  const res = await axiosClient.delete(`/campaign/${campaignId}/participants/multiple-delete`, {
    data: { ids: data },
  });
  return res?.data;
};
