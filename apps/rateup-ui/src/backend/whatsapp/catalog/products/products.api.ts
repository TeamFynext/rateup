import { axiosClient } from "@/backend/apiClient";
import type { RequestPayload } from "@/types/api.ts";

/** A catalog product row as the catalog products endpoint returns it. */
export interface CatalogProductRow {
  id: string;
  retailer_id?: string;
  shopifyVariantId?: string;
  hotel_id?: string;
  hotel_room_id?: string;
  hotel_retailer_id?: string;
  currency?: string;
  price?: number;
  base_price?: number;
  sale_price?: number;
  image?: string;
  image_link?: string;
  url?: string;
  productProps?: {
    title?: string;
    name?: string;
    brand?: string;
    description?: string;
    condition?: string;
    availability?: string;
    currency?: string;
    price?: string;
    base_price?: string;
    sale_price?: string;
    image?: Array<{ url: string; tag: string[] }>;
    image_link?: string;
    url?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** A Shopify product that is not in the catalog yet, as the import list returns it. */
export interface ShopifyAvailableProduct {
  retailer_id: string;
  title: string;
  price?: number | string;
  /** Shopify always sends one; WooCommerce only while the product is on sale. */
  sale_price?: number | string;
  currencyCode?: string;
  availability?: string;
  image?: Array<{ url: string }>;
}

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
  return (await axiosClient.get(`${baseUrl}/${catalogId}`)).data as CatalogProductRow[];
}

export async function deleteCatalogProducts(catalogId: string, data: RequestPayload) {
  return (await axiosClient.delete(`${baseUrl}/${catalogId}`, { data })).data;
}

export async function updateCatalogProducts(catalogId: string, data: RequestPayload) {
  return (await axiosClient.put(`${baseUrl}/${catalogId}`, data)).data;
}

export async function getShopifyAvailableProducts(catalogId: string) {
  return (await axiosClient.get(`${baseUrl}/shopify-available/${catalogId}`))
    .data as ShopifyAvailableProduct[];
}

export async function importShopifyProducts(
  catalogId: string,
  items: RequestPayload[],
): Promise<{ imported: number }> {
  return (await axiosClient.post(`${baseUrl}/import-shopify/${catalogId}`, { items })).data;
}

/** The WooCommerce twin of `getShopifyAvailableProducts`: products not yet in this catalog. */
export async function getWooAvailableProducts(catalogId: string) {
  return (await axiosClient.get(`${baseUrl}/woocommerce-available/${catalogId}`))
    .data as ShopifyAvailableProduct[];
}

export async function importWooProducts(
  catalogId: string,
  items: RequestPayload[],
): Promise<{ imported: number }> {
  return (await axiosClient.post(`${baseUrl}/import-woocommerce/${catalogId}`, { items })).data;
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
