import { axiosClient } from "../../apiClient";

const ROUTE_URL = "integrations/pipedrive";

export interface PipedriveSettings {
  /** New and edited RateUp contacts are sent to Pipedrive as persons. */
  syncContacts: boolean;
  /** Leads board moves become Pipedrive deals. */
  syncDeals: boolean;
  /** The Pipedrive pipeline leads go to. */
  dealPipelineId: number | null;
  /** Open Leads board column → Pipedrive stage. Won and Lost columns set the deal's status. */
  stageMappings: PipedriveStageMapping[];
  /** Persons created in Pipedrive (with a phone) become RateUp contacts. */
  importContacts: boolean;
  /** Deals created in the chosen pipeline become Leads board leads. */
  importDeals: boolean;
  /** A closed conversation is logged as a note on the Pipedrive person. */
  logConversations: boolean;
  /** A survey response is logged as a note on the Pipedrive person. */
  logSurveyResponses: boolean;
}

/** One first-time sync run: `import` pulls from Pipedrive, `export` sends to it. */
export interface PipedriveBulkRun {
  status: "running" | "done" | "failed";
  startedAt: string;
  finishedAt?: string;
  created: number;
  linked: number;
  skipped: number;
  failed: number;
  deals?: { created: number; skipped: number; failed: number };
  error?: string;
}

export type PipedriveBulkKind = "import" | "export";

export interface PipedriveStageMapping {
  stageId: string;
  pipedriveStageId: number;
}

/** A deal pipeline in the connected company, stages in Pipedrive's order. */
export interface PipedrivePipeline {
  id: number;
  name: string;
  stages: { id: number; name: string }[];
}

/** The connection as the API shows it; the tokens never leave the server. */
export type PipedriveStatus =
  | { connected: false }
  | {
      connected: true;
      companyId: number;
      companyName: string | null;
      /** e.g. `acme`, as in acme.pipedrive.com. */
      companyDomain: string | null;
      connectedBy: string | null;
      connectedAt: string;
      settings: PipedriveSettings;
      bulk: Record<PipedriveBulkKind, PipedriveBulkRun | null>;
      /** The webhooks that bring Pipedrive's changes back, one per record type. */
      webhooks: { object: "person" | "deal"; registered: boolean }[];
      health: { consecutiveFailures: number; lastError: string | null; lastErrorAt: string | null };
    };

export async function getPipedriveStatus() {
  return (await axiosClient.get(`${ROUTE_URL}/status`)).data as PipedriveStatus;
}

export async function getPipedrivePipelines() {
  return (await axiosClient.get(`${ROUTE_URL}/pipelines`)).data as PipedrivePipeline[];
}

/** Starts a first-time sync in the background; the status shows its progress. */
export async function startPipedriveBulk(kind: PipedriveBulkKind) {
  return (await axiosClient.post(`${ROUTE_URL}/${kind}`)).data as PipedriveStatus;
}

/** Re-creates the webhooks Pipedrive dropped. */
export async function repairPipedriveWebhooks() {
  return (await axiosClient.post(`${ROUTE_URL}/webhooks/repair`)).data as PipedriveStatus;
}

type SettingsUpdate = Partial<Omit<PipedriveSettings, "dealPipelineId">> & {
  dealPipelineId?: number;
};

export async function updatePipedriveSettings(settings: SettingsUpdate) {
  return (await axiosClient.put(`${ROUTE_URL}/settings`, settings)).data as PipedriveStatus;
}
