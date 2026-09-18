import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * How the inbox list draws its rows — a per-device preference, kept apart from
 * the filter store so a filter reset leaves it alone.
 *
 * `compact` is the "RateUp Mobile Inbox" design's `compactList`: each row keeps
 * its name, time, code + message line and trailing column, and drops the chip
 * row. Same toggle as the web inbox's.
 */
type InboxViewState = {
  compact: boolean;
  toggleCompact: () => void;
};

export const useInboxViewStore = create<InboxViewState>()(
  persist(
    (set) => ({
      compact: false,
      toggleCompact: () => set((s) => ({ compact: !s.compact })),
    }),
    {
      name: "inbox-view",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
