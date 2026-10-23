import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "./client";
import type { IsoDate, Page } from "./types";

export type CustomerChannel = "EMAIL" | "WHATSAPP";
export type MessageStatus = "QUEUED" | "SENT" | "FAILED" | "SKIPPED";
export type StatusCounts = Record<MessageStatus, number>;

export interface DripStep {
  key: string;
  day: number;
  label: string;
  subject: string;
  /** Staff edited the wording; false means it is the catalogue's. */
  customized: boolean;
  hasWhatsapp: boolean;
  whatsappTemplate: string | null;
  /** False for steps with no goal (welcome, check-in): no conversion to show. */
  measurable: boolean;
  enabled: boolean;
  email: StatusCounts;
  whatsapp: StatusCounts;
  orgsReached: number;
  orgsConverted: number;
}

/** An onboarding email's wording; `{name}` and `{org}` are filled per person. */
export interface DripEmail {
  subject: string;
  preview: string;
  title: string;
  body: string;
  /** `path` is a web-app path (/dashboard/…) or a full https link. */
  cta?: { label: string; path: string };
  highlights?: { title: string; description: string; path?: string }[];
  /** A plain-text note from a person: no layout, no button or highlights. */
  plain?: boolean;
}

export interface DripStepDetail {
  key: string;
  day: number;
  label: string;
  enabled: boolean;
  email: DripEmail;
  defaultEmail: DripEmail;
  /** Null: this step sends no WhatsApp. */
  whatsappTemplate: string | null;
  defaultWhatsappTemplate: string | null;
  customized: boolean;
  editedAt: IsoDate | null;
  editedBy: string | null;
}

export interface DripContent {
  email: DripEmail;
  whatsappTemplate: string | null;
}

export interface DripOverview {
  whatsappSender: boolean;
  windowDays: number;
  data: DripStep[];
}

export interface EmailPreview {
  subject: string | null;
  html: string | null;
  text: string | null;
}

export const AUDIENCE_SEGMENTS = {
  whatsapp_not_connected: "WhatsApp not connected",
  no_loyalty: "No loyalty program",
  no_campaign: "Never sent a broadcast",
  inactive_7d: "Quiet for 7 days",
} as const;
export type AudienceSegment = keyof typeof AUDIENCE_SEGMENTS;

export const AUDIENCE_PLANS = {
  any: "Any plan",
  paid: "Paying",
  active: "Active plan",
  expired: "Expired",
  no_plan: "No plan",
} as const;
export type AudiencePlan = keyof typeof AUDIENCE_PLANS;

export interface BroadcastAudience {
  plan: AudiencePlan;
  createdWithinDays?: number;
  segments: AudienceSegment[];
}

export type BroadcastStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "SENT";

export interface BroadcastInput {
  name: string;
  channels: CustomerChannel[];
  audience: BroadcastAudience;
  emailSubject: string | null;
  emailBody: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  waTemplateName: string | null;
  waParams: string[];
}

export interface Broadcast extends BroadcastInput {
  id: string;
  createdAt: IsoDate;
  status: BroadcastStatus;
  scheduledAt: IsoDate | null;
  startedAt: IsoDate | null;
  finishedAt: IsoDate | null;
  createdByEmail: string;
  counts?: { email: StatusCounts; whatsapp: StatusCounts };
}

export interface AudiencePreview {
  orgs: number;
  people: number;
  email: number;
  whatsapp: number;
  sample: { id: string; name: string; createdAt: IsoDate }[];
}

export interface SenderTemplate {
  id: string;
  name: string;
  language: string;
  category: string | null;
  status: string | null;
  body: string;
  variables: number;
  /** Has the "Stop updates" quick reply that opts a person out. */
  stopButton: boolean;
}

export interface CustomerMessage {
  id: string;
  createdAt: IsoDate;
  sentAt: IsoDate | null;
  channel: CustomerChannel;
  source: "DRIP" | "BROADCAST";
  key: string;
  label: string;
  status: MessageStatus;
  skipReason: string | null;
  error: string | null;
  user: { id: string; name: string | null; email: string };
}

export interface TestSendInput {
  channel: CustomerChannel;
  phone?: string;
}

const KEY = ["staff", "engage"] as const;

export const dripQueryOptions = queryOptions({
  queryKey: [...KEY, "drip"],
  queryFn: async () => (await api.get<DripOverview>("/engage/drip")).data,
});

export const dripPreviewQueryOptions = (key: string) =>
  queryOptions({
    queryKey: [...KEY, "drip", key, "preview"],
    queryFn: async () =>
      (await api.get<{ data: EmailPreview }>(`/engage/drip/${key}/preview`)).data.data,
    staleTime: 5 * 60_000,
  });

export const dripStepQueryOptions = (key: string) =>
  queryOptions({
    queryKey: [...KEY, "drip", key],
    queryFn: async () => (await api.get<{ data: DripStepDetail }>(`/engage/drip/${key}`)).data.data,
  });

