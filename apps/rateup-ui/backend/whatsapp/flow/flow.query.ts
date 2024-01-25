import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUnsyncedFlows,
  getWaFlowsFromDb,
  getWaFlowsFromWa,
  getWaFlowJson,
  importFlows,
  getWaFlowFromDb,
} from "./flow.api";
import { showSuccessToast } from "../../../utils/notifications";

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

export const useWaFlowFromDb = (flowId: string) =>
  useQuery({
    queryKey: ["flow", "db", flowId],
    queryFn: () => getWaFlowFromDb(flowId),
  });

export const useWaFlowJson = (flowId: string) =>
  useQuery({
    queryKey: ["flow", "wa", flowId],
    queryFn: () => getWaFlowJson(flowId),
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
