import { axiosClient } from "@/backend/apiClient";

import { waCatalogUrl } from "../catalog.api";

const baseUrl = `${waCatalogUrl}/orders`;

export async function getWaCatalogOrders(catalogId, filter) {
  return (
    await axiosClient.get(
      `${baseUrl}/${catalogId}?page=${filter.pageIndex}&limit=${filter.pageSize}`,
    )
  ).data;
}
