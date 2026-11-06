import { axiosClient } from "@/backend/apiClient";
import type { PaginationState } from "@/types/api.ts";

export type WaCatalogOrderFilter = PaginationState & { storeType?: string };

import { waCatalogUrl } from "../catalog.api";

const baseUrl = `${waCatalogUrl}/orders`;

/** One line item of a catalog order. */
export interface CatalogOrderProduct {
  retailerId: string;
  quantity: number;
  price: number;
  currency: string;
  title?: string;
  image?: string;
}

/** Where a delivered order is going, in Shopify's address shape. */
export interface CatalogOrderAddress {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  country_code?: string;
}

/** The delivery option chosen at checkout. */
export interface CatalogOrderDelivery {
  name?: string;
  charge?: number;
  days?: number;
}

/** A catalog order as the orders endpoint returns it. */
export interface CatalogOrder {
  id: string;
  createdAt: string;
  contact: { name: string; phone: string };
  products: CatalogOrderProduct[];
  status?: string;
  orderStage?: string;
  paymentMethod?: string | null;
  paymentStatus?: string;
  storeType?: string | null;
  currency?: string;
  shippingAddress?: CatalogOrderAddress;
  deliveryOption?: CatalogOrderDelivery;
  /** Set once the order has been pushed to Shopify as a draft. */
  shopifyDraftOrderId?: string;
  shopifyInvoiceUrl?: string;
}

/** One page of catalog orders. */
export interface CatalogOrderPage {
  data: CatalogOrder[];
  totalCount?: number;
}

export async function getWaCatalogOrders(
  catalogId: string,
  filter: Partial<WaCatalogOrderFilter> | null,
): Promise<CatalogOrderPage> {
  let url = `${baseUrl}/${catalogId}?page=${filter?.pageIndex}&limit=${filter?.pageSize}`;
  if (filter?.storeType) {
    url += `&storeType=${filter.storeType}`;
  }
  return (await axiosClient.get(url)).data;
}
