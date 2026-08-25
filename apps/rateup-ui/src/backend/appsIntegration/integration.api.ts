import type { RequestPayload } from "@/types/api.ts";
import type { IntegratedApps } from "@/types/enums.ts";
import type { AmeliaCredential, petpoojaCredential } from "@/types/global";

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
  credential: AmeliaCredential | petpoojaCredential | Record<string, never>;
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

export async function getGoogleSheetAuthorizationUrl() {
  const res = await axiosClient.get(`${ROUTE_URL}google/auth-url`);
  return res.data;
}

export async function createGoogleSheetAuthToken(data: RequestPayload) {
  const res = await axiosClient.post(`${ROUTE_URL}google/auth-token`, data);
  return res.data;
}

export const getWaPaymentConfigurations = async (whatsappSettingsId?: string) => {
  const response = await axiosClient.get(`${ROUTE_URL}wa_payment_configurations`, {
    params: whatsappSettingsId ? { whatsappSettingsId } : undefined,
  });
  return response.data;
};
export const getWaPaymentConfigurationByName = async ({
  configuration_name,
}: {
  configuration_name?: string;
}) => {
  const response = await axiosClient.post(
    `${ROUTE_URL}wa_payment_configuration/${configuration_name}`,
    {},
  );
  return response.data;
};

export const createWaPaymentConfiguration = async (data: RequestPayload) => {
  const response = await axiosClient.post(`${ROUTE_URL}wa_payment_configuration`, data);
  return response.data;
};
export const deleteWaPaymentConfiguration = async (name: string) => {
  const response = await axiosClient.delete(`${ROUTE_URL}wa_payment_configuration/${name}`);
  return response.data;
};

export const regenerateWaPaymentConfigurationOauth = async (name: string) => {
  const response = await axiosClient.get(`${ROUTE_URL}regenerate_wa_payment_config_oauth/${name}`);
  return response.data;
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
    orderEvent?: Record<string, unknown>;
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

export async function getIntegrationStatuses() {
  return (await axiosClient.get(`${ROUTE_URL}statuses`)).data;
}

export async function deleteZapierTriggerHook(data: RequestPayload) {
  return (await axiosClient.delete(`${ROUTE_URL}zapier-hook`, { data })).data;
}

export async function connectZoho(code: string, orgId: string) {
  const res = await axiosClient.post(
    `/integration/external/zoho/auth`,
    { code },
    {
      params: {
        orgId,
      },
    },
  );

  return res.data;
}
