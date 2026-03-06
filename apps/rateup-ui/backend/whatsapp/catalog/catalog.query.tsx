import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { showErrorToastFromError } from "@/utils/query";

import {
  disconnectCatalogFromWaba,
  getWaCatalogById,
  getWaCatalogs,
  getWaConnectedCatalog,
  syncWaCatalog,
  updateWaCatalog,
} from "./catalog.api";

export const useSyncCatalogs = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncWaCatalog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allWaCatalog"] });
      toast.success("connected");
    },
    onError: (error) => {
      toast.error(error?.message || "Connection failed");
    },
  });
};

export const useUpateCatalog = (catalogId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => updateWaCatalog(catalogId, data),
    onSuccess: () => {
      toast.success("updated");
      qc.invalidateQueries({ queryKey: ["WaCatalog", catalogId] });
      qc.invalidateQueries({ queryKey: ["allWaCatalog"] });
      qc.invalidateQueries({ queryKey: ["waSettings"] });
    },
    onError: (error) => {
      toast.error(error?.message || "Connection failed");
    },
  });
};

export const useDisconnectCatalogFromWa = (catalogId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: disconnectCatalogFromWaba,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["WaCatalog", catalogId] });
      qc.invalidateQueries({ queryKey: ["allWaCatalog"] });
      qc.invalidateQueries({ queryKey: ["waSettings"] });
      toast.success("disconnected");
    },
    onError: (error) => {
      toast.error(error?.message || "Unable to disconnect");
    },
  });
};

export const useWaCatalog = (catalogId) => {
  return useQuery({
    queryFn: () => getWaCatalogById(catalogId),
    queryKey: ["WaCatalog", catalogId],
    enabled: !!catalogId,
  });
};

export const useAllWaCatalogs = () => {
  return useQuery({
    queryFn: getWaCatalogs,
    queryKey: ["allWaCatalog"],
  });
};
export const useConnectedWaCatalog = (whatsappSettingsPhoneId) => {
  return useQuery({
    queryFn: () => getWaConnectedCatalog(whatsappSettingsPhoneId),
    queryKey: ["connected_catalog"],
    enabled: !!whatsappSettingsPhoneId,
  });
};
