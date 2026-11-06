import { useCallback, useEffect, useMemo, useState } from "react";

import { ANNOUNCEMENTS, type Announcement } from "@/config/announcements";

const READ_KEY = "rateup:whats-new:read";

/** Newest first. Sorted once — `ANNOUNCEMENTS` is a module constant. */
const SORTED: readonly Announcement[] = [...ANNOUNCEMENTS].sort((a, b) =>
  b.publishedAt.localeCompare(a.publishedAt),
);

const KNOWN_IDS = new Set(SORTED.map((item) => item.id));

function readStoredIds(): string[] {
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    // Ids of retired entries are dropped so the key cannot grow without bound.
    return parsed.filter((id): id is string => typeof id === "string" && KNOWN_IDS.has(id));
  } catch {
    // Corrupt value, or storage blocked (private mode, embedded webview).
    // Everything reads as unread, which is the harmless direction to fail in.
    return [];
  }
}

function writeStoredIds(ids: string[]) {
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify(ids));
  } catch {
    // Read state is a convenience; losing it must never break the sidebar.
  }
}

/**
 * The "What's new" list plus per-browser read state.
 *
 * Read state is deliberately not part of the first render: the server has no
 * `localStorage`, so it renders (and hydrates) as "nothing read yet" and only
 * then reconciles in an effect. `hydrated` is false until that happens —
 * callers should hold back unread badges until it flips, otherwise every reader
 * sees a full unread count flash on load.
 */
export function useAnnouncements() {
  const [readIds, setReadIds] = useState<readonly string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setReadIds(readStoredIds());
    setHydrated(true);
  }, []);

  const readSet = useMemo(() => new Set(readIds), [readIds]);

  const unreadCount = useMemo(
    () => (hydrated ? SORTED.filter((item) => !readSet.has(item.id)).length : 0),
    [hydrated, readSet],
  );

  const isUnread = useCallback((id: string) => hydrated && !readSet.has(id), [hydrated, readSet]);

  const markRead = useCallback((id: string) => {
    setReadIds((current) => {
      if (current.includes(id)) return current;
      const next = [...current, id];
      writeStoredIds(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    const next = SORTED.map((item) => item.id);
    writeStoredIds(next);
    setReadIds(next);
  }, []);

  return {
    announcements: SORTED,
    unreadCount,
    isUnread,
    markRead,
    markAllRead,
    hydrated,
  };
}
