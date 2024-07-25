import { IntegratedApps } from "@/types/enums";

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
  };
  name: string;
};

export const createIntegration = async (data: integrationSchemaProps) => {
  const response = await axiosClient.post(`${ROUTE_URL}`, data);
  return response.data;
};

export const updateIntegration = async (data: integrationSchemaProps) => {
  const response = await axiosClient.put(`${ROUTE_URL}${data.id}`, data);
  return response.data;
};

export const deleteIntegration = async (id: string) => {
  const response = await axiosClient.delete(`${ROUTE_URL}${id}`);
  return response.data;
};
