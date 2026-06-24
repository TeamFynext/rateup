import { axiosClient } from "@/backend/apiClient";

import { waCatalogUrl } from "./catalog.api";

const waProductSetUrl = `${waCatalogUrl}/product-sets`;

export const syncProductSets = async (catalogId: string) => {
  return await axiosClient.post(`${waProductSetUrl}/sync`, { catalogId });
};

export const getProductSetsByCatalog = async (catalogId: string) => {
  return (await axiosClient.get(`${waProductSetUrl}/catalog/${catalogId}`))
    .data;
};

export const getProductSetById = async (productSetId: string) => {
  return (await axiosClient.get(`${waProductSetUrl}/${productSetId}`)).data;
};
