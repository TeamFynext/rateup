import { useQuery } from "@tanstack/react-query";
import { getWaFlows } from "./waFlows.api";

export const useGetWaFlows = () => {
  return useQuery({
    queryKey: ["waFlows"],
    queryFn: async () => await getWaFlows(),
  });
};
