import { useEffect, useState } from "react";
import { create } from "zustand";

/**
 * How long a teammate's "typing" stays on screen without a refresh. Their
 * composer re-announces every {@link TYPING_HEARTBEAT_MS}, so this only lapses
 * when they closed the tab or lost the socket mid-word.
 */
export const TYPING_TTL_MS = 12_000;
/** How often a typing composer re-announces itself. */
export const TYPING_HEARTBEAT_MS = 8_000;

export interface InboxTypingEvent {
  contactId: string;
  conversationId: string | null;
  userId: string;
  userName: string | null;
  typing: boolean;
  at: string;
}

interface Typist {
  name: string | null;
  until: number;
}

interface TypingState {
  /** contactId → userId → who is typing and until when. */
  byContact: Record<string, Record<string, Typist>>;
  receive: (event: InboxTypingEvent) => void;
}

export const useTypingStore = create<TypingState>((set) => ({
  byContact: {},
  receive: (event) =>
    set((state) => {
      const current = { ...state.byContact[event.contactId] };
      if (event.typing) {
        current[event.userId] = { name: event.userName, until: Date.now() + TYPING_TTL_MS };
      } else {
        delete current[event.userId];
      }
      return { byContact: { ...state.byContact, [event.contactId]: current } };
    }),
}));

/** Names of the teammates typing in this contact's thread, leaving out `selfId`. */
export function useTeammatesTyping(contactId: string | undefined, selfId: string | undefined) {
  const typists = useTypingStore((s) => (contactId ? s.byContact[contactId] : undefined));
  // Re-render once a second while anyone shows, so a lapsed entry disappears.
  const [now, setNow] = useState(() => Date.now());
  const hasAny = !!typists && Object.keys(typists).length > 0;
  useEffect(() => {
    if (!hasAny) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasAny]);

  if (!typists) return [];
  return Object.entries(typists)
    .filter(([userId, t]) => userId !== selfId && t.until > now)
    .map(([, t]) => t.name ?? "");
}
