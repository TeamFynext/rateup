import { axiosClient } from "@/backend/apiClient";
import type { PaginationState } from "@/types/api.ts";

export type WaCatalogOrderFilter = PaginationState & { storeType?: string };

import { waCatalogUrl } from "../catalog.api";

const baseUrl = `${waCatalogUrl}/orders`;

export async function getWaCatalogOrders(catalogId: string, filter: WaCatalogOrderFilter) {
  let url = `${baseUrl}/${catalogId}?page=${filter.pageIndex}&limit=${filter.pageSize}`;
  if (filter?.storeType) {
    url += `&storeType=${filter.storeType}`;
  }
  return (await axiosClient.get(url)).data;
}
