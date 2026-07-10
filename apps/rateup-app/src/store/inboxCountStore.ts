import { create } from "zustand";

interface InboxCountStore {
  counts: {
    openCount: number;
    closedCount: number;
    allCount: number;
    newCount: number;
  };
  setCounts: (value: InboxCountStore["counts"]) => void;
}

export const useInboxCountStore = create<InboxCountStore>((set) => ({
  counts: {
    openCount: 0,
    closedCount: 0,
    allCount: 0,
    newCount: 0,
  },
  setCounts: (value) => set({ counts: value }),
}));
