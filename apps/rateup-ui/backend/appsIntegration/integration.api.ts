import { IntegratedApps } from "@/types/enums";
import { AmeliaCredential, GoogleSheetCredential } from "@/types/global";

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

type integrationSchemaProps = {
  id?: string;
  credential: {
    apiKey: string;
    baseUrl: string;
    serviceId: number;
  };
  name: string;
};

export type updateIntegrationSchema = {
  credential: any;
};

export const createIntegration = async (data: integrationSchemaProps) => {
  const response = await axiosClient.post(`${ROUTE_URL}`, data);
  return response.data;
};

export const updateIntegration = async (
  type: IntegratedApps,
  data: updateIntegrationSchema,
) => {
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
