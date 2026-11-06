import { axiosClient } from "@/backend/apiClient";
import type { CatalogOrderProduct } from "@/backend/whatsapp/catalog/orders/catalogOrders.api";
import { downloadBlob } from "@/utils/downloadBlob";

const BASE_URL = "/commerce";

export type SpreadsheetFormat = "xlsx" | "ods";

/**
 * Filters shared by every commerce endpoint. `catalogId` is the channel —
 * the storefront (WhatsApp number → catalog) the dashboard is scoped to.
 */
export interface CommerceFilter {
  from?: Date | string;
  to?: Date | string;
  catalogId?: string;
  phoneId?: string;
}

export interface CommerceOrderFilter extends CommerceFilter {
  page?: number;
  limit?: number;
  orderStage?: string;
  status?: string;
  paymentStatus?: string;
  storeType?: string;
  search?: string;
}

export interface CommerceChannel {
  catalogId: string;
  phoneId: string | null;
  name: string;
  phoneNumber: string | null;
  storeType: string;
}

export interface CommerceOverview {
  totalSales: number;
  paidSales: number;
  orderCount: number;
  avgOrderValue: number;
  productsLive: number;
  delta: {
    totalSales: number | null;
    orderCount: number | null;
    avgOrderValue: number | null;
  };
}

export interface CommerceTimeseriesPoint {
  date: string;
  sales: number;
  orders: number;
}

export interface CommerceTopProduct {
  retailerId: string;
  name: string;
  image: string | null;
  price: number;
  units: number;
  revenue: number;
  /** 0-100, relative to the best seller — the bar width on the overview. */
  share: number;
}

export interface CommerceOrder {
  id: string;
  catalogId: string;
  products: CatalogOrderProduct[];
  paymentMethod: string | null;
  paymentStatus: string | null;
  status: string | null;
  orderStage: string | null;
  storeType: string | null;
  transactionId: string | null;
  createdAt: string;
  deliveryOption: { charge?: number } | null;
  contact: { id: string; name: string | null; phone: string | null } | null;
  total: number;
  itemCount: number;
  currency: string | null;
}

/** Drops empty values and serializes dates, so an unset filter isn't sent as "undefined". */
function toParams(filter: object = {}) {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined || value === null || value === "") continue;
    params[key] = value instanceof Date ? value.toISOString() : String(value);
  }
  return params;
}

export async function getCommerceChannels(): Promise<CommerceChannel[]> {
  const res = await axiosClient.get(`${BASE_URL}/channels`);
  return res.data;
}

export async function getCommerceOverview(filter: CommerceFilter): Promise<CommerceOverview> {
  const res = await axiosClient.get(`${BASE_URL}/overview`, { params: toParams(filter) });
  return res.data;
}

export async function getCommerceTimeseries(
  filter: CommerceFilter & { interval?: "day" | "week" | "month" },
): Promise<CommerceTimeseriesPoint[]> {
  const res = await axiosClient.get(`${BASE_URL}/overview/timeseries`, {
    params: toParams(filter),
  });
  return res.data;
}

export async function getCommerceTopProducts(
  filter: CommerceFilter & { limit?: number },
): Promise<CommerceTopProduct[]> {
  const res = await axiosClient.get(`${BASE_URL}/overview/top-products`, {
    params: toParams(filter),
  });
  return res.data;
}

export async function getCommerceOrders(
  filter: CommerceOrderFilter,
): Promise<{ data: CommerceOrder[]; totalCount: number }> {
  const res = await axiosClient.get(`${BASE_URL}/orders`, { params: toParams(filter) });
  return res.data;
}

/** Exports POST the on-screen filters back, so the file matches what the user sees. */
async function downloadExport(
  path: string,
  body: object,
  basename: string,
  format: SpreadsheetFormat,
) {
  const res = await axiosClient.post(`${BASE_URL}${path}`, toParams(body), {
    responseType: "blob",
    timeout: 0,
  });
  const blob = new Blob([res.data], { type: String(res.headers["content-type"] ?? "") });
  downloadBlob(blob, `${basename}.${format}`);
}

export async function exportCommerceOrders(
  filter: Omit<CommerceOrderFilter, "page" | "limit"> & { format?: SpreadsheetFormat },
) {
  const format = filter.format ?? "xlsx";
  await downloadExport("/export/orders", { ...filter, format }, "commerce_orders", format);
}

export async function exportCommerceOverview(
  filter: CommerceFilter & { format?: SpreadsheetFormat; interval?: "day" | "week" | "month" },
) {
  const format = filter.format ?? "xlsx";
  await downloadExport("/export/overview", { ...filter, format }, "commerce_overview", format);
}
