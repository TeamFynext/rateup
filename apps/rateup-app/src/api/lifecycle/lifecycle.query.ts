import { useQuery } from "@tanstack/react-query";
import { getLifeCycles } from "./lifecycle.api";

export const useLifeCyclesQuery = () =>
  useQuery({
    queryKey: ["lifecycles"],
    queryFn: getLifeCycles,
  });