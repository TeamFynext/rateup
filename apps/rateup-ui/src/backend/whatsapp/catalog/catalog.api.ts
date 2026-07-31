import { axiosClient } from "@/backend/apiClient";
import type { RequestPayload } from "@/types/api.ts";

import { WHATSAPP_URL } from "..";

export const waCatalogUrl = `${WHATSAPP_URL}/catalog`;

/** A WhatsApp product catalog as the catalog endpoints return it. */
export interface WaCatalog {
  catalogId: string;
  name: string;
  vertical?: string;
  checkoutMessage?: string;
  autoCheckoutEnabled?: boolean;
  connectedWaPhoneIds: Array<{ whatsappSettingsPhoneId?: string }>;
}

export async function updateWaCatalog(catalogId: string, data: RequestPayload) {
  await axiosClient.put(`${waCatalogUrl}/${catalogId}`, data);
}

export async function getWaCatalogs() {
  return (await axiosClient.get(`${waCatalogUrl}`)).data as {
    catalogId: string;
    name: string;
    vertical: string;
    connectedWaPhoneIds?: Array<{ whatsappSettingsPhoneId?: string }>;
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

export async function getWaCatalogById(catalogId: string) {
  return (await axiosClient.get(`${waCatalogUrl}/${catalogId}`)).data;
}

export async function getWaConnectedCatalog(whatsappSettingsPhoneId: string) {
  return (await axiosClient.get(`${waCatalogUrl}/connected/${whatsappSettingsPhoneId}`)).data;
}

export async function deleteWaCatalog(catalogId: string) {
  await axiosClient.delete(`${waCatalogUrl}/${catalogId}`);
}

export async function disconnectCatalogFromWaba(data: RequestPayload) {
  return (await axiosClient.delete(`${waCatalogUrl}/disconnect`, { data })).data;
}

// ─── Catalog Settings ──────────────────────────────────────────────────────

export interface DeliveryOption {
  id: string;
  name: string;
  charge: number;
  days?: string;
  enabled: boolean;
}

export interface CatalogSettings {
  catalogId: string;
  storeType: "standard" | "shopify";
  paymentMethod?: string;
  standardPaymentConfig?: Record<string, unknown>;
  collectAddress: boolean;
  collectDelivery: boolean;
  fixedDeliveryCharge?: boolean;
  fixedDeliveryAmount?: number;
  addressFlowId?: string;
  addressFlowDbId?: string;
  addressFlowStatus: "idle" | "submitting" | "review" | "approved" | "rejected";
  addressFlowFields?: string[];
  deliveryOptions: DeliveryOption[];
}

export async function getCatalogSettings(catalogId: string): Promise<CatalogSettings> {
  return (await axiosClient.get(`${waCatalogUrl}/${catalogId}/settings`)).data;
}

export async function updateCatalogSettings(catalogId: string, data: Partial<CatalogSettings>) {
  return (await axiosClient.put(`${waCatalogUrl}/${catalogId}/settings`, data)).data;
}

export async function createCatalogAddressFlow(
  catalogId: string,
  json?: RequestPayload,
  map?: RequestPayload,
) {
  return (
    await axiosClient.post(`${waCatalogUrl}/${catalogId}/create-address-flow`, {
      json,
      map,
    })
  ).data;
}
