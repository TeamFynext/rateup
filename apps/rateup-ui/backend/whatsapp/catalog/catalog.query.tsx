import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";
import { showErrorToastFromError } from "@/utils/query";

import {
  getWaCatalogById,
  getWaCatalogs,
  syncWaCatalog,
  updateWaCatalog,
} from "./catalog.api";

export const useWaCatalog = (catalogId = null) => {
  const qc = useQueryClient();
  const sync = useMutation({
    mutationFn: syncWaCatalog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allWaCatalog"] });
      showSuccessToast("connected");
    },
    onError: (e) => {
      showErrorToastFromError(e, "Connection failed");
    },
  });

  const update = useMutation({
    mutationFn: (data: any) => updateWaCatalog(catalogId, data),
    onSuccess: () => {
      showSuccessToast("updated");
      qc.invalidateQueries({ queryKey: ["WaCatalog", catalogId] });
      qc.invalidateQueries({ queryKey: ["allWaCatalog"] });
    },
    onError: (e) => {
      showErrorToastFromError(e, "Connection failed");
    },
  });

  const getCatalogInfo = useQuery({
    queryFn: () => getWaCatalogById(catalogId),
    queryKey: ["WaCatalog", catalogId],
    enabled: !!catalogId,
  });

  const allCatalogs = useQuery({
    queryFn: getWaCatalogs,
    queryKey: ["allWaCatalog"],
  });

  return {
    sync,
    getCatalogInfo,
    update,
    allCatalogs,
  };
};
