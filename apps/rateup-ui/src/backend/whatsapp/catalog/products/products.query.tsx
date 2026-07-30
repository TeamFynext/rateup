import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCatalogProductBatch,
  createShopifyProduct,
  deleteCatalogProducts,
  getCatalogProducts,
  getShopifyAvailableProducts,
  importShopifyProducts,
  syncCatalogProducts,
  syncShopifyProductsWithCatalog,
  updateCatalogProducts,
} from "./products.api";

export const useWaCatalogProducts = (catalogId: string) => {
  return useQuery({
    queryFn: () => getCatalogProducts(catalogId),
    queryKey: ["catalog_products", catalogId],
    enabled: !!catalogId,
  });
};

export const useCreateBatchCatalogProducts = (catalogId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createCatalogProductBatch(catalogId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog_products", catalogId] });
    },
    onError: () => {},
  });
};

export const useSyncCatalogProducts = (catalogId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => syncCatalogProducts(catalogId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog_products", catalogId] });
    },
  });
};

export const useDeletCatalogProducts = (catalogId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { productIds: { id: string; hotel_reatiler_id?: string }[] }) =>
      deleteCatalogProducts(catalogId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog_products", catalogId] });
    },
  });
};

export const useUpdateCatalogProducts = (catalogId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => updateCatalogProducts(catalogId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog_products", catalogId] });
    },
  });
};

export const useShopifyAvailableProducts = (catalogId: string, enabled: boolean) => {
  return useQuery({
    queryFn: () => getShopifyAvailableProducts(catalogId),
    queryKey: ["shopify_available_products", catalogId],
    enabled: !!catalogId && enabled,
    staleTime: 0,
    gcTime: 0,
  });
};

export const useImportShopifyProducts = (catalogId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: any[]) => importShopifyProducts(catalogId, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog_products", catalogId] });
      qc.invalidateQueries({
        queryKey: ["shopify_available_products", catalogId],
      });
    },
  });
};

export const useCreateShopifyProduct = (catalogId: string) => {
  return useMutation({
    mutationFn: (data: {
      title: string;
      description: string;
      brand: string;
      price: number;
      currencyCode: string;
      imageUrl?: string;
    }) => createShopifyProduct(catalogId, data),
  });
};

export const useSyncShopifyWithCatalog = (catalogId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncShopifyProductsWithCatalog(catalogId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog_products", catalogId] });
    },
  });
};
