import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUnsyncedFlows,
  getWaFlowsFromDb,
  getWaFlowsFromWa,
  getWaFlowJson,
  importFlows,
  getWaFlowFromDb,
  createFlowInput,
  createFlow,
  updateFlow,
  getFlowPreview,
  deleteFlow,
  publishFlow,
  deprecateFlow,
} from "./flow.api";
import { showSuccessToast } from "../../../utils/notifications";
import { WaFlow } from "../../../types/global";

export const useWaFlowsFromDb = () =>
  useQuery({
    queryKey: ["flow", "db"],
    queryFn: getWaFlowsFromDb,
  });

export const useWaFlowsFromWa = () =>
  useQuery({
    queryKey: ["flow", "wa"],
    queryFn: getWaFlowsFromWa,
  });

export const useUnsyncedFlows = (enabled: boolean) =>
  useQuery({
    queryKey: ["flow", "wa"],
    queryFn: getUnsyncedFlows,
    enabled,
  });

export const useWaFlowFromDb = (dbFlowId: string) =>
  useQuery({
    queryKey: ["flow", "db", dbFlowId],
    queryFn: () => getWaFlowFromDb(dbFlowId),
    enabled: !!dbFlowId,
  });

export const useWaFlowJson = (flowId: string) =>
  useQuery({
    queryKey: ["flow", "wa", flowId],
    queryFn: () => getWaFlowJson(flowId),
    enabled: !!flowId,
  });

export const useWaFlowPreview = (dbFlowId: string) =>
  useQuery({
    queryKey: ["flow", "preview", dbFlowId],
    queryFn: () => getFlowPreview(dbFlowId),
    enabled: !!dbFlowId,
  });

export const useImportFlowsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      waFlowIds,
      teamIds,
      mapData,
    }: {
      waFlowIds: string[];
      teamIds: string[];
      mapData: object;
    }) => importFlows(waFlowIds, teamIds, mapData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flow"] });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      showSuccessToast("Flows Imported Successfully");
    },
    onError: () => {
      showSuccessToast("Error importing flows");
    },
  });
};

export const useCreateFlowMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: createFlowInput) => createFlow(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flow"] });
      qc.invalidateQueries({ queryKey: ["surveys"] });
      showSuccessToast("Flow Created Successfully");
    },
    onError: () => {
      showSuccessToast("Error creating flows");
    },
  });
};
export const useUpdateFlowMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      dbFlowId: string;
      data: Partial<Omit<WaFlow, "dbFlowId">>;
    }) => updateFlow(data.dbFlowId, data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flow"] });
      qc.invalidateQueries({ queryKey: ["surveys"] });
    },
    onError: () => {
      showSuccessToast("Error saving flows");
    },
  });
};

export const useDeleteFlowMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteFlow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flow"] });
      qc.invalidateQueries({ queryKey: ["surveys"] });
      showSuccessToast("Flow Deleted Successfully");
    },
    onError: () => {
      showSuccessToast("Error deleting flows");
    },
  });
};

export const usePublishFlowMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: publishFlow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flow"] });
      showSuccessToast("Flow Published Successfully");
    },
    onError: () => {
      showSuccessToast("Error publishing flows");
    },
  });
};

export const useDeprecateFlowMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deprecateFlow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flow"] });
      showSuccessToast("Flow Deprecated Successfully");
    },
    onError: () => {
      showSuccessToast("Error deprecating flows");
    },
  });
};
