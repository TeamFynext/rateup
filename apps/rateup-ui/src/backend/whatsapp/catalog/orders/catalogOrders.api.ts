import { axiosClient } from "@/backend/apiClient";

import { waCatalogUrl } from "../catalog.api";

const baseUrl = `${waCatalogUrl}/orders`;

export async function getWaCatalogOrders(catalogId, filter) {
  let url = `${baseUrl}/${catalogId}?page=${filter.pageIndex}&limit=${filter.pageSize}`;
  if (filter?.storeType) {
    url += `&storeType=${filter.storeType}`;
  }
  return (await axiosClient.get(url)).data;
}
