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

/** A call still on the line is rarely older than this; the strip's "missed" tile narrows to the last hour itself. */
const LIVE_WINDOW_MS = 4 * 60 * 60 * 1000;
const LIVE_REFETCH_MS = 15_000;

/**
 * The most recent calls, for the live strip above the log. Call events on the socket
 * refresh it as they land; the interval covers the ones the socket missed.
 */
export const useLiveCalls = (phoneId?: string) =>
  useQuery({
    queryKey: callKeys.live(phoneId),
    queryFn: async () => {
      const now = Date.now();
      // A minute past now, so a call the server stamped ahead of this clock still shows.
      const to = new Date(now + 60_000);
      const page = await getCallLog(
        { from: new Date(now - LIVE_WINDOW_MS), to, phoneId },
        undefined,
        100,
      );
      return page.items;
    },
    refetchInterval: LIVE_REFETCH_MS,
  });

export const useCallAnalytics = (filters: { from: Date; to: Date; phoneId?: string }) =>
  useQuery({
    queryKey: callKeys.analytics(filters),
    queryFn: () => getCallAnalytics(filters),
    placeholderData: keepPreviousData,
  });
