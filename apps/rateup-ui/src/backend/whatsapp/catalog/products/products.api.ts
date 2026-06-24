import { axiosClient } from "@/backend/apiClient";

import { waCatalogUrl } from "../catalog.api";

const baseUrl = `${waCatalogUrl}/products`;

// add catalogid param

export async function createCatalogProductBatch(catalogId, data) {
  return axiosClient.post(`${baseUrl}/${catalogId}`, data);
}

export async function syncCatalogProducts(catalogId, data: { limit?: number; next?: string }) {
  return (await axiosClient.post(`${baseUrl}/sync/${catalogId}`, data)).data;
}

export async function getCatalogProducts(catalogId) {
  return (await axiosClient.get(`${baseUrl}/${catalogId}`)).data;
}

export async function deleteCatalogProducts(catalogId, data) {
  return (await axiosClient.delete(`${baseUrl}/${catalogId}`, { data })).data;
}

export async function updateCatalogProducts(catalogId, data) {
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
