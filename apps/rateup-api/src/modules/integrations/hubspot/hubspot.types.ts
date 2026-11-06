/**
 * `Integration.credential` for HubSpot. `access_token` and `refresh_token` are
 * encrypted at rest by the credential extension (their names are in its list).
 *
 * Not to be confused with `utils/hubspot.ts`, which is RateUp's own HubSpot
 * account for its sign-ups, reached with a private-app token.
 */
export interface HubSpotCredential {
  access_token: string;
  /** HubSpot keeps the same refresh token across refreshes; it only changes on reconnect. */
  refresh_token: string;
  /** ISO timestamp. Access tokens live 30 minutes. */
  expires_at: string;
  /** The HubSpot account ("portal", "hub") — what app webhooks are routed by. */
  portalId: number;
  /** e.g. `acme.hubspot.com`, for the settings page. */
  hubDomain?: string;
  /** The HubSpot user who approved the connection. */
  connectedBy?: string;
  scopes?: string[];
  connectedAt: string;
  /** Step 2.2: new and edited RateUp contacts are sent to HubSpot. Off until an admin turns it on. */
  syncContacts?: boolean;
  /** Step 2.3: Leads board moves become HubSpot deals. Off until an admin turns it on. */
  syncDeals?: boolean;
  /** The HubSpot deal pipeline leads are sent to. */
  dealPipelineId?: string;
  /** Leads board column → a stage of `dealPipelineId`. An unmapped column sends nothing. */
  stageMappings?: HubSpotStageMapping[];
  /** Step 2.4: contacts created in HubSpot (with a phone) become RateUp contacts. Off by default. */
  importContacts?: boolean;
  /** Step 2.4: deals created in HubSpot's chosen pipeline become Leads board leads. Off by default. */
  importDeals?: boolean;
  /** Step 2.5: a closed conversation is logged as a note on the HubSpot contact. Off by default. */
  logConversations?: boolean;
  /** Step 2.5: a survey response is logged as a note on the HubSpot contact. Off by default. */
  logSurveyResponses?: boolean;
  /** Step 2.6: the latest first-time import and send, as the HubSpot page shows them. */
  bulk?: Partial<Record<HubSpotBulkKind, HubSpotBulkRun>>;
}

/** `import`: HubSpot contacts into RateUp. `export`: RateUp contacts (and leads) into HubSpot. */
export type HubSpotBulkKind = "import" | "export";

export interface HubSpotBulkRun {
  status: "running" | "done" | "failed";
  startedAt: string;
  finishedAt?: string;
  created: number;
  linked: number;
  skipped: number;
  failed: number;
  /** `export` only, when deals are on: leads sent as deals. */
  deals?: { created: number; skipped: number; failed: number };
  error?: string;
}

export interface HubSpotStageMapping {
  /** A RateUp Leads board column. */
  stageId: string;
  hubspotStageId: string;
}

/** What an admin sets on the HubSpot page. */
export type HubSpotSettings = Pick<
  HubSpotCredential,
  | "syncContacts"
  | "syncDeals"
  | "dealPipelineId"
  | "stageMappings"
  | "importContacts"
  | "importDeals"
  | "logConversations"
  | "logSurveyResponses"
>;

/** One entry of an app webhook delivery: HubSpot posts an array of these. */
export interface HubSpotWebhookEvent {
  eventId: number;
  subscriptionType: string;
  portalId: number;
  objectId: number;
  occurredAt: number;
  propertyName?: string;
  propertyValue?: string;
  changeSource?: string;
}

/** A deal pipeline, as `GET /crm/v3/pipelines/deals` returns it. */
export interface HubSpotPipeline {
  id: string;
  label: string;
  displayOrder: number;
  stages: {
    id: string;
    label: string;
    displayOrder: number;
    /** Strings: `isClosed` is "true"/"false", `probability` "0.0"–"1.0" (1 = won). */
    metadata?: { isClosed?: string; probability?: string };
  }[];
}

export function readHubSpotCredential(credential: unknown): HubSpotCredential | null {
  const value = credential as Partial<HubSpotCredential> | null;
  if (!value?.access_token || !value.refresh_token || !value.portalId) return null;
  return value as HubSpotCredential;
}

/** What HubSpot says about an access token (`GET /oauth/v1/access-tokens/:token`). */
export interface HubSpotTokenInfo {
  hub_id: number;
  hub_domain?: string;
  user?: string;
  scopes?: string[];
  app_id?: number;
}
