"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
      toast.success("Product sets synced");
    },
    onError: (error) => {
      toast.error(error?.message || "Sync failed");
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

const useProductSetById = (productSetId: string) => {
  return useQuery({
    queryKey: ["productSet", productSetId],
    queryFn: () => getProductSetById(productSetId),
    enabled: !!productSetId,
  });
};
