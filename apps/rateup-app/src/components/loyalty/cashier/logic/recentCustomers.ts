/**
 * The customers served most recently on this device — the counter's fastest path, since
 * most traffic is regulars. Kept on the device (per org, in AsyncStorage), fed by the
 * receipt step.
 *
 * Ported unchanged from the web cashier — it is pure, so the two stay in step by being the
 * same code. Only the storage adapter differs: see `useRecentCustomers`.
 */
export interface RecentCustomer {
  id: string;
  contactId: string;
  name: string;
  phone: string;
  tierName: string | null;
  points: number;
  /** ISO timestamp of the last time they were served here. */
  servedAt: string;
  pendingCount: number;
}

export const RECENT_CAP = 8;
const HOUR_MS = 60 * 60 * 1000;

/** Newest first, one entry per customer, capped. */
export function upsertRecent(list: RecentCustomer[], entry: RecentCustomer): RecentCustomer[] {
  return [entry, ...list.filter((c) => c.id !== entry.id)].slice(0, RECENT_CAP);
}

export function servedInLastHour(list: RecentCustomer[], now = Date.now()): number {
  return list.filter((c) => now - Date.parse(c.servedAt) < HOUR_MS).length;
}

export function storageKeyFor(orgId: string): string {
  return `rateup:loyalty:cashier:recent:${orgId}`;
}

export function parseRecent(raw: string | null): RecentCustomer[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (c): c is RecentCustomer =>
            typeof c === "object" && c !== null && typeof (c as RecentCustomer).id === "string",
        )
      : [];
  } catch {
    return [];
  }
}
