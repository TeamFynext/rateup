import { axiosClient } from "@/backend/apiClient";
import type { RequestPayload } from "@/types/api.ts";

import { waCatalogUrl } from "../catalog.api";

const baseUrl = `${waCatalogUrl}/products`;

// add catalogid param

export async function createCatalogProductBatch(catalogId: string, data: RequestPayload) {
  return axiosClient.post(`${baseUrl}/${catalogId}`, data);
}

export async function syncCatalogProducts(
  catalogId: string,
  data: { limit?: number; next?: string },
) {
  return (await axiosClient.post(`${baseUrl}/sync/${catalogId}`, data)).data;
}

export async function getCatalogProducts(catalogId: string) {
  return (await axiosClient.get(`${baseUrl}/${catalogId}`)).data;
}

export async function deleteCatalogProducts(catalogId: string, data: RequestPayload) {
  return (await axiosClient.delete(`${baseUrl}/${catalogId}`, { data })).data;
}

export async function updateCatalogProducts(catalogId: string, data: RequestPayload) {
  return (await axiosClient.put(`${baseUrl}/${catalogId}`, data)).data;
}

export async function getShopifyAvailableProducts(catalogId: string) {
  return (await axiosClient.get(`${baseUrl}/shopify-available/${catalogId}`)).data as any[];
}

export async function importShopifyProducts(
  catalogId: string,
  items: any[],
): Promise<{ imported: number }> {
  return (await axiosClient.post(`${baseUrl}/import-shopify/${catalogId}`, { items })).data;
}

export async function createShopifyProduct(
  catalogId: string,
  data: {
    title: string;
    description: string;
    brand: string;
    price: number;
    currencyCode: string;
    imageUrl?: string;
  },
) {
  return (await axiosClient.post(`${baseUrl}/shopify-create/${catalogId}`, data)).data;
}

export async function syncShopifyProductsWithCatalog(
  catalogId: string,
): Promise<{ updated: number; unchanged: number; notFound: number }> {
  return (await axiosClient.post(`${baseUrl}/shopify-sync/${catalogId}`, {})).data;
}
