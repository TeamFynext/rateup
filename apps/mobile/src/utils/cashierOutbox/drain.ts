import axios from "@/config/axios";
import {
  backoffFor,
  classifyOutcome,
  consumesAttempt,
  isAlreadyDone,
  nextAction,
  type OutboxItem,
  type SendOutcome,
} from "@/components/loyalty/cashier/logic/outbox";

import { listOutbox, pruneOutbox, updateOutbox } from "./db";

/**
 * Sending the queue.
 *
 * Single-flight and foreground-only, both deliberately.
 *
 * **Single-flight** because the probe discipline depends on there never being more than one
 * request whose outcome is unknown.
 *
 * **Foreground-only** because there is no background runner in this app and adding one for
 * this would be a mistake: iOS `BGTaskScheduler` gives no timing guarantee, so it would not
 * fix the staleness problem it appears to solve — and a background POST that awards points
 * under a rule set nobody is looking at is worse than a foreground one staff can see. Rows
 * survive an app kill (they are in SQLite); *sending* waits for someone to open the app,
 * and the UI says so.
 */

let running = false;

/** Every settle, so the screen can correct a receipt that is still up. */
export type SettleListener = (event: SettleEvent) => void;

export interface SettleEvent {
  item: OutboxItem;
  status: "done" | "failed" | "unresolved" | "needs_review";
  /** Present when the server (or a probe) reported real figures. */
  confirmed?: { points: number; balanceAfter: number };
  /** True when a duplicate rejection was treated as success. */
  successEquivalent?: boolean;
  message?: string | null;
}

const listeners = new Set<SettleListener>();

