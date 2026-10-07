import type { RequestPayload } from "@/types/api.ts";
import type { IntegratedApps } from "@/types/enums.ts";
import type { PetpoojaOrderEvent, petpoojaCredential } from "@/types/global";

import { axiosClient } from "../apiClient";

const ROUTE_URL = "integrations/";
// export const getAllIntegrations = async () => {
//   const response = await axiosClient.get(`${ROUTE_URL}`);
//   return response.data;
// };

export const getIntegrationByType = async (type: IntegratedApps) => {
  const response = await axiosClient.get(`${ROUTE_URL}${type}`);
  return response.data;
};

export interface integrationSchemaProps {
  id?: string;
  /** Zapier creates with no credential — the server mints the API key. */
  credential: petpoojaCredential | Record<string, never>;
  name: string;
}

export interface updateIntegrationSchema {
  /** The provider's credential blob; its shape differs per integration. */
  credential: RequestPayload;
  updateKey?: boolean;
}

export const createIntegration = async (data: integrationSchemaProps) => {
  const response = await axiosClient.post(`${ROUTE_URL}`, data);
  return response.data;
};

export const updateIntegration = async (type: IntegratedApps, data: updateIntegrationSchema) => {
  const response = await axiosClient.put(`${ROUTE_URL}${type}`, data);
  return response.data;
};

export const deleteIntegration = async (type: IntegratedApps) => {
  const response = await axiosClient.delete(`${ROUTE_URL}${type}`);
  return response.data;
};

/** One payment gateway linked to the WhatsApp Business account in WhatsApp Manager. */
export interface WaPaymentConfiguration {
  configuration_name: string;
  provider_name?: string;
  status?: string;
  /** Both arrive as code objects carrying a human-readable description. */
  purpose_code?: { code?: string; description?: string };
  merchant_category_code?: { code?: string; description?: string };
  oauth_url?: string;
  /** Unix seconds when `oauth_url` stops working. */
  expiration?: number;
}

export interface WaPaymentConfigurationsView {
  /** The WhatsApp number whose account was read. */
  phone: string | null;
  configurations: WaPaymentConfiguration[];
  /** Set when Meta could not be read and the list is the last one saved. */
  syncError?: string;
}

/** Syncs the default number's payment configurations from Meta and returns them. */
export const getWaPaymentConfigurations = async () => {
  const response = await axiosClient.get(`${ROUTE_URL}wa_payment_configurations`);
  return response.data as WaPaymentConfigurationsView;
};

export const regenerateWaPaymentConfigurationOauth = async (name: string) => {
  const response = await axiosClient.get(
    `${ROUTE_URL}regenerate_wa_payment_config_oauth/${encodeURIComponent(name)}`,
  );
  return response.data as { oauth_url?: string; expiration?: number };
};

/** An installed app integration row. */
export interface AppIntegration {
  id: string;
  name: IntegratedApps;
  orgId: string;
  active: boolean;
  createdAt: string;
  /**
   * Per-provider credential blob. The named members are the ones the
   * integration screens read; the rest varies by provider.
   */
  credential: {
    session?: { shop?: string };
    accessToken?: string;
    restaurantId?: string;
    orderEvent?: PetpoojaOrderEvent;
    history?: Array<{
      phone?: string;
      name?: string;
      status?: string;
      scheduledAt?: string;
      createdAt?: string;
    }>;
    supportedProducts?: { crm?: boolean; bigin?: boolean; [key: string]: unknown };
    triggerSubscriptions?: Array<{
      subscribed_field?: string;
      active?: boolean;
      [key: string]: unknown;
    }>;
    crm?: {
      // Key name is legacy; the mapping targets a pipeline column now. The
      // lifecycle fields are kept on saved entries for rollback only.
      leadLifecycleMappings?: Array<{
        zohoLeadStatus: string;
        stageId?: string;
        stageName?: string;
        lifecycleId?: string;
        lifecycleName?: string;
      }>;
      [key: string]: unknown;
    };
    bigin?: {
      biginOwner?: string;
      pipeline?: {
        selectedPipeline?: { id?: string | number; [key: string]: unknown };
        selectedSubPipeline?: { id?: string | number; [key: string]: unknown };
        requiredFieldMappings?: Record<string, string>;
        // Key name is legacy; see `leadLifecycleMappings` above.
        lifecycleStageMappings?: Array<{
          stageId?: string;
          stageName?: string;
          lifecycleId?: string;
          lifecycleName?: string;
          biginStageId?: string;
          biginStageName?: string;
        }>;
      };
      lifecycleStageMappings?: Record<string, string>;
      [key: string]: unknown;
    };
    lastZohoSyncAt?: string;
    lastZohoLeadSyncAt?: string;
    lastBiginSyncAt?: string;
    [key: string]: unknown;
  };
}

