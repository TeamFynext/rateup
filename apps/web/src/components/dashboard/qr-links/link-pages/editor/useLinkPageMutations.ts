import { useQueryClient } from "@tanstack/react-query";

import type { LinktreeData, LinktreeLink } from "@/backend/linktree/linktree.api.ts";
import { useUpdateLinktreeMutation } from "@/backend/linktree/linktree.query";

/**
 * Link edits write the whole list, and show it at once: the drag library snaps a row back to
 * its old slot if the list it is handed has not moved yet.
 */
export function useLinkPageMutations(shortUrlId: string) {
  const queryClient = useQueryClient();
  const update = useUpdateLinktreeMutation(shortUrlId);
  const key = ["linktree", shortUrlId];

  const saveLinks = async (links: LinktreeLink[]) => {
    const previous = queryClient.getQueryData<LinktreeData>(key);
    // A page with nothing on it cannot stay live; the Share tab refuses to publish one.
    const unpublish = links.length === 0 && previous?.isPublished;
    queryClient.setQueryData<LinktreeData>(key, (page) =>
      page ? { ...page, links, ...(unpublish ? { isPublished: false } : {}) } : page,
    );
    try {
      await update.mutateAsync({ shortUrlId, links, ...(unpublish ? { isPublished: false } : {}) });
    } catch {
      queryClient.setQueryData(key, previous);
    }
  };

  const setPublished = (isPublished: boolean) => update.mutateAsync({ shortUrlId, isPublished });

  return { saveLinks, setPublished, update };
}