/** Renders unsaved wording; keyed on the serialised draft so each version is fetched once. */
export const dripDraftPreviewQueryOptions = (key: string, draft: string) =>
  queryOptions({
    queryKey: [...KEY, "drip", key, "draft-preview", draft],
    queryFn: async () =>
      (
        await api.post<{ data: EmailPreview }>(`/engage/drip/${key}/preview`, {
          email: JSON.parse(draft) as DripEmail,
        })
      ).data.data,
    staleTime: Infinity,
    retry: false,
  });

function useDripContentMutation<TInput>(
  key: string,
  call: (input: TInput) => Promise<DripStepDetail>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: (detail) => client.setQueryData(dripStepQueryOptions(key).queryKey, detail),
    onSettled: () => client.invalidateQueries({ queryKey: [...KEY, "drip"] }),
  });
}

export const useSaveDripContent = (key: string) =>
  useDripContentMutation(
    key,
    async (content: DripContent) =>
      (await api.put<{ data: DripStepDetail }>(`/engage/drip/${key}/content`, content)).data.data,
  );

export const useResetDripContent = (key: string) =>
  useDripContentMutation<void>(
    key,
    async () =>
      (await api.delete<{ data: DripStepDetail }>(`/engage/drip/${key}/content`)).data.data,
  );

export function useToggleDripStep() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) =>
      (await api.put(`/engage/drip/${key}`, { enabled })).data,
    onSettled: () => client.invalidateQueries({ queryKey: [...KEY, "drip"] }),
  });
}

export function useTestDripStep() {
  return useMutation({
    mutationFn: async ({ key, ...input }: TestSendInput & { key: string }) =>
      (await api.post(`/engage/drip/${key}/test`, input)).data,
  });
}

export const broadcastsQueryOptions = (page: number) =>
  queryOptions({
    queryKey: [...KEY, "broadcasts", page],
    queryFn: async () =>
      (await api.get<Page<Broadcast>>("/engage/broadcasts", { params: { page, pageSize: 25 } }))
        .data,
  });

export const broadcastQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...KEY, "broadcast", id],
    queryFn: async () => (await api.get<{ data: Broadcast }>(`/engage/broadcasts/${id}`)).data.data,
    // A broadcast that is going out updates its counts as the worker sends.
    refetchInterval: (query) => (query.state.data?.status === "SENDING" ? 5_000 : false),
  });

export const broadcastPreviewQueryOptions = (id: string, version: string) =>
  queryOptions({
    queryKey: [...KEY, "broadcast", id, "preview", version],
    queryFn: async () =>
      (await api.get<{ data: EmailPreview }>(`/engage/broadcasts/${id}/preview`)).data.data,
  });

export const senderTemplatesQueryOptions = queryOptions({
  queryKey: [...KEY, "wa-templates"],
  queryFn: async () =>
    (await api.get<{ configured: boolean; data: SenderTemplate[] }>("/engage/wa-templates")).data,
  staleTime: 5 * 60_000,
});

export const orgCustomerMessagesQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: [...KEY, "org", orgId],
    queryFn: async () =>
      (await api.get<{ data: CustomerMessage[] }>(`/orgs/${orgId}/customer-messages`)).data.data,
  });

export function useAudiencePreview() {
  return useMutation({
    mutationFn: async (audience: BroadcastAudience) =>
      (await api.post<{ data: AudiencePreview }>("/engage/broadcasts/audience", { audience })).data
        .data,
  });
}

export function useCreateBroadcast() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: BroadcastInput) =>
      (await api.post<{ data: Broadcast }>("/engage/broadcasts", input)).data.data,
    onSuccess: () => client.invalidateQueries({ queryKey: [...KEY, "broadcasts"] }),
  });
}

function useBroadcastMutation<TInput, TOut = Broadcast>(
  id: string,
  call: (input: TInput) => Promise<TOut>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: [...KEY, "broadcast", id] }),
        client.invalidateQueries({ queryKey: [...KEY, "broadcasts"] }),
      ]),
  });
}

export const useUpdateBroadcast = (id: string) =>
  useBroadcastMutation(
    id,
    async (input: BroadcastInput) =>
      (await api.put<{ data: Broadcast }>(`/engage/broadcasts/${id}`, input)).data.data,
  );

export const useDeleteBroadcast = (id: string) =>
  useBroadcastMutation<void, unknown>(
    id,
    async () => (await api.delete(`/engage/broadcasts/${id}`)).data,
  );

export const useScheduleBroadcast = (id: string) =>
  useBroadcastMutation(
    id,
    async (input: { at?: string }) =>
      (await api.post<{ data: Broadcast }>(`/engage/broadcasts/${id}/schedule`, input)).data.data,
  );

export const useUnscheduleBroadcast = (id: string) =>
  useBroadcastMutation<void>(
    id,
    async () =>
      (await api.post<{ data: Broadcast }>(`/engage/broadcasts/${id}/unschedule`, {})).data.data,
  );

export function useTestBroadcast(id: string) {
  return useMutation({
    mutationFn: async (input: TestSendInput) =>
      (await api.post(`/engage/broadcasts/${id}/test`, input)).data,
  });
}