export async function getAllIntegrations() {
  return (await axiosClient.get(`${ROUTE_URL}all`)).data as AppIntegration[];
}

/** One row per known integration, connected or not. */
export interface IntegrationStatus {
  name: IntegratedApps;
  isConnected: boolean;
  /**
   * Jobs whose final retry failed since the last success. Any at all means a sync was lost,
   * so the list flags the card.
   */
  consecutiveFailures: number;
  lastErrorAt: string | null;
}

export async function getIntegrationStatuses() {
  return (await axiosClient.get(`${ROUTE_URL}statuses`)).data as IntegrationStatus[];
}

export interface IntegrationHealth {
  consecutiveFailures: number;
  lastError: string | null;
  lastErrorAt: string | null;
}

/** A sync entry an integration left on a lead's timeline. */
export interface IntegrationActivityEntry {
  id: string;
  type: "INTEGRATION_SYNCED" | "INTEGRATION_SKIPPED" | "INTEGRATION_RECEIVED" | (string & {});
  createdAt: string;
  details: {
    integrationName?: string;
    externalId?: string;
    externalCreated?: boolean;
    inboundCreated?: boolean;
    statusRejected?: boolean;
    toStageName?: string;
    statusName?: string;
    skipReason?: string;
    sourceLabel?: string;
  } | null;
  lead: { id: string; name: string; pipelineId: string };
}

export interface IntegrationActivity {
  health: IntegrationHealth;
  entries: IntegrationActivityEntry[];
}

export async function getIntegrationActivity(name: string) {
  return (await axiosClient.get(`${ROUTE_URL}${name}/activity`)).data as IntegrationActivity;
}

/**
 * Where to send the browser to start an OAuth connect; the state is signed server-side.
 * `options` are choices that shape the consent request — Zoho's `products`.
 */
export async function getOAuthAuthorizeUrl(name: string, options?: Record<string, string>) {
  return (await axiosClient.get(`${ROUTE_URL}${name}/oauth/authorize-url`, { params: options }))
    .data as {
    url: string;
  };
}

export async function finishOAuthConnect(name: string, data: { code: string; state: string }) {
  return (await axiosClient.post(`${ROUTE_URL}${name}/oauth/callback`, data)).data as {
    success: true;
  };
}

/** Merged into the stored credential on the server; `orderEvent: null` clears it. */
export async function savePetpoojaSettings(data: {
  restaurantId?: string;
  orderEvent?: PetpoojaOrderEvent | null;
}) {
  return (await axiosClient.put(`${ROUTE_URL}petpooja/settings`, data)).data as { success: true };
}

/** The org's own order webhook URL, issued on first ask; `rotate` replaces it. */
export async function getPetpoojaWebhookUrl(rotate = false) {
  return (await axiosClient.post(`${ROUTE_URL}petpooja/webhook-url`, { rotate })).data as {
    url: string;
  };
}

export async function deleteZapierTriggerHook(data: RequestPayload) {
  return (await axiosClient.delete(`${ROUTE_URL}zapier-hook`, { data })).data;
}

export interface AmeliaConnectFields {
  /** The WordPress site; the API works out Amelia's API address from it. */
  baseUrl: string;
  /** Blank keeps the saved key. */
  apiKey: string;
  serviceId: number;
}

/**
 * Saves Amelia through the shared pasted-key connect, which first runs a slot
 * search with the details and refuses them if Amelia does.
 */
export const connectAmelia = async (fields: AmeliaConnectFields) => {
  const response = await axiosClient.post(`${ROUTE_URL}amelia/connect`, {
    baseUrl: fields.baseUrl,
    apiKey: fields.apiKey,
    serviceId: String(fields.serviceId),
  });
  return response.data as { baseUrl: string; serviceId: number };
};
