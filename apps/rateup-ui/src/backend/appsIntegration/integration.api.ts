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

interface integrationSchemaProps {
  id?: string;
  credential: AmeliaCredential | petpoojaCredential;
  name: string;
}

export interface updateIntegrationSchema {
  credential: any;
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

export async function createGoogleSheetAuthToken(data) {
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

export const createWaPaymentConfiguration = async (data) => {
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

export async function getAllIntegrations() {
  return (await axiosClient.get(`${ROUTE_URL}all`)).data;
}

export async function getIntegrationStatuses() {
  return (await axiosClient.get(`${ROUTE_URL}statuses`)).data;
}

export async function deleteZapierTriggerHook(data) {
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
