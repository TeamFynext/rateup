import { useQuery } from "@tanstack/react-query";
import { getSubscription } from "./subscription.api";

export const useSubscription = () =>
  useQuery({
    queryKey: ["subscription"],
    queryFn: getSubscription,
  });
