import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChatFilter {
  messageType: "all" | "replied" | "unread" | "usermessages";
  strictFilter: boolean;
  searchTerm?: string;
  waMessageAssignStatus?: string | null;
  blockedUsers: boolean;
  status: string[];
  assignedTeams: string[];
  /** Channel scope — a WhatsApp phone number, IG account or FB page id. Set from the sidebar's Channel selector. */
  phone?: string;
  /** Contact-label ids. Contact-grained: matches every ticket of a labelled customer. */
  labels: string[];
  /** Conversation-tag ids. Ticket-grained: matches only the tagged conversations. */
  conversationTags: string[];
  sortBy: "newest" | "oldest" | "newest_wa_created" | "oldest_wa_created";
  lifecycle?: string;
  assignedUserIds: string[];
  /**
   * Inbox Tickets v2 — orthogonal booleans, not tab values. They AND with
   * whatever status filter is active. Spelled "favorite" here to match the API
   * param and the DB column; the *count* key is British ("favourite").
   */
  favorite?: boolean;
  mentions?: boolean;
  /**
   * Spam tab. Contact-grained, unlike everything else here: it lists one row per
   * spam contact and ANDs with nothing — the status filters are ticket-level.
   */
  spam?: boolean;
}

export interface ChatFilterStore {
  filter: ChatFilter;
  setFilter: (value: ChatFilter) => void;
  clearFilter: () => void;
}

const intialValues: ChatFilter = {
  messageType: "usermessages",
  strictFilter: false,
  searchTerm: "",
  waMessageAssignStatus: null,
  blockedUsers: false,
  status: [],
  assignedTeams: [],
  phone: "",
  labels: [],
  conversationTags: [],
  lifecycle: "",
  sortBy: "newest",
  assignedUserIds: [],
};

export const useChatFilterStore = create<ChatFilterStore>()(
  persist(
    (set) => ({
      filter: intialValues,
      setFilter: (value) => set({ filter: value }),
      clearFilter: () => {
        set({
          filter: intialValues,
        });
      },
    }),
    {
      name: "chat-filter-storage", // name of the item in the storage (must be unique)
      version: 2,
      migrate: (persisted: unknown, version) => {
        if (version >= 2 || typeof persisted !== "object" || persisted === null) return persisted;
        const stored = persisted as {
          previousFilterForTab?: unknown;
          filter?: ChatFilterStore["filter"];
        };
        // v1 retired the advanced-filter popover, the only UI that could set or
        // clear `status`. A selection persisted from v0 would keep narrowing the
        // Open/All lists with nothing on screen to undo it, so drop it once. The
        // popover's write-only `previousFilterForTab` bucket goes with it.
        const { previousFilterForTab: _dropped, ...rest } = stored;
        return {
          ...rest,
          filter: {
            ...stored.filter,
            ...(version < 1
              ? {
                  status: [],
                  // The popover's "All" wrote the sentinel "all"; the sidebar's
                  // list has no such row and reads an empty string as every channel.
                  phone: stored.filter?.phone === "all" ? "" : stored.filter?.phone,
                }
              : {}),
            // v2 added conversation tags. Persisted states predate the key, and the
            // sidebar reads it as an array to decide which rows are active.
            conversationTags: stored.filter?.conversationTags ?? [],
          },
        };
      },
    },
  ),
);
