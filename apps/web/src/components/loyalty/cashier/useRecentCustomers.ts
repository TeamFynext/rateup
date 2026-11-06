import { useCallback, useEffect, useState } from "react";

import {
  parseRecent,
  storageKeyFor,
  upsertRecent,
  type RecentCustomer,
} from "./recentCustomers.ts";

/**
 * Recently served customers, per org, on this device. Browser storage only: it is a
 * convenience for the counter, never a record — the ledger is in Activity.
 */
export function useRecentCustomers(orgId: string | undefined) {
  const key = orgId ? storageKeyFor(orgId) : null;
  const [recent, setRecent] = useState<RecentCustomer[]>([]);

  useEffect(() => {
    if (!key) return;
    try {
      setRecent(parseRecent(window.localStorage.getItem(key)));
    } catch {
      setRecent([]);
    }
  }, [key]);

  const record = useCallback(
    (entry: RecentCustomer) => {
      setRecent((list) => {
        const next = upsertRecent(list, entry);
        if (key) {
          try {
            window.localStorage.setItem(key, JSON.stringify(next));
          } catch {
            // Storage can be full or blocked; the list simply does not persist.
          }
        }
        return next;
      });
    },
    [key],
  );

  return { recent, record };
}
