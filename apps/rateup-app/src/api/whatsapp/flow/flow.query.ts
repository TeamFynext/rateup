import { useQuery } from "@tanstack/react-query";
import {
  getWaFlowFromDb,
  getWaFlowsFromDb,
} from "./flow.api";

export const useWaFlowsFromDb = (enabled = true) =>
  useQuery({
    queryKey: ["flow", "db"],
    queryFn: getWaFlowsFromDb,
    enabled,
  });

export const useWaFlowFromDb = (dbFlowId: string) =>
  useQuery({
    queryKey: ["flow", "db", dbFlowId],
    queryFn: () => getWaFlowFromDb(dbFlowId),
    enabled: !!dbFlowId,
  });
