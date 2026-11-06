import axios from "@/config/axios";

import type {
  CreateOrderInput,
  CreateOrderResult,
  FulfillmentStatus,
  OrderDetail,
  OrderList,
  OrderTab,
  PaymentLinkResult,
  ProductList,
  SendProductsInput,
  SendProductsResult,
  ShopStore,
} from "./shop.type";

const SHOP = "/api/shop";

/* ── reads ──────────────────────────────────────────────────────────────────── */

export async function getShopStore(): Promise<ShopStore> {
  return (await axios.get(`${SHOP}/store`)).data;
}

/** Products a customer can be sold right now. */
export async function getSellableProducts(search: string): Promise<ProductList> {
  // "sellable": a shop paid on its store's checkout can only sell that store's products.
  const params: Record<string, string> = { status: "ACTIVE", sellable: "1", limit: "50" };
  if (search.trim()) params.search = search.trim();
  return (await axios.get(`${SHOP}/products`, { params })).data;
}

export async function getOrders(query: {
  tab: OrderTab;
  contactId?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<OrderList> {
  const params: Record<string, string> = { tab: query.tab };
  if (query.contactId) params.contactId = query.contactId;
  if (query.search?.trim()) params.search = query.search.trim();
  if (query.page !== undefined) params.page = String(query.page);
  if (query.limit !== undefined) params.limit = String(query.limit);
  return (await axios.get(`${SHOP}/orders`, { params })).data;
}

export async function getOrder(id: string): Promise<OrderDetail> {
  return (await axios.get(`${SHOP}/orders/${id}`)).data;
}

/* ── selling in chat ────────────────────────────────────────────────────────── */

export async function sendProductsInChat(input: SendProductsInput): Promise<SendProductsResult> {
  return (await axios.post(`${SHOP}/chat/products`, input)).data;
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  return (await axios.post(`${SHOP}/orders`, input)).data;
}

export async function sendPaymentLink(id: string): Promise<PaymentLinkResult> {
  return (await axios.post(`${SHOP}/orders/${id}/payment-link`)).data;
}

/* ── order actions ──────────────────────────────────────────────────────────── */

export async function setFulfillment(
  id: string,
  status: Exclude<FulfillmentStatus, "RETURNED" | "CANCELLED">,
): Promise<unknown> {
  return (await axios.post(`${SHOP}/orders/${id}/fulfillment`, { status })).data;
}

export async function createShipment(
  id: string,
  body: { carrier?: string | null; trackingNumber?: string | null },
): Promise<unknown> {
  return (await axios.post(`${SHOP}/orders/${id}/shipments`, body)).data;
}

export async function confirmCod(id: string): Promise<unknown> {
  return (await axios.post(`${SHOP}/orders/${id}/confirm-cod`)).data;
}

export async function markPaid(
  id: string,
  method: "cash" | "bank" | "manual" | "cod",
): Promise<unknown> {
  return (await axios.post(`${SHOP}/orders/${id}/mark-paid`, { method })).data;
}

export async function cancelOrder(id: string, reason: string): Promise<unknown> {
  return (await axios.post(`${SHOP}/orders/${id}/cancel`, { reason, restock: true, notify: true }))
    .data;
}

/** Shop errors reply `{ code, message }` with a message written for people. */
export function shopErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== "object" || error === null) return fallback;
  const data = (error as { response?: { data?: unknown } }).response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data === "object" && data !== null) {
    const message = (data as Record<string, unknown>).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
