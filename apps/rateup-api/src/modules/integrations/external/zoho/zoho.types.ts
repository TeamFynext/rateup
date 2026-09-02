import axios from "axios";
import type { Integration } from "../../../../../generated/prisma/client.js";

/**
 * A webhook channel Zoho handed back when we subscribed to record events, one
 * per product (see registerZohoWebhook in zoho.client.ts).
 */
export interface ZohoWebhookRegistration {
  channelId: string;
  /** Null when Zoho's watch response carried no channel expiry. */
  expiry: string | null;
  product: ZohoProductName;
}

export type ZohoProductName = "crm" | "bigin";

/** A Bigin pipeline / sub-pipeline / stage the user picked in settings. */
export interface ZohoPipelineOption {
  id?: string;
  name?: string;
}

/**
 * How a Rateup pipeline column maps onto the matching Zoho CRM lead status or
 * Bigin deal stage. Exactly one of the two target fields is set, depending on
 * which product the mapping was configured for.
 *
 * `stageId` is the key the sync reads in both directions. `lifecycleId` is what
 * it used to read, and is kept on every entry the Update Center's "Map Lifecycle
 * References" card touched: it is the only record of which lifecycle a mapping
 * came from, so it is what a rollback would need. Nothing reads it any more.
 */
export interface ZohoStageMapping {
  /** The pipeline column this maps to — the live key. */
  stageId?: string;
  /** Stored alongside the id so a deleted column can still be identified. */
  stageName?: string;
  /** @deprecated Superseded by `stageId`; retained for rollback only. */
  lifecycleId?: string;
  /** @deprecated Superseded by `stageName`; retained for rollback only. */
  lifecycleName?: string;
  biginStageId?: string;
  biginStageName?: string;
  zohoLeadStatus?: string;
}

export interface ZohoBiginPipelineConfig {
  selectedPipeline?: ZohoPipelineOption;
  selectedSubPipeline?: ZohoPipelineOption;
  selectedStage?: ZohoPipelineOption;
  /**
   * Named for the lifecycle era. The key is left alone deliberately: renaming it
   * would orphan every mapping an org has already configured, including the
   * `stageId`s the Update Center stamped onto them.
   */
  lifecycleStageMappings?: ZohoStageMapping[];
  /** Zoho field api_name -> the Rateup contact field feeding it. */
  requiredFieldMappings?: Record<string, string>;
}

export interface ZohoCrmConfig {
  /** Maps a Zoho CRM lead status onto a Rateup pipeline column. Key name is legacy. */
  leadLifecycleMappings?: ZohoStageMapping[];
}

export interface ZohoBiginConfig {
  /** Zoho user id that newly created Bigin records are assigned to. */
  biginOwner?: string;
  pipeline?: ZohoBiginPipelineConfig;
}

