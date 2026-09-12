import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import {
  parseRecent,
  storageKeyFor,
  upsertRecent,
  type RecentCustomer,
} from "./logic/recentCustomers";

/**
 * Recently served customers, per org, on this device.
 *
 * The list itself is `logic/recentCustomers.ts`, shared with the web unchanged; only the
 * storage differs — AsyncStorage rather than `localStorage`, so the read is asynchronous
 * and the list arrives a frame or two after mount.
 *
 * Device-local by design: it is a convenience for the counter, never a record. The ledger
 * is on the server.
 */
export function useRecentCustomers(orgId: string | null | undefined) {
  const key = orgId ? storageKeyFor(orgId) : null;
  const [recent, setRecent] = useState<RecentCustomer[]>([]);

  useEffect(() => {
    if (!key) {
      setRecent([]);
      return;
    }
    let cancelled = false;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!cancelled) setRecent(parseRecent(raw));
      })
      .catch(() => {
        if (!cancelled) setRecent([]);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const record = useCallback(
    (entry: RecentCustomer) => {
      setRecent((list) => {
        const next = upsertRecent(list, entry);
        // Fire and forget: the list is already correct in state, and a storage failure
        // (full, or blocked) only means it does not survive the next launch.
        if (key) void AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [key],
  );

  return { recent, record };
}
