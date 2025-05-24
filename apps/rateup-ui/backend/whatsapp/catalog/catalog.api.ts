import { axiosClient } from "@/backend/apiClient";

import { WHATSAPP_URL } from "..";

export const waCatalogUrl = `${WHATSAPP_URL}/catalog`;

export async function updateWaCatalog(catalogId, data) {
  await axiosClient.put(`${waCatalogUrl}/${catalogId}`, data);
}

export async function getWaCatalogs() {
  return (await axiosClient.get(`${waCatalogUrl}`)).data as {
    catalogId: string;
    name: string;
    vertical: string;
  }[];
}

export async function syncWaCatalog(businessId) {
  await axiosClient.post(`${waCatalogUrl}/${businessId}`);
}

export async function getWaCatalogById(catalogId) {
  return (await axiosClient.get(`${waCatalogUrl}/${catalogId}`)).data;
}
