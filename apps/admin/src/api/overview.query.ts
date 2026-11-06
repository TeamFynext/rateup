import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { getOverview } from "./overview.api";

export const overviewQueryOptions = (months: number) =>
  queryOptions({
    queryKey: ["staff", "overview", months],
    queryFn: () => getOverview(months),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
