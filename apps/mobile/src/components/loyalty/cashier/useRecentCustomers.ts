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
/** A stable identity, so a keyless render does not hand out a fresh array every time. */
const EMPTY: RecentCustomer[] = [];

export function useRecentCustomers(orgId: string | null | undefined) {
  const key = orgId ? storageKeyFor(orgId) : null;
  const [recent, setRecent] = useState<RecentCustomer[]>([]);

  useEffect(() => {
    if (!key) return;
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

  // No key means no org to scope the list to — signed out, or the org not resolved yet.
  // Derived rather than emptied from the effect: the reset would land a render late, so
  // the previous org's customers would paint once after a switch.
  return { recent: key ? recent : EMPTY, record };
}
