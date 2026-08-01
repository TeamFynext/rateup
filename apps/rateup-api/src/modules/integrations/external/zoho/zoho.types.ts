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
 * How a Rateup lifecycle stage maps onto the matching Zoho CRM lead status or
 * Bigin deal stage. Exactly one of the two target fields is set, depending on
 * which product the mapping was configured for.
 */
export interface ZohoLifecycleStageMapping {
  lifecycleId?: string;
  biginStageName?: string;
  zohoLeadStatus?: string;
}

export interface ZohoBiginPipelineConfig {
  selectedPipeline?: ZohoPipelineOption;
  selectedSubPipeline?: ZohoPipelineOption;
  selectedStage?: ZohoPipelineOption;
  lifecycleStageMappings?: ZohoLifecycleStageMapping[];
  /** Zoho field api_name -> the Rateup contact field feeding it. */
  requiredFieldMappings?: Record<string, string>;
}

export interface ZohoCrmConfig {
  /** Maps a Zoho CRM lead status onto a Rateup lifecycle stage. */
  leadLifecycleMappings?: ZohoLifecycleStageMapping[];
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
