import { axiosClient } from "@/backend/apiClient";

const GETLEAD_BASE_URL = "/integration/external/getlead";

/** A `{id, name}` row from GetLead's reference data. */
export interface GetLeadRef {
  id: string;
  name: string;
}

export interface GetLeadCustomField {
  field_key: string;
  field_type?: string;
  allowed_values?: { value: string; label?: string }[];
}

export interface GetLeadMeta {
  sources: GetLeadRef[];
  statuses: GetLeadRef[];
  purposes: GetLeadRef[];
  custom_fields: GetLeadCustomField[];
  fetchedAt?: string;
}

/** Connection state for the settings card. Never carries the API key itself. */
export interface GetLeadStatus {
  connected: boolean;
  /** The stored key masked for display — `ik_••••••••3f2a`. Null when none is stored. */
  keyPreview?: string | null;
  active?: boolean;
  metaFetchedAt?: string | null;
  connectedAt?: string | null;
}

/**
 * Saves an API key, having proved it works.
 *
 * Not the generic `POST /integrations`: that stores whatever it is handed, so a
 * typo would surface much later as leads quietly failing to sync.
 */
export async function connectGetLead(apiKey: string) {
  const res = await axiosClient.post(`${GETLEAD_BASE_URL}/connect`, { apiKey });
  return res.data as { meta: GetLeadMeta };
}

export async function getGetLeadStatus() {
  const res = await axiosClient.get(`${GETLEAD_BASE_URL}/status`);
  return res.data as GetLeadStatus;
}

export async function getGetLeadMeta(refresh = false) {
  const res = await axiosClient.get(`${GETLEAD_BASE_URL}/meta`, {
    params: refresh ? { refresh: true } : undefined,
  });
  return (res.data as { data: GetLeadMeta }).data;
}

/** One board column mapped onto a GetLead status. */
export interface GetLeadStageMapping {
  stageId: string;
  stageName?: string;
  getleadStatusId: string;
  getleadStatusName?: string;
}

export interface GetLeadTriggerSubscription {
  subscribed_field: string;
  active: boolean;
}

export interface GetLeadSettings {
  stageMappings: GetLeadStageMapping[];
  defaults: {
    sourceId?: string;
    statusId?: string;
    purposeIds?: string[];
    assignedToId?: string;
  };
  triggerSubscriptions: GetLeadTriggerSubscription[];
}

export async function getGetLeadSettings() {
  const res = await axiosClient.get(`${GETLEAD_BASE_URL}/settings`);
  return res.data as GetLeadSettings;
}

export async function saveGetLeadSettings(settings: Partial<GetLeadSettings>) {
  const res = await axiosClient.put(`${GETLEAD_BASE_URL}/settings`, settings);
  return res.data as GetLeadSettings;
}

/**
 * The inbound webhook, as the settings screen shows it.
 *
 * `configured: false` means an org that connected before the inbound half
 * existed; issuing one fills the rest in.
 */
export interface GetLeadWebhookStatus {
  configured: boolean;
  url?: string;
  secret?: string;
  createdAt?: string;
  /** Null means GetLead has never called — the only proof the workflow exists. */
  lastReceivedAt?: string | null;
  /** The last delivery's fields, personal ones withheld. Null until one lands. */
  lastEvent?: string | null;
  /** A delivery that reached us and was refused — a wrong secret, or a
   *  signature under a header we do not recognise. */
  lastRejectedAt?: string | null;
  lastRejectReason?: string | null;
}

export type GetLeadWebhookIssued = Required<Omit<GetLeadWebhookStatus, "configured">>;

export async function getGetLeadWebhook() {
  const res = await axiosClient.get(`${GETLEAD_BASE_URL}/webhook`);
  return res.data as GetLeadWebhookStatus;
}

export async function issueGetLeadWebhook() {
  const res = await axiosClient.post(`${GETLEAD_BASE_URL}/webhook`);
  return res.data as GetLeadWebhookIssued;
}
