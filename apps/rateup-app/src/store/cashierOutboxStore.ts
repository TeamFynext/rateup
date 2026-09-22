import * as Crypto from "expo-crypto";
import { create } from "zustand";

import type {
  OutboxContext,
  OutboxItem,
  OutboxKind,
} from "@/components/loyalty/cashier/logic/outbox";
import { queryClient } from "@/config/queryClient";
import { cashierInvalidations } from "@/api/loyalty/loyalty.keys";
import { discardOutbox, enqueue, listOutbox, updateOutbox } from "@/utils/cashierOutbox/db";
import { drainOutbox } from "@/utils/cashierOutbox/drain";

/**
 * The queue, as the screen sees it.
 *
 * Kept in a store rather than a hook's state because the drain is a non-React module and
 * has to be able to read and write it — and because the counter's header chip and the
 * customer view both need the same numbers without prop-drilling through eight screens.
 *
 * ## What "offline" means here
 *
 * Not what a connectivity API says. A captive portal and a dead backend both report
 * "connected", and `expo-network` is not a dependency of this app in any case. `online` is
 * therefore derived from **request outcomes**: it goes false when a write finds no server
 * and true again the moment one reaches it. That is the only definition that matches what
 * the queue actually cares about.
 */

interface CashierOutboxState {
  items: OutboxItem[];
  /** Last known reachability of the API, from request outcomes only. */
  online: boolean;
  orgId: string | null;

  load: (orgId: string) => Promise<void>;
  /** Writes a row and returns its id, which doubles as the award's `orderId`. */
  queue: (input: {
    orgId: string;
    kind: OutboxKind;
    payload: Record<string, unknown>;
    context: OutboxContext;
  }) => Promise<string>;
  drain: () => Promise<boolean>;
  /** Removes an unsent row — a true undo of a queued purchase. */
  discard: (id: string) => Promise<void>;
  /** Puts a reviewed or failed row back in the queue after an explicit tap. */
  release: (id: string) => Promise<void>;
  setOnline: (online: boolean) => void;
}

export const useCashierOutboxStore = create<CashierOutboxState>((set, get) => ({
  items: [],
  online: true,
  orgId: null,

  load: async (orgId) => {
    set({ orgId });
    try {
      set({ items: await listOutbox(orgId) });
    } catch {
      // The store is a cache of a cache; a read failure leaves the queue invisible rather
      // than breaking the counter.
      set({ items: [] });
    }
  },

  queue: async ({ orgId, kind, payload, context }) => {
    const id = Crypto.randomUUID();
    const item: OutboxItem = {
      id,
      orgId,
      kind,
      status: "pending",
      // The id travels as `orderId` so the drain can ask the server "did this one land?".
      payload: kind === "award" ? { ...payload, orderId: id } : payload,
      context,
      attempts: 0,
      nextAttemptAt: null,
      createdAt: Date.now(),
      lastError: null,
    };
    await enqueue(item);
    set((state) => ({ items: [...state.items, item] }));
    return id;
  },

  drain: async () => {
    const orgId = get().orgId;
    if (!orgId) return false;
    const settledAny = await drainOutbox(orgId);
    await get().load(orgId);
    // Whatever landed changed a balance the screen is showing. The drain itself is a
    // non-React module, which is why the invalidation happens here rather than there —
    // and why `queryClient` is a module singleton.
    if (settledAny) {
      for (const queryKey of cashierInvalidations(undefined)) {
        queryClient.invalidateQueries({ queryKey });
      }
    }
    return settledAny;
  },

  discard: async (id) => {
    await discardOutbox(id);
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
  },

  release: async (id) => {
    await updateOutbox(id, { status: "pending", nextAttemptAt: null, lastError: null });
    const orgId = get().orgId;
    if (orgId) await get().load(orgId);
  },

  setOnline: (online) => {
    if (get().online !== online) set({ online });
  },
}));

/** Callable from a non-React module — the api layer marks reachability from its outcomes. */
export function markApiReachable(online: boolean): void {
  useCashierOutboxStore.getState().setOnline(online);
}
