import { useQuery } from "@tanstack/react-query";
import { getWaFlowsFromDb } from "./flow.api";

export const useWaFlowsFromDb = (enabled = true) =>
  useQuery({
    queryKey: ["flow", "db"],
    queryFn: getWaFlowsFromDb,
    enabled,
  });