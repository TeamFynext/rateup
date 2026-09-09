import { create } from "zustand";

interface InboxCountStore {
  counts: {
    openCount: number;
    closedCount: number;
    allCount: number;
    newCount: number;
  };
  setCounts: (value: InboxCountStore["counts"]) => void;
  /**
   * Nudge the badges by a delta, without waiting for a refetch.
   *
   * A message that opens a brand-new ticket has to show up on the segment
   * immediately — the counts query only refires on a manual refresh or an
   * assignment mutation, so until then the pill would keep quoting the number
   * from whenever the screen was opened. The next `setCounts` overwrites this
   * with the authoritative figure. Mirrors rateup-ui's `bumpSectionCounts`.
   */
  bumpCounts: (delta: Partial<InboxCountStore["counts"]>) => void;
}

export const useInboxCountStore = create<InboxCountStore>((set) => ({
  counts: {
    openCount: 0,
    closedCount: 0,
    allCount: 0,
    newCount: 0,
  },
  setCounts: (value) => set({ counts: value }),
  bumpCounts: (delta) =>
    set((state) => ({
      counts: {
        openCount: state.counts.openCount + (delta.openCount ?? 0),
        closedCount: state.counts.closedCount + (delta.closedCount ?? 0),
        allCount: state.counts.allCount + (delta.allCount ?? 0),
        newCount: state.counts.newCount + (delta.newCount ?? 0),
      },
    })),
}));
