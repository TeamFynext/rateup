import { useQuery } from "@tanstack/react-query";
import { getUserSubscription } from "./subscription.api";

export const useSubscription = (enabled = true) =>
  useQuery({
    queryKey: ["subscription"],
    queryFn: getUserSubscription,
    enabled,
    staleTime: 0,
    gcTime: 1000 * 60 * 60 * 24,
  });