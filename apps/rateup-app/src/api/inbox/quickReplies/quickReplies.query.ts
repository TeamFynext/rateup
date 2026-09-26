import { useQuery } from "@tanstack/react-query";

import { getQuickReplies } from "./quickReplies.api";

export const useQuickReplies = () =>
  useQuery({
    queryKey: ["quick-replies"],
    queryFn: getQuickReplies,
    staleTime: 5 * 60 * 1000,
  });
