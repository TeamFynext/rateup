// For New Migrations and Updations

import { axiosClient } from "../apiClient";

const baseUrl = "/public/update";

export async function migrateWaTemplateToWhatsappPhoneId() {
  return await axiosClient.put(`${baseUrl}/migrate-wa-template-to-whatsapp-phone-id`, null, {
    timeout: 60000,
  });
}

export async function syncTeamFeatures() {
  return await axiosClient.put(`${baseUrl}/sync-team-features`, null, {
    timeout: 60000,
  });
}

export interface MigrateFreePlanFeaturesResult {
  message: string;
  updated: number;
}

export async function migrateFreePlanFeatures() {
  return await axiosClient.put<MigrateFreePlanFeaturesResult>(
    `${baseUrl}/migrate-free-plan-features`,
    null,
    { timeout: 60000 },
  );
}

export interface MigrateNonFreePlanFeaturesResult {
  message: string;
  updated: number;
  skipped: number;
}

export async function migrateNonFreePlanFeatures() {
  return await axiosClient.put<MigrateNonFreePlanFeaturesResult>(
    `${baseUrl}/migrate-non-free-plan-features`,
    null,
    { timeout: 120000 },
  );
}

export async function migrateLoyaltyTierPriority() {
  return await axiosClient.put(`${baseUrl}/migrate-loyalty-tier-priority`, null, {
    timeout: 60000,
  });
}

export async function seedInboxStats() {
  return await axiosClient.put(`${baseUrl}/seed-inbox-stats`, null, {
    timeout: 60000,
  });
}

export interface ReconcileInboxStatusResult {
  message: string;
  applied: boolean;
  scanned: number;
  mismatched: number;
  repaired: number;
  skippedReopenPending: number;
}

/** Dry run unless `apply` is true; only then are the repairs written. */
export async function reconcileInboxStatus(apply = false) {
  return await axiosClient.put<ReconcileInboxStatusResult>(
    `${baseUrl}/reconcile-inbox-status?apply=${apply}`,
    null,
    { timeout: 60000 },
  );
}

export interface BackfillConversationsResult {
  message: string;
  applied: boolean;
  scannedContacts: number;
  conversationsCreated: number;
  messagesLinked: number;
  assigneesBackfilled: number;
  /** False when the server hit its time budget with work left; call again to continue. */
  done: boolean;
}

/**
 * Dry run unless `apply` is true. The server works for ~20s per call and returns
 * `done: false` if more remains — the API caps every request at 30s, so a full
 * backfill takes several calls. Callers must loop until `done`.
 */
export async function backfillConversations(apply = false) {
  return await axiosClient.put<BackfillConversationsResult>(
    `${baseUrl}/backfill-conversations?apply=${apply}`,
    null,
    { timeout: 30000 },
  );
}

export interface DeleteAllPipelinesResult {
  message: string;
  applied: boolean;
  pipelines: number;
  stages: number;
  leads: number;
  orgs: number;
  teamsPointingAtOne: number;
}

/**
 * Wipes every pipeline in every org. Root-org only and session-guarded on the
 * server, unlike the other calls in this file. Always run with `apply: false`
 * first — the counts that come back are what an apply run destroys.
 */
export async function deleteAllPipelines(apply: boolean) {
  return await axiosClient.delete<DeleteAllPipelinesResult>(`${baseUrl}/pipelines`, {
    params: { apply: apply ? "true" : "false" },
    timeout: 60000,
  });
}

export interface SeedPipelinesResult {
  message: string;
  applied: boolean;
  orgsScanned: number;
  pipelinesCreated: number;
  stagesCreated: number;
  wonColumnsAdded: number;
  lostColumnsAdded: number;
  skippedHasPipeline: number;
  skippedNoLifecycles: number;
  skippedNoTeams: number;
}

/**
 * Gives each org without one a "Default Pipeline" built from its lifecycle
 * stages. Root-org only and session-guarded, like the wipe above.
 */
export async function seedPipelines(apply: boolean) {
  return await axiosClient.post<SeedPipelinesResult>(`${baseUrl}/seed-pipelines`, null, {
    params: { apply: apply ? "true" : "false" },
    timeout: 120000,
  });
}

export interface PlaceLeadsResult {
  message: string;
  applied: boolean;
  /** False while contacts remain; the caller keeps calling until true. */
  done: boolean;
  scanned: number;
  placed: number;
  alreadyOnBoard: number;
  unmatchedLifecycle: number;
  skippedNoPipeline: number;
}

/**
 * Places a lead per classified contact on the column matching its lifecycle
 * name. One call is capped well under the request timeout, so a full run takes
 * several — see `usePlaceLeadsFromLifecycles`.
 */
export async function placeLeadsFromLifecycles(apply: boolean) {
  return await axiosClient.post<PlaceLeadsResult>(`${baseUrl}/place-leads-from-lifecycles`, null, {
    params: { apply: apply ? "true" : "false" },
    timeout: 60000,
  });
}

export interface MapLifecycleRefsResult {
  message: string;
  applied: boolean;
  orgsWithBoard: number;
  zohoIntegrations: number;
  biginMappings: number;
  biginMapped: number;
  crmMappings: number;
  crmMapped: number;
  ruleActions: number;
  ruleActionsMapped: number;
  /** Rows that already name a live column — finished work, not a problem. */
  alreadyMapped: number;
  unresolved: number;
  /** Reported only — these need a code change, not a data one. */
  ruleConditionsNeedingWork: number;
  lifecycleTriggeredRules: number;
}

/**
 * Writes a stage id beside every stored lifecycle id — Zoho mapping tables and
 * automation-rule actions. Additive: the lifecycle keys stay until the code that
 * reads them has moved over.
 */
export async function mapLifecycleRefsToStages(apply: boolean) {
  return await axiosClient.post<MapLifecycleRefsResult>(
    `${baseUrl}/map-lifecycle-refs-to-stages`,
    null,
    { params: { apply: apply ? "true" : "false" }, timeout: 120000 },
  );
}

export interface ConvertAssignLifecycleResult {
  message: string;
  applied: boolean;
  actions: number;
  converted: number;
  unresolved: number;
  skippedNoBoard: number;
  /** Rule names touched, so they can be checked afterwards. */
  rules: string[];
}

/**
 * Switches Assign Lifecycle rule actions over to Assign Stage. Changes what
 * those rules do — a converted rule moves the lead and stops writing the
 * contact's lifecycle, so it no longer syncs to Zoho, Zapier or Meta.
 */
export async function convertAssignLifecycleActions(apply: boolean) {
  return await axiosClient.post<ConvertAssignLifecycleResult>(
    `${baseUrl}/convert-assign-lifecycle-actions`,
    null,
    { params: { apply: apply ? "true" : "false" }, timeout: 60000 },
  );
}
