/**
 * `Integration.credential` for Pipedrive. `access_token`, `refresh_token` and
 * `webhookSecret` are encrypted at rest by the credential extension (their names
 * are in its list).
 */
export interface PipedriveCredential {
  access_token: string;
  /** Lives 60 days from its last use; each refresh may hand back a new one. */
  refresh_token: string;
  /** ISO timestamp. Access tokens live about an hour. */
  expires_at: string;
  /** The company's own API address (`https://acme.pipedrive.com`): every call goes here. */
  apiDomain: string;
  /** The Pipedrive company. One company connects to one RateUp org. */
  companyId: number;
  companyName?: string;
  /** e.g. `acme`, as in acme.pipedrive.com, for the settings page. */
  companyDomain?: string;
  /** The Pipedrive user who approved the connection. */
  connectedBy?: string;
  connectedAt: string;
  /** Step 5.2: RateUp contacts are sent to Pipedrive as persons. Off by default. */
  syncContacts?: boolean;
  /** Step 5.3: Leads board moves become Pipedrive deals. Off by default. */
  syncDeals?: boolean;
  /** The Pipedrive pipeline leads go to. */
  dealPipelineId?: number;
  /** Open Leads board column → Pipedrive stage. Won and Lost columns set the deal's status instead. */
  stageMappings?: PipedriveStageMapping[];
  /** Step 5.4: persons created in Pipedrive (with a phone) become RateUp contacts. Off by default. */
  importContacts?: boolean;
  /** Step 5.4: deals created in the chosen pipeline become Leads board leads. Off by default. */
  importDeals?: boolean;
  /** Step 5.5: a closed conversation is logged as a note on the Pipedrive person. Off by default. */
  logConversations?: boolean;
  /** Step 5.5: a survey response is logged as a note on the Pipedrive person. Off by default. */
  logSurveyResponses?: boolean;
  /** HTTP Basic password on this company's webhooks; deliveries without it are refused. */
  webhookSecret?: string;
  /** The webhooks RateUp created in the company, one per object. */
  webhooks?: PipedriveWebhookRef[];
  /** Step 5.6: the latest first-time import and send, as the Pipedrive page shows them. */
  bulk?: Partial<Record<PipedriveBulkKind, PipedriveBulkRun>>;
}

/** `import`: Pipedrive persons into RateUp. `export`: RateUp contacts (and leads) into Pipedrive. */
export type PipedriveBulkKind = "import" | "export";

/** One first-time sync run. */
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

/** The Pipedrive records RateUp follows. */
export type PipedriveObject = "person" | "deal";

export interface PipedriveWebhookRef {
  id: number;
  object: PipedriveObject;
}

export interface PipedriveStageMapping {
  /** The Leads board column. */
  stageId: string;
  pipedriveStageId: number;
}

/** A deal pipeline in the company, stages in Pipedrive's order. */
export interface PipedrivePipeline {
  id: number;
  name: string;
  stages: { id: number; name: string }[];
}

/** What the settings page changes. */
export type PipedriveSettings = Pick<
  PipedriveCredential,
  | "syncContacts"
  | "syncDeals"
  | "dealPipelineId"
  | "stageMappings"
  | "importContacts"
  | "importDeals"
  | "logConversations"
  | "logSurveyResponses"
>;

/** `GET /api/v1/users/me`: who approved the connection, and their company. */
export interface PipedriveMe {
  id: number;
  name?: string;
  email?: string;
  company_id: number;
  company_name?: string;
  company_domain?: string;
}

/** The credential, if this one is a usable Pipedrive credential. The column is `Json`. */
export function readPipedriveCredential(value: unknown): PipedriveCredential | null {
  const credential = value as Partial<PipedriveCredential> | null;
  if (
    !credential ||
    typeof credential.access_token !== "string" ||
    typeof credential.refresh_token !== "string" ||
    typeof credential.apiDomain !== "string" ||
    typeof credential.companyId !== "number"
  ) {
    return null;
  }
  return credential as PipedriveCredential;
}
