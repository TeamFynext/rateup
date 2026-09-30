import axios, { isAxiosError, type AxiosInstance } from "axios";

import type { WooTopic } from "./woocommerce.types.js";

/** How the keys travel. See {@link createWooClient}. */
export type WooAuthMode = "basic" | "query";

export interface WooKeys {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  authMode?: WooAuthMode;
}

/**
 * An axios client for one store's REST API (`/wp-json/wc/v3`).
 *
 * Keys go as HTTP Basic by default. Some hosts — Apache running PHP as CGI,
 * mostly — drop the `Authorization` header before WordPress sees it, and every
 * call answers 401. WooCommerce also accepts the keys as query parameters over
 * HTTPS, so `query` is the fallback the connect flow switches to when Basic is
 * refused; it is kept second because query strings end up in access logs.
 *
 * No redirects: a store that redirects its API (http→https, a www alias) would
 * have axios replay the request somewhere the admin never approved.
 */
export function createWooClient({
  storeUrl,
  consumerKey,
  consumerSecret,
  authMode = "basic",
}: WooKeys): AxiosInstance {
  return axios.create({
    baseURL: `${storeUrl}/wp-json/wc/v3`,
    timeout: 15_000,
    maxRedirects: 0,
    headers: { Accept: "application/json" },
    ...(authMode === "basic"
      ? { auth: { username: consumerKey, password: consumerSecret } }
      : { params: { consumer_key: consumerKey, consumer_secret: consumerSecret } }),
  });
}

export function isWooUnauthorized(error: unknown) {
  return isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403);
}

export function isWooNotFound(error: unknown) {
  return isAxiosError(error) && error.response?.status === 404;
}

/**
 * Whether WooCommerce answers at this address, before sending the admin off to
 * approve anything. The REST index is public and lists the `wc/v3` namespace
 * once WooCommerce is active; its `name` is the site's title.
 */
export async function detectWooCommerce(
  storeUrl: string,
): Promise<
  { found: true; name?: string } | { found: false; reason: "no_wordpress" | "no_woocommerce" }
> {
  try {
    const response = await axios.get<{ name?: string; namespaces?: string[] }>(
      `${storeUrl}/wp-json/`,
      { timeout: 10_000, maxRedirects: 0, headers: { Accept: "application/json" } },
    );
    const namespaces = Array.isArray(response.data?.namespaces) ? response.data.namespaces : null;
    if (!namespaces) return { found: false, reason: "no_wordpress" };
    if (!namespaces.includes("wc/v3")) return { found: false, reason: "no_woocommerce" };
    return { found: true, name: response.data.name };
  } catch {
    return { found: false, reason: "no_wordpress" };
  }
}

interface WooSystemStatus {
  environment?: { site_url?: string; version?: string };
  settings?: { currency?: string };
}

/** Cheapest call that needs a valid key, and it says which WooCommerce this is. */
export async function getWooSystemStatus(client: AxiosInstance) {
  const response = await client.get<WooSystemStatus>("/system_status");
  return response.data;
}

/** The store's base country, e.g. "IN:KL". Needs a key with read access to settings. */
export async function getWooDefaultCountry(client: AxiosInstance): Promise<string | undefined> {
  const response = await client.get<{ value?: string }>(
    "/settings/general/woocommerce_default_country",
  );
  return typeof response.data?.value === "string" ? response.data.value : undefined;
}

export interface WooWebhook {
  id: number;
  name: string;
  status: "active" | "paused" | "disabled";
  topic: string;
  delivery_url: string;
}

export async function getWooWebhook(client: AxiosInstance, id: number) {
  const response = await client.get<WooWebhook>(`/webhooks/${id}`);
  return response.data;
}

export async function createWooWebhook(
  client: AxiosInstance,
  webhook: { name: string; topic: WooTopic; delivery_url: string; secret: string },
) {
  const response = await client.post<WooWebhook>("/webhooks", { ...webhook, status: "active" });
  return response.data;
}

/** `force`, since webhooks have no trash; without it the call is refused. */
export async function deleteWooWebhook(client: AxiosInstance, id: number) {
  await client.delete(`/webhooks/${id}`, { params: { force: true } });
}

/** The coupon fields RateUp writes; amounts are decimal strings, as WooCommerce takes them. */
export interface WooCouponInput {
  code: string;
  description: string;
  discount_type: "percent" | "fixed_cart";
  amount: string;
  /** UTC, without a zone suffix — WooCommerce's `_gmt` format. */
  date_expires_gmt: string | null;
  minimum_amount?: string;
  individual_use: boolean;
  usage_limit: number;
  usage_limit_per_user: number;
}

export interface WooCoupon {
  id: number;
  code: string;
}

export async function createWooCoupon(client: AxiosInstance, coupon: WooCouponInput) {
  const response = await client.post<WooCoupon>("/coupons", coupon);
  return response.data;
}

export async function updateWooCoupon(
  client: AxiosInstance,
  id: number | string,
  patch: Partial<WooCouponInput>,
) {
  const response = await client.put<WooCoupon>(`/coupons/${id}`, patch);
  return response.data;
}

export interface WooProduct {
  id: number;
  name: string;
  images?: Array<{ src?: string }>;
}

/** A product as the catalog sync reads it (`/products`, and a `product.updated` delivery). */
export interface WooCatalogProduct {
  id: number;
  name: string;
  /** `simple`, `variable`, `grouped`, `external`, or `variation` for a variation's own delivery. */
  type: string;
  status?: string;
  parent_id?: number;
  permalink?: string;
  description?: string;
  short_description?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  stock_status?: "instock" | "outofstock" | "onbackorder" | string;
  images?: Array<{ src?: string }>;
  variations?: number[];
}

/** A variation of a variable product (`/products/{id}/variations`). */
export interface WooVariation {
  id: number;
  permalink?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  stock_status?: string;
  status?: string;
  image?: { src?: string } | null;
  attributes?: Array<{ name?: string; option?: string }>;
}

const PAGE = 100;

/** Every published product, a page of a hundred at a time. */
export async function listAllWooProducts(client: AxiosInstance) {
  const products: WooCatalogProduct[] = [];
  for (let page = 1; ; page++) {
    const response = await client.get<WooCatalogProduct[]>("/products", {
      params: { per_page: PAGE, page, status: "publish" },
    });
    products.push(...response.data);
    if (response.data.length < PAGE) return products;
  }
}

export async function getWooCatalogProduct(client: AxiosInstance, id: number) {
  const response = await client.get<WooCatalogProduct>(`/products/${id}`);
  return response.data;
}

export async function listWooVariations(client: AxiosInstance, productId: number) {
  const variations: WooVariation[] = [];
  for (let page = 1; ; page++) {
    const response = await client.get<WooVariation[]>(`/products/${productId}/variations`, {
      params: { per_page: PAGE, page },
    });
    variations.push(...response.data);
    if (response.data.length < PAGE) return variations;
  }
}

/** The store's currency code, when the connect did not record it. */
export async function getWooCurrency(client: AxiosInstance): Promise<string | undefined> {
  const response = await client.get<{ value?: string }>("/settings/general/woocommerce_currency");
  return response.data?.value || undefined;
}

/** Published products matching a search, for picking in an automation rule. */
export async function searchWooProducts(client: AxiosInstance, search: string, perPage = 20) {
  const response = await client.get<WooProduct[]>("/products", {
    params: { search: search || undefined, per_page: perPage, status: "publish" },
  });
  return response.data;
}
