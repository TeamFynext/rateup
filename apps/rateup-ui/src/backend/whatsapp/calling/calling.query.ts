import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { callKeys, type CallLogFilters, getCallAnalytics, getCallLog } from "./calling.api";

/** The call log, 50 rows a page, newest first. */
export const useCallLog = (filters: CallLogFilters) =>
  useInfiniteQuery({
    queryKey: callKeys.log(filters),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => getCallLog(filters, pageParam),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });

export const useCallAnalytics = (filters: { from: Date; to: Date; phoneId?: string }) =>
  useQuery({
    queryKey: callKeys.analytics(filters),
    queryFn: () => getCallAnalytics(filters),
    placeholderData: keepPreviousData,
  });
