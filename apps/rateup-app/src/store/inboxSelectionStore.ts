import { create } from "zustand";

/**
 * The inbox's multi-select, for bulk assign. Selection mode is simply "something
 * is selected": long-pressing a row starts it, and clearing the last row ends it.
 * Not persisted — a selection that survived a restart would act on stale rows.
 */
type InboxSelectionState = {
  ids: ReadonlySet<string>;
  toggle: (id: string) => void;
  clear: () => void;
};

export const useInboxSelectionStore = create<InboxSelectionState>()((set) => ({
  ids: new Set(),
  toggle: (id) =>
    set((s) => {
      const ids = new Set(s.ids);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      return { ids };
    }),
  clear: () => set({ ids: new Set() }),
}));
