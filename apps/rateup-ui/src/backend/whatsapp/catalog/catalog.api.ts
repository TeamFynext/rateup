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
    connectedWaPhoneIds?: any[];
  }[];
}

export async function syncWaCatalog() {
  await axiosClient.post(`${waCatalogUrl}/sync`);
}

export async function getWaCatalogById(catalogId) {
  return (await axiosClient.get(`${waCatalogUrl}/${catalogId}`)).data;
}

export async function getWaConnectedCatalog(whatsappSettingsPhoneId: string) {
  return (
    await axiosClient.get(
      `${waCatalogUrl}/connected/${whatsappSettingsPhoneId}`,
    )
  ).data;
}

export async function disconnectCatalogFromWaba(data) {
  return (await axiosClient.delete(`${waCatalogUrl}/disconnect`, { data }))
    .data;
}