/** One row of `credential.triggerSubscriptions` — a Rateup event we forward. */
export interface ZohoTriggerSubscription {
  /** A ZohoTriggers value; compared against the incoming trigger key. */
  subscribed_field: string;
  active: boolean;
  hookUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * The shape stored in `Integration.credential` for the Zoho integration. The
 * column is `Json` on the Prisma model, so it arrives as `Prisma.JsonValue`;
 * use `getZohoCredential` to read it as this type at that single boundary.
 */
export interface ZohoCredential {
  access_token: string;
  refresh_token: string;
  api_domain: string;
  /** The space-separated OAuth scopes Zoho granted. */
  scope?: string;
  /** Absolute expiry timestamp, parsed via `new Date(...)`. */
  expires_at: string | number;
  supportedProducts?: Partial<Record<ZohoProductName, boolean>>;
  triggerSubscriptions?: ZohoTriggerSubscription[];
  zohoWebhookSecret?: string;
  isWebhookRegistered?: boolean;
  crmWebhook?: ZohoWebhookRegistration;
  biginWebhook?: ZohoWebhookRegistration;
  crm?: ZohoCrmConfig;
  bigin?: ZohoBiginConfig;
  lastZohoSyncAt?: string;
  lastBiginSyncAt?: string;
  lastZohoLeadSyncAt?: string;
}

/**
 * A Contact/Lead/Deal record as Zoho CRM or Bigin returns it. Zoho modules are
 * user-extensible, so only the fields Rateup reads are named; the index
 * signature covers the rest of the record.
 */
export interface ZohoRecord {
  id?: string;
  Full_Name?: string;
  First_Name?: string;
  Last_Name?: string;
  Owner?: { id?: string };
  Email?: string;
  Phone?: string;
  Mobile?: string;
  Description?: string;
  Date_of_Birth?: string;
  Record_Image?: string;
  Lead_Source?: string;
  Lead_Status?: string;
  Stage?: string;
  [field: string]: unknown;
}

/**
 * The payload queued for a Zoho trigger. It mixes Rateup-side fields (used to
 * build the outgoing record) with the ids of the Zoho records already linked to
 * the contact, and is otherwise forwarded to Zoho verbatim — hence the index
 * signature covering the module-specific fields (Full_Name, Email, ...).
 */
export interface ZohoTriggerData {
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  source?: string;
  /** The pipeline column the contact sits on, for stage-mapped triggers. */
  stageId?: string;
  lifecycleId?: string;
  zohoContactId?: string;
  zohoLeadId?: string;
  biginContactId?: string;
  biginDealId?: string;
  // Zoho-cased variants, already mapped by the caller for some triggers.
  Full_Name?: string;
  Email?: string;
  Phone?: string;
  [field: string]: unknown;
}

/** The Bigin deal record Rateup builds for a BIGIN_DEAL_CREATE trigger. */
export interface ZohoBiginDealPayload {
  Deal_Name?: string;
  Lead_Source?: string;
  Layout?: { id?: string };
  Pipeline?: string;
  Sub_Pipeline?: string;
  Stage?: string;
  Owner?: { id?: string };
  Contact_Name?: { id?: string };
  [field: string]: unknown;
}

/** One selectable value of a Zoho picklist field. */
export interface ZohoPickListValue {
  id?: string | number;
  display_value?: string;
  actual_value?: string;
}

/** A field definition from Zoho's fields-metadata endpoint. */
export interface ZohoFieldMeta {
  id?: string | number;
  api_name?: string;
  display_label?: string;
  data_type?: string;
  required?: boolean;
  system_mandatory?: boolean;
  pick_list_values?: ZohoPickListValue[];
}

/** A section of a Zoho layout, grouping field definitions. */
export interface ZohoLayoutSection {
  fields?: ZohoFieldMeta[];
}

/** A layout (Bigin pipeline) from Zoho's layouts-metadata endpoint. */
export interface ZohoLayoutMeta {
  id?: string | number;
  name?: string;
  display_label?: string;
  sections?: ZohoLayoutSection[];
}

/** A user from Zoho's users endpoint. */
export interface ZohoUser {
  id?: string | number;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  status?: string;
  zuid?: string;
}

/** An Integration row known to be the Zoho one. */
export type ZohoIntegration = Omit<Integration, "credential"> & {
  credential: ZohoCredential;
};

/**
 * Reads `Integration.credential` as a ZohoCredential. Prisma types the column
 * as `Json`, so this is the one place the untyped blob is interpreted.
 */
export function getZohoCredential(integration: { credential: unknown }): ZohoCredential {
  return integration.credential as ZohoCredential;
}

/** The notification body Zoho POSTs to the webhook when a subscribed record changes. */
export interface ZohoWebhookPayload {
  channel_id?: string;
  token?: string;
  ids?: string[];
  module?: string;
  operation?: string;
}

/** Zoho puts the useful text under `response.data`; fall back to the error itself. */
export function zohoErrorDetail(error: unknown): unknown {
  const data = (error as { response?: { data?: unknown } } | null | undefined)?.response?.data;
  return data ?? error;
}

/** What a write path knows about the column it is reporting. */
export interface StageMappingKey {
  stageId?: string;
  stageName?: string;
  /** The contact write paths still describe the move by lifecycle. */
  lifecycleId?: string;
  lifecycleName?: string;
}

/**
 * The mapping row a trigger's column matches, in either table.
 *
 * Keyed on `stageId` — the board drives both products now. The `lifecycleId`
 * fallback is for the contact write paths in `contact.service.ts`, which still
 * enqueue with a lifecycle rather than a stage.
 *
 * Each key is compared **only when the incoming value is set**. A bare
 * `m.stageId === data.stageId` matches the first entry that has no `stageId`
 * whenever the trigger carries none either, which silently stamps an unrelated
 * mapping onto the record — the reason this is its own function.
 */
export function findMappingForTrigger(
  mappings: ZohoStageMapping[],
  data: StageMappingKey,
): ZohoStageMapping | undefined {
  if (data.stageId) return mappings.find((m) => m.stageId === data.stageId);
  if (data.lifecycleId) return mappings.find((m) => m.lifecycleId === data.lifecycleId);
  return undefined;
}

/** Which Bigin stage a trigger's column maps to. */
export function findBiginStageMapping(
  mappings: ZohoStageMapping[],
  data: StageMappingKey,
): ZohoStageMapping | undefined {
  return findMappingForTrigger(mappings, data);
}

/**
 * Which Zoho CRM lead status a trigger's column maps to.
 *
 * The outbound half of the "Lead Status Mapping" dialog: inbound has always read
 * it, outbound used to push the Rateup column's own name straight into
 * `Lead_Status`. That field is a picklist, so an org whose Zoho statuses are not
 * named exactly like its board had every push rejected.
 *
 * Null means "do not push". An unmapped column is deliberately silent rather
 * than falling back to the name: the org told us what its statuses are, and
 * inventing a new one is what was broken.
 */
export function resolveCrmLeadStatus(
  mappings: ZohoStageMapping[],
  data: StageMappingKey,
): string | null {
  // An org that never opened the mapping dialog has nothing configured. Sending
  // the column's own name is a guess, but it is the guess this has always made
  // and it does work where the two are named alike — going silent instead would
  // stop a sync that works today.
  if (mappings.length === 0) return data.stageName ?? data.lifecycleName ?? null;

  return findMappingForTrigger(mappings, data)?.zohoLeadStatus ?? null;
}

/**
 * Bigin refusing the deal because the contact it points at is gone.
 *
 * Distinguished by the field path rather than the code alone: `INVALID_DATA` is
 * Bigin's answer to any bad field, and retrying without the contact only helps
 * for this one.
 */
/**
 * Bigin refusing the record id in the URL — the deal was deleted on their side.
 *
 * Shaped differently from a field rejection: the body is a bare error object
 * with a `resource_path_index` rather than a `data` array, because the request
 * never got as far as validating fields.
 */
export function isStaleRecordIdError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (error.response?.status === 404) return true;

  const body = error.response?.data as
    | { code?: string; details?: { resource_path_index?: number } }
    | undefined;
  return body?.code === "INVALID_DATA" && body?.details?.resource_path_index !== undefined;
}

export function isStaleContactLinkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const rows = (error.response?.data as { data?: unknown } | undefined)?.data;
  if (!Array.isArray(rows)) return false;
  return rows.some((row) => {
    const detail = row as { code?: string; details?: { json_path?: string } };
    return (
      detail?.code === "INVALID_DATA" &&
      detail?.details?.json_path?.includes("Contact_Name") === true
    );
  });
}
