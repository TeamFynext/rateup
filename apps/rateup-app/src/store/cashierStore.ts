import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Receipt } from "@/components/loyalty/cashier/logic/cashier.types";
import {
  parseStep,
  stepBack,
  stepIsReachable,
  type CashierStep,
} from "@/components/loyalty/cashier/logic/cashier.steps";

/**
 * The counter's step and open customer.
 *
 * On the web these live in the URL, which survives a refresh and can be deep-linked. There
 * is no URL here, and expo-router params are the wrong substitute: every `go()` would
 * become a navigation action on a tab screen (a whole-tab re-render and a keyboard flicker
 * per step), params are strings so the receipt could not live in them at all, and Android's
 * back button would walk the *navigation* stack rather than the step graph. The web
 * navigates with `replace: true` throughout, so there is no history to mirror — which is
 * the only thing router params would have bought.
 *
 * A module-scoped store also survives what React Native does far more of than a browser:
 * a tab blur that unmounts the screen, Fast Refresh, an Android low-memory activity
 * restart. Losing the step there is survivable; losing the receipt mid-transaction, with
 * the customer still at the counter, is not.
 *
 * And it is readable from outside React — which the offline drain needs, since it has to
 * correct a receipt that is still on screen and cannot reach component state.
 *
 * The three-valued `phone` argument is reproduced from the web exactly: **omitted keeps the
 * current phone, `null` clears it, a string sets it**. `step: "search"` is the absent
 * value — no phone means `search`, and a phone with no step means `customer`.
 */

interface CashierState {
  /** Digits only. This is what the `>= 10` query gate and the recents dedup rely on. */
  phone: string | null;
  step: CashierStep;
  /** Local, and wins over `step`: an action's outcome is shown until it is dismissed. */
  receipt: Receipt | null;
  /** When the step was last set, so a stale one is not restored after a cold start. */
  savedAt: number | null;

  go: (step: CashierStep, phone?: string | null) => void;
  openCustomer: (phone: string) => void;
  setReceipt: (receipt: Receipt | null) => void;
  /** Android back. `false` means "not ours" — let the navigator handle it. */
  back: () => boolean;
  reset: () => void;
}

/** Digits only — what the API's phone lookup takes, and what dedups a recents entry. */
function normalise(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * How long a restored step is worth resuming.
 *
 * A cold start that lands on `purchase` for a customer who left two hours ago is worse
 * than starting fresh: the next person at the counter is served against the wrong record.
 */
const RESUME_WINDOW_MS = 10 * 60 * 1000;

export const useCashierStore = create<CashierState>()(
  persist(
    (set, get) => ({
      phone: null,
      step: "search",
      receipt: null,
      savedAt: null,

      go: (step, phone) => {
        const current = get().phone;
        const resolved = phone === undefined ? current : phone && normalise(phone);
        const next = resolved && resolved.length > 0 ? resolved : null;
        set({
          phone: next,
          step: stepIsReachable(step, next) ? step : "search",
          savedAt: Date.now(),
        });
      },

      // Clearing the receipt is part of opening someone: a receipt outranks the step, so
      // without this the previous customer's outcome would still be on screen.
      openCustomer: (phone) => {
        set({ receipt: null });
        get().go("customer", phone);
      },

      setReceipt: (receipt) => set({ receipt, savedAt: Date.now() }),

      back: () => {
        const { receipt, step, phone } = get();
        // The receipt is a step in the eyes of the person holding the phone.
        if (receipt) {
          set({ receipt: null, step: phone ? "customer" : "search" });
          return true;
        }
        const previous = stepBack(step);
        if (!previous) return false;
        set({
          step: previous,
          phone: previous === "search" ? null : phone,
          savedAt: Date.now(),
        });
        return true;
      },

      reset: () => set({ phone: null, step: "search", receipt: null, savedAt: null }),
    }),
    {
      name: "rateup:loyalty:cashier:step",
      storage: createJSONStorage(() => AsyncStorage),
      // The receipt is deliberately not persisted. Resurrected after a cold start it is a
      // claim about a transaction that may never have happened — and if a write is still
      // queued, the outbox is the honest place to say so.
      partialize: (state) => ({ phone: state.phone, step: state.step, savedAt: state.savedAt }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const fresh = state.savedAt !== null && Date.now() - state.savedAt < RESUME_WINDOW_MS;
        const step = parseStep(state.step);
        if (!fresh || !step || !stepIsReachable(step, state.phone)) {
          state.phone = null;
          state.step = "search";
          state.savedAt = null;
        }
      },
    },
  ),
);
