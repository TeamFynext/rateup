import { useEffect } from "react";
import { AppState } from "react-native";

import { useCashierOutboxStore } from "@/store/cashierOutboxStore";
import { onSettle } from "@/utils/cashierOutbox/drain";

/**
 * Loads the queue and decides when to try sending it.
 *
 * There is no background runner (see `utils/cashierOutbox/drain.ts` for why not), so every
 * trigger is a foreground one: the screen coming into focus, the app returning to the
 * foreground, and a slow tick while anything is waiting. Deliberately no connectivity
 * listener — the source of truth for "can we reach the server" is a request outcome, and
 * `expo-network` would only be a hint.
 */
const TICK_MS = 15_000;

export function useCashierOutbox(orgId: string | null | undefined, focused: boolean) {
  const items = useCashierOutboxStore((state) => state.items);
  const online = useCashierOutboxStore((state) => state.online);
  const load = useCashierOutboxStore((state) => state.load);
  const drain = useCashierOutboxStore((state) => state.drain);

  useEffect(() => {
    if (orgId) void load(orgId);
  }, [orgId, load]);

  // On focus, and on returning to the foreground: the two moments a person is most likely
  // to be standing at the counter wondering where their purchase went.
  useEffect(() => {
    if (!orgId || !focused) return;
    void drain();
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") void drain();
    });
    return () => subscription.remove();
  }, [orgId, focused, drain]);

  const waiting = items.some((item) => item.status === "pending" || item.status === "unresolved");

  useEffect(() => {
    if (!orgId || !focused || !waiting) return;
    const timer = setInterval(() => void drain(), TICK_MS);
    return () => clearInterval(timer);
  }, [orgId, focused, waiting, drain]);

  return { items, online };
}

/** Re-exported so a screen can react to a settle without importing the drain module. */
export { onSettle };