export function onSettle(listener: SettleListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(event: SettleEvent): void {
  for (const listener of listeners) listener(event);
}

/** The endpoint each kind posts to. Paths carry `/api`; see `loyalty.api.ts`. */
const ENDPOINTS = {
  award: () => "/api/loyalty/accounts/award-points",
  apply_redemption: () => "/api/loyalty/redemptions/apply",
  redeem_shortcode: (item: OutboxItem) =>
    `/api/loyalty/accounts/rewards/${String(item.payload.shortCode)}/redeem`,
} as const;

/**
 * Runs the queue for one org until it can make no more progress.
 *
 * Returns whether anything settled, so the caller can refresh what it is showing.
 */
export async function drainOutbox(orgId: string): Promise<boolean> {
  if (running || !orgId) return false;
  running = true;
  let settledAny = false;

  try {
    const items = await listOutbox(orgId);
    for (const item of items) {
      // Rows carry the org they were written under, and the server takes `createdBy` from
      // the session — draining someone else's queue would misattribute it, or hard-fail on
      // an org mismatch.
      if (item.orgId !== orgId) continue;

      const action = nextAction(item);
      if (action.kind === "skip" || action.kind === "review") continue;
      // The ladder is per item, and the queue is FIFO — an item still in backoff blocks
      // nothing behind it, so the loop moves on.
      if (action.kind === "wait") continue;

      const settled = action.kind === "probe" ? await probeItem(item) : await sendItem(item);
      if (settled) settledAny = true;
      // A send that left the outcome unknown must stop the run: the next item would be a
      // second in-flight request, and the probe discipline assumes there is only ever one.
      if (settled === null) break;
    }
    await pruneOutbox();
  } finally {
    running = false;
  }

  return settledAny;
}

/** `true` when it settled, `false` when it is to be retried, `null` when left unresolved. */
async function sendItem(item: OutboxItem): Promise<boolean | null> {
  const outcome = await post(item);
  const verdict = classifyOutcome(item.kind, outcome);
  const attempts = item.attempts + (consumesAttempt(outcome) ? 1 : 0);

  if (verdict.status === "done") {
    await updateOutbox(item.id, {
      status: "done",
      attempts,
      settledAt: Date.now(),
      lastError: verdict.successEquivalent ? outcome.message : null,
      result: outcome.body ?? null,
    });
    emit({
      item,
      status: "done",
      confirmed: confirmedFrom(outcome.body),
      successEquivalent: verdict.successEquivalent,
      message: outcome.message,
    });
    return true;
  }

  if (verdict.status === "unresolved") {
    await updateOutbox(item.id, {
      status: "unresolved",
      attempts,
      lastError: outcome.message ?? "No answer from the server",
    });
    emit({ item, status: "unresolved", message: outcome.message });
    return null;
  }

  if (verdict.status === "failed") {
    await updateOutbox(item.id, {
      status: "failed",
      attempts,
      settledAt: Date.now(),
      lastError: outcome.message ?? "The server refused it",
    });
    emit({ item, status: "failed", message: outcome.message });
    return true;
  }

  await updateOutbox(item.id, {
    status: "pending",
    attempts,
    nextAttemptAt: Date.now() + backoffFor(attempts),
    lastError: outcome.message,
  });
  return false;
}

/**
 * Asks the server whether an award we lost the answer to actually landed.
 *
 * The ledger row carries our `orderId` in its `metadata`, which is the only client-supplied
 * field on any of these endpoints that survives into something readable. Found means it
 * landed and the figures can be adopted; not found means a retry is *provably* safe; no
 * answer at all means stay unresolved and probe again later — never send.
 *
 * Note the filter name: `customerId` maps to the account id server-side, so it takes
 * `context.accountId`, not the `contactId` in the payload.
 */
async function probeItem(item: OutboxItem): Promise<boolean | null> {
  const orderId = item.payload.orderId;
  if (typeof orderId !== "string") {
    await updateOutbox(item.id, { status: "needs_review" });
    emit({ item, status: "needs_review", message: "Cannot tell whether this was sent" });
    return true;
  }

  try {
    const response = await axios.get("/api/loyalty/redemptions/transactions", {
      params: {
        customerId: item.context.accountId,
        transactionType: "earn",
        limit: 20,
      },
    });
    const rows = (response.data as { transactions?: LedgerRow[] } | LedgerRow[] | null) ?? [];
    const transactions = Array.isArray(rows) ? rows : (rows.transactions ?? []);
    const landed = transactions.find(
      (row) => (row.metadata as { orderId?: unknown } | null)?.orderId === orderId,
    );

    if (landed) {
      await updateOutbox(item.id, {
        status: "done",
        settledAt: Date.now(),
        // The ledger row carries points and a balance and nothing else — no tier movement,
        // no send outcome. Neither may be synthesised from it.
        result: { points: landed.points, balanceAfter: landed.balanceAfter, viaProbe: true },
        lastError: null,
      });
      emit({
        item,
        status: "done",
        confirmed: { points: landed.points, balanceAfter: landed.balanceAfter },
        message: "Confirmed — whether the WhatsApp went out is unknown.",
      });
      return true;
    }

    // The probe answered and our row is not there, so the send never committed.
    await updateOutbox(item.id, {
      status: "pending",
      nextAttemptAt: null,
      lastError: null,
    });
    return false;
  } catch {
    // Still no network, or the probe itself failed. Stay unresolved; do not send.
    return null;
  }
}

interface LedgerRow {
  id: string;
  points: number;
  balanceAfter: number;
  metadata?: Record<string, unknown> | null;
}

function confirmedFrom(body: unknown): { points: number; balanceAfter: number } | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const awarded = (body as { pointsAwarded?: unknown }).pointsAwarded;
  const customer = (body as { customer?: { currentPoints?: unknown } }).customer;
  if (typeof awarded === "number" && typeof customer?.currentPoints === "number") {
    return { points: awarded, balanceAfter: customer.currentPoints };
  }
  return undefined;
}

interface PostOutcome extends SendOutcome {
  body?: unknown;
}

async function post(item: OutboxItem): Promise<PostOutcome> {
  const url = ENDPOINTS[item.kind](item);
  try {
    const response = await axios.post(url, bodyFor(item));
    return {
      httpStatus: response.status,
      message: null,
      transportFailed: false,
      body: response.data,
    };
  } catch (error) {
    const response = (error as { response?: { status?: number; data?: unknown } }).response;
    if (!response || typeof response.status !== "number") {
      return { httpStatus: null, message: transportMessage(error), transportFailed: true };
    }
    return {
      httpStatus: response.status,
      message: serverMessage(response.data),
      transportFailed: false,
      body: response.data,
    };
  }
}

/** The short-code redeem puts its code in the path, so it posts no body. */
function bodyFor(item: OutboxItem): Record<string, unknown> | undefined {
  return item.kind === "redeem_shortcode" ? undefined : item.payload;
}

function transportMessage(error: unknown): string {
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message ? message : "No answer from the server";
}

function serverMessage(data: unknown): string | null {
  if (typeof data === "string") return data;
  if (typeof data === "object" && data !== null) {
    for (const key of ["error", "message"] as const) {
      const value = (data as Record<string, unknown>)[key];
      if (typeof value === "string" && value) return value;
    }
  }
  return null;
}

export { isAlreadyDone };
