import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCatalogProductBatch,
  deleteCatalogProducts,
  getCatalogProducts,
  syncCatalogProducts,
  updateCatalogProducts,
} from "./products.api";

export const useWaCatalogProducts = (catalogId) => {
  const qc = useQueryClient();
  const createBatch = useMutation({
    mutationFn: (data: any) => createCatalogProductBatch(catalogId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog_products", catalogId] });
    },
    onError: () => {},
  });

  const productQuery = useQuery({
    queryFn: () => getCatalogProducts(catalogId),
    queryKey: ["catalog_products", catalogId],
    enabled: !!catalogId,
  });

  const syncProducts = useMutation({
    mutationFn: (data: any) => syncCatalogProducts(catalogId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog_products", catalogId] });
    },
  });

  const deleteProducts = useMutation({
    mutationFn: (data: {
      productIds: { id: string; hotel_reatiler_id?: string }[];
    }) => deleteCatalogProducts(catalogId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog_products", catalogId] });
    },
  });

  const updateProducts = useMutation({
    mutationFn: (data: any) => updateCatalogProducts(catalogId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog_products", catalogId] });
    },
  });
  return {
    createBatch,
    syncProducts,
    productQuery,
    deleteProducts,
    updateProducts,
  };
};
