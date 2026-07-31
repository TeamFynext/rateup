import { axiosClient } from "@/backend/apiClient";

/** A catalog product set ("collection"), as the sets endpoint returns it. */
export interface WaProductSet {
  id?: string;
  productSetId?: string;
  name?: string;
  productIds?: string[];
}

import { waCatalogUrl } from "./catalog.api";

const waProductSetUrl = `${waCatalogUrl}/product-sets`;

export const syncProductSets = async (catalogId: string) => {
  return await axiosClient.post(`${waProductSetUrl}/sync`, { catalogId });
};

export const getProductSetsByCatalog = async (catalogId: string) => {
  return (await axiosClient.get(`${waProductSetUrl}/catalog/${catalogId}`)).data as WaProductSet[];
};

export const getProductSetById = async (productSetId: string) => {
  return (await axiosClient.get(`${waProductSetUrl}/${productSetId}`)).data;
};
