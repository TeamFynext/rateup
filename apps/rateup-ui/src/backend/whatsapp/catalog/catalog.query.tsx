import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createCatalogAddressFlow,
  deleteWaCatalog,
  disconnectCatalogFromWaba,
  getCatalogSettings,
  getWaCatalogById,
  getWaCatalogs,
  getWaConnectedCatalog,
  syncConnectedWaCatalog,
  syncWaCatalog,
  updateCatalogSettings,
  updateWaCatalog,
} from "./catalog.api";

export const useDeleteWaCatalog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (catalogId: string) => deleteWaCatalog(catalogId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allWaCatalog"] });
      toast.success("Catalog deleted");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to delete catalog");
    },
  });
};

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

export const useSyncConnectedCatalog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncConnectedWaCatalog,
    onSuccess: (results) => {
      qc.invalidateQueries({ queryKey: ["allWaCatalog"] });
      const warnings = results.filter((r) => !r.synced).map((r) => r.warning);
      if (warnings.length > 0) {
        warnings.forEach((w) => toast.warning(w));
      } else {
        toast.success("Connected catalog synced successfully");
      }
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to sync connected catalog");
    },
  });
};

export const useUpateCatalog = (catalogId: string) => {
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

export const useDisconnectCatalogFromWa = (catalogId: string) => {
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

export const useWaCatalog = (catalogId: string) => {
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
export const useConnectedWaCatalog = (whatsappSettingsPhoneId: string | undefined) => {
  return useQuery({
    queryFn: () => getWaConnectedCatalog(whatsappSettingsPhoneId ?? ""),
    queryKey: ["connected_catalog", whatsappSettingsPhoneId],
    enabled: !!whatsappSettingsPhoneId,
  });
};

// ─── Catalog Settings ─────────────────────────────────────────────────

export const useCatalogSettings = (catalogId: string, pollingEnabled = false) => {
  return useQuery({
    queryFn: () => getCatalogSettings(catalogId),
    queryKey: ["catalogSettings", catalogId],
    enabled: !!catalogId,
    refetchInterval: pollingEnabled ? 10000 : false,
  });
};

export const useUpdateCatalogSettings = (catalogId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => updateCatalogSettings(catalogId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalogSettings", catalogId] });
      toast.success("Settings saved");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to save settings");
    },
  });
};

export const useCreateAddressFlow = (catalogId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ json, map }: { json?: any; map?: any } = {}) =>
      createCatalogAddressFlow(catalogId, json, map),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalogSettings", catalogId] });
      toast.success("Address flow submitted to Meta for review!");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to create address flow");
    },
  });
};
