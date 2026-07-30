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
}

/** A catalog order as the orders endpoint returns it. */
export interface CatalogOrder {
  id: string;
  createdAt: string;
  contact: { name: string; phone: string };
  products: CatalogOrderProduct[];
  status?: string;
}

export async function getWaCatalogOrders(
  catalogId: string,
  filter: Partial<WaCatalogOrderFilter> | null,
) {
  let url = `${baseUrl}/${catalogId}?page=${filter?.pageIndex}&limit=${filter?.pageSize}`;
  if (filter?.storeType) {
    url += `&storeType=${filter.storeType}`;
  }
  return (await axiosClient.get(url)).data;
}
