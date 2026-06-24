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

export async function syncConnectedWaCatalog(): Promise<
  { wabaId: string; synced: boolean; catalogIds?: string[]; warning?: string }[]
> {
  return (await axiosClient.post(`${waCatalogUrl}/sync-connected`)).data;
}

export async function getWaCatalogById(catalogId) {
  return (await axiosClient.get(`${waCatalogUrl}/${catalogId}`)).data;
}

export async function getWaConnectedCatalog(whatsappSettingsPhoneId: string) {
  return (await axiosClient.get(`${waCatalogUrl}/connected/${whatsappSettingsPhoneId}`)).data;
}

export async function deleteWaCatalog(catalogId: string) {
  await axiosClient.delete(`${waCatalogUrl}/${catalogId}`);
}

export async function disconnectCatalogFromWaba(data) {
  return (await axiosClient.delete(`${waCatalogUrl}/disconnect`, { data })).data;
}

// ─── Catalog Settings ──────────────────────────────────────────────────────

export type DeliveryOption = {
  id: string;
  name: string;
  charge: number;
  days?: string;
  enabled: boolean;
};

export type CatalogSettings = {
  catalogId: string;
  storeType: "standard" | "shopify";
  paymentMethod?: string;
  standardPaymentConfig?: Record<string, any>;
  collectAddress: boolean;
  collectDelivery: boolean;
  fixedDeliveryCharge?: boolean;
  fixedDeliveryAmount?: number;
  addressFlowId?: string;
  addressFlowDbId?: string;
  addressFlowStatus: "idle" | "submitting" | "review" | "approved" | "rejected";
  addressFlowFields?: any[];
  deliveryOptions: DeliveryOption[];
};

export async function getCatalogSettings(catalogId: string): Promise<CatalogSettings> {
  return (await axiosClient.get(`${waCatalogUrl}/${catalogId}/settings`)).data;
}

export async function updateCatalogSettings(catalogId: string, data: Partial<CatalogSettings>) {
  return (await axiosClient.put(`${waCatalogUrl}/${catalogId}/settings`, data)).data;
}

export async function createCatalogAddressFlow(catalogId: string, json?: any, map?: any) {
  return (
    await axiosClient.post(`${waCatalogUrl}/${catalogId}/create-address-flow`, {
      json,
      map,
    })
  ).data;
}
