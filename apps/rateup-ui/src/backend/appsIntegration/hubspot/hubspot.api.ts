import { axiosClient } from "../../apiClient";

const ROUTE_URL = "integrations/hubspot";

export interface HubSpotSettings {
  /** New and edited RateUp contacts are sent to HubSpot. */
  syncContacts: boolean;
  /** Leads board moves become HubSpot deals. */
  syncDeals: boolean;
  /** The HubSpot deal pipeline leads go to. */
  dealPipelineId: string | null;
  /** Leads board column → HubSpot stage. An unmapped column sends nothing. */
  stageMappings: HubSpotStageMapping[];
  /** Contacts created in HubSpot (with a phone) become RateUp contacts. */
  importContacts: boolean;
  /** Deals created in the chosen HubSpot pipeline become Leads board leads. */
  importDeals: boolean;
  /** A closed conversation is logged as a note on the HubSpot contact. */
  logConversations: boolean;
  /** A survey response is logged as a note on the HubSpot contact. */
  logSurveyResponses: boolean;
}

/** One first-time sync run: `import` pulls from HubSpot, `export` sends to it. */
export interface HubSpotBulkRun {
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

export type HubSpotBulkKind = "import" | "export";

export interface HubSpotStageMapping {
  stageId: string;
  hubspotStageId: string;
}

/** A deal pipeline in the connected account, stages in HubSpot's order. */
export interface HubSpotPipeline {
  id: string;
  label: string;
  stages: {
    id: string;
    label: string;
    /** Strings, as HubSpot sends them: `isClosed` "true"/"false", `probability` "0.0"–"1.0". */
    metadata?: { isClosed?: string; probability?: string };
  }[];
}

/** The connection as the API shows it; the tokens never leave the server. */
export type HubSpotStatus =
  | { connected: false }
  | {
      connected: true;
      portalId: number;
      hubDomain: string | null;
      connectedBy: string | null;
      connectedAt: string;
      settings: HubSpotSettings;
      bulk: Record<HubSpotBulkKind, HubSpotBulkRun | null>;
      health: { consecutiveFailures: number; lastError: string | null; lastErrorAt: string | null };
    };

export async function getHubSpotStatus() {
  return (await axiosClient.get(`${ROUTE_URL}/status`)).data as HubSpotStatus;
}

type SettingsUpdate = Partial<Omit<HubSpotSettings, "dealPipelineId">> & {
  dealPipelineId?: string;
};

export async function getHubSpotPipelines() {
  return (await axiosClient.get(`${ROUTE_URL}/pipelines`)).data as HubSpotPipeline[];
}

export async function updateHubSpotSettings(settings: SettingsUpdate) {
  return (await axiosClient.put(`${ROUTE_URL}/settings`, settings)).data as HubSpotStatus;
}

/** Starts a first-time sync in the background; the status shows its progress. */
export async function startHubSpotBulk(kind: HubSpotBulkKind) {
  return (await axiosClient.post(`${ROUTE_URL}/${kind}`)).data as HubSpotStatus;
}
