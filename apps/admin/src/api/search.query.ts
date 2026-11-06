import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { search } from "./search.api";

export const MIN_SEARCH_LENGTH = 2;

export function useGlobalSearch(q: string) {
  const term = q.trim();

  return useQuery({
    queryKey: ["staff", "search", term],
    queryFn: ({ signal }) => search(term, signal),
    enabled: term.length >= MIN_SEARCH_LENGTH,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
