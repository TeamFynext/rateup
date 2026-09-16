import { useQuery } from "@tanstack/react-query";

import { getLoyaltyGiveback } from "./giveback.api";
import { loyaltyKeys } from "./loyalty.keys";

export const useLoyaltyGiveback = (enabled = true) =>
  useQuery({
    queryKey: loyaltyKeys.giveback(),
    queryFn: getLoyaltyGiveback,
    enabled,
    staleTime: 60_000,
  });
