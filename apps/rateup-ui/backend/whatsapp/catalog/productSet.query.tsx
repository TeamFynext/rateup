"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";
import { showErrorToastFromError } from "@/utils/query";

import {
  getProductSetById,
  getProductSetsByCatalog,
  syncProductSets,
} from "./productSet.api";

export const useSyncProductSets = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncProductSets,
    onSuccess: (_, catalogId) => {
      qc.invalidateQueries({ queryKey: ["productSets", catalogId] });
      showSuccessToast("Product sets synced");
    },
    onError: (e) => {
      showErrorToastFromError(e, "Sync failed");
    },
  });
};

export const useProductSetsByCatalog = (catalogId: string) => {
  return useQuery({
    queryKey: ["productSets", catalogId],
    queryFn: () => getProductSetsByCatalog(catalogId),
    enabled: !!catalogId,
  });
};

export const useProductSetById = (productSetId: string) => {
  return useQuery({
    queryKey: ["productSet", productSetId],
    queryFn: () => getProductSetById(productSetId),
    enabled: !!productSetId,
  });
};
