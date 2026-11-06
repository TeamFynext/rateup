import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * How the inbox list draws its rows — a per-browser preference, not a filter,
 * so it lives apart from `chat-filter-storage` and survives a filter reset.
 *
 * `compact` is the "RateUp Inbox Tickets v3" design's `compactList`: each row
 * keeps its name, time, ticket code + subject and right rail, and drops the
 * message snippet and the chip row.
 */
interface InboxViewStore {
  compact: boolean;
  toggleCompact: () => void;
}

export const useInboxViewStore = create<InboxViewStore>()(
  persist(
    (set) => ({
      compact: false,
      toggleCompact: () => set((s) => ({ compact: !s.compact })),
    }),
    { name: "inbox-view-storage" },
  ),
);
