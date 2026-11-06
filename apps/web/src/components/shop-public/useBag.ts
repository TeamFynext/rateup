import { useCallback, useEffect, useSyncExternalStore } from "react";

import { type BagLine, parseBag } from "./catalog.ts";

const storageKey = (slug: string) => `rateup:shop-bag:${slug}`;

/** Memory is the source of truth; storage is a best-effort copy (private windows throw). */
const memory = new Map<string, BagLine[]>();
const listeners = new Set<() => void>();
const EMPTY: BagLine[] = [];

function load(slug: string): BagLine[] {
  const cached = memory.get(slug);
  if (cached) return cached;
  let raw: string | null = null;
  try {
    raw = globalThis.localStorage?.getItem(storageKey(slug)) ?? null;
  } catch {
    raw = null;
  }
  const lines = parseBag(raw);
  memory.set(slug, lines);
  return lines;
}

function save(slug: string, lines: BagLine[]) {
  memory.set(slug, lines);
  try {
    if (lines.length) globalThis.localStorage?.setItem(storageKey(slug), JSON.stringify(lines));
    else globalThis.localStorage?.removeItem(storageKey(slug));
  } catch {
    // The bag still works for this visit.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The shopper's bag for one storefront, kept across visits and in step across tabs. */
export function useBag(slug: string) {
  const lines = useSyncExternalStore(
    subscribe,
    () => load(slug),
    () => EMPTY,
  );

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey(slug)) return;
      memory.set(slug, parseBag(event.newValue));
      listeners.forEach((listener) => listener());
    };
    globalThis.addEventListener("storage", onStorage);
    return () => globalThis.removeEventListener("storage", onStorage);
  }, [slug]);

  const update = useCallback(
    (change: (current: BagLine[]) => BagLine[]) => save(slug, change(load(slug))),
    [slug],
  );

  return { lines, update };
}

/** Empties a storefront's bag once its order is placed, from wherever that happens. */
export function clearBag(slug: string) {
  save(slug, []);
}

const checkoutKey = (slug: string) => `rateup:shop-checkout:${slug}`;

/** The bag's last checkout, offered back so pressing Checkout again reopens it. */
export function lastCheckout(slug: string): string | undefined {
  try {
    return globalThis.localStorage?.getItem(checkoutKey(slug)) ?? undefined;
  } catch {
    return undefined;
  }
}

export function rememberCheckout(slug: string, token: string) {
  try {
    globalThis.localStorage?.setItem(checkoutKey(slug), token);
  } catch {
    // Without it, the next press starts a fresh checkout.
  }
}
