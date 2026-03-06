import { useInfiniteQuery, useMutation } from "@tanstack/react-query";

import { getPhotosList, triggeringDownload } from "./unsplash.api";

export function useUnsplashPhotosList(opened: boolean, searchQuery: string) {
  return useInfiniteQuery({
    enabled: opened,
    queryKey: ["unsplashPhotosList", searchQuery],
    queryFn: ({ pageParam }) =>
      getPhotosList({ pageParams: pageParam, searchQuery }),
    getNextPageParam: (_, pages) => pages.length + 1,
    initialPageParam: 1,
  });
}

export const useTriggeringDownload = () => {
  return useMutation({
    mutationFn: triggeringDownload,
  });
};
