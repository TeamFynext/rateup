/**
 * The offline write queue's decisions.
 *
 * Everything in this file is pure, and that is deliberate: two functions here decide
 * whether a customer gets awarded twice for one purchase. They have to be testable without
 * SQLite, a network, or a device — the storage adapter and the drain loop are thin shells
 * around them (`utils/cashierOutbox/`).
 *
 * ## Why not simply retry
 *
 * None of the loyalty endpoints takes an idempotency header, so a blind retry of a request
 * that actually committed awards the points a second time. `award-points` does, however,
 * accept an `orderId`, and the server writes it into the ledger row's `metadata` — so a
 * client-generated id gives us **probe before retry**: after an ambiguous outcome, read the
 * customer's recent transactions and look for our own id. Found means it landed; not found
 * means retrying is provably safe; no answer at all means wait, and *never* send again.
 *
 * The other two queued writes only flip a state, and their duplicate rejections
 * ("already applied", "already redeemed") mean the world is already how we wanted it — so
 * they are success-equivalent and can be retried blind.
 */

/** What can be queued. `redeem` and `register` are deliberately absent — see `refusalFor`. */
export type OutboxKind = "award" | "apply_redemption" | "redeem_shortcode";

export type OutboxStatus =
  /** Waiting to be sent. */
  | "pending"
  /** Sent, outcome unknown. Only a probe may clear this — never another send. */
  | "unresolved"
  /** Too old to send without someone looking at it. */
  | "needs_review"
  | "done"
  | "failed";

export interface OutboxItem {
  /** A UUID. Also sent as `orderId` on an award, which is what makes the probe possible. */
  id: string;
  orgId: string;
  kind: OutboxKind;
  status: OutboxStatus;
  /** The request body, exactly as it will be posted. */
  payload: Record<string, unknown>;
  /**
   * Everything the outbox sheet and the divergence report need to render with no network:
   * who it was for, what was read out, what the balance was.
   */
  context: OutboxContext;
  attempts: number;
  /** Epoch ms; `null` means "as soon as possible". */
  nextAttemptAt: number | null;
  createdAt: number;
  lastError: string | null;
}

export interface OutboxContext {
  accountId: string;
  contactId: string;
  phone: string;
  customerName: string;
  tierName: string | null;
  /** What the counter read out. Compared with the server's figure when this settles. */
  estimatedPoints?: number;
  basePoints?: number;
  ruleName?: string;
  rewardName?: string;
  purchaseAmount?: number;
  note?: string;
  balanceBefore?: number;
  /** When `balanceBefore` was last read from the server. */
  balanceAsOf?: string;
}

/* ── what may be queued, and what may not ───────────────────────────────────── */

export type RefusableAction = "redeem" | "register";

/**
 * Why an action cannot wait for the network.
 *
 * `redeem` spends the balance, and the server enforces stock and per-customer usage caps
 * that no client can see. Worse, its `redemptionCode` is minted server-side and handed to
 * the customer — so a replay after an ambiguous outcome is not merely risky, it is
 * *unverifiable*: there is no client-supplied field on the request that survives into
 * anything we could read back.
 *
 * `register` allocates the account id and referral code the very next screen needs, and
 * `award-points` cannot be queued behind it because it takes a `contactId` that does not
 * exist yet.
 */
export function refusalFor(action: RefusableAction, pointsName: string): string {
  switch (action) {
    case "redeem":
      return `Redeeming spends ${pointsName}, and that has to be checked on the server — it can't wait for the network. Add the purchase now, or give the reward as a gift instead.`;
    case "register":
      return "Joining needs the network: the account and referral code are created on the server. Take their number and register the moment there is signal.";
  }
}

/* ── retry schedule ─────────────────────────────────────────────────────────── */

/** 0s, 5s, 20s, 1m, 5m, 15m, then every 30m. Full jitter, so a queue does not thunder. */
const BACKOFF_MS = [0, 5_000, 20_000, 60_000, 300_000, 900_000] as const;
const BACKOFF_CAP_MS = 1_800_000;
export const MAX_ATTEMPTS = 8;

export function backoffFor(attempts: number, random = Math.random): number {
  const base = BACKOFF_MS[attempts] ?? BACKOFF_CAP_MS;
  return Math.round(base * random());
}

/**
 * How long a queued purchase may wait before a person has to look at it.
 *
 * `awardPointsSchema` has no timestamp field: the server applies whichever earning rules
 * are in force *at drain time* and stamps `createdAt = now()`. So a 21:00 happy-hour
 * purchase drained at 09:00 earns the wrong points, lands on the wrong day in the ledger,
 * and sends the customer a WhatsApp about yesterday's coffee. Past this, it needs one
 * explicit tap per item rather than draining on its own.
 */
export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

/* ── the two decisions ──────────────────────────────────────────────────────── */

export type NextAction =
  | { kind: "send" }
  /** Ask the server whether the last send landed. Only awards can be probed. */
  | { kind: "probe" }
  | { kind: "wait"; delayMs: number }
  | { kind: "review" }
  | { kind: "skip" };

/**
 * What the drain should do with one item, right now.
 *
 * The `unresolved` branch is the whole point: an item whose outcome is unknown is never
 * sent again, only probed. An award that cannot be probed (no `orderId` — an item written
 * by an older build) stays unresolved forever rather than risking a double award, and the
 * outbox sheet asks a human.
 */
export function nextAction(item: OutboxItem, now = Date.now()): NextAction {
  if (item.status === "done" || item.status === "failed") return { kind: "skip" };
  if (item.status === "needs_review") return { kind: "review" };

  if (item.status === "unresolved") {
    return item.kind === "award" && typeof item.payload.orderId === "string"
      ? { kind: "probe" }
      : { kind: "review" };
  }

  if (item.attempts >= MAX_ATTEMPTS) return { kind: "skip" };
  // Stale only blocks an award: the other two carry no rule or timestamp the delay changes.
  if (item.kind === "award" && now - item.createdAt > STALE_AFTER_MS) return { kind: "review" };
  if (item.nextAttemptAt !== null && item.nextAttemptAt > now) {
    return { kind: "wait", delayMs: item.nextAttemptAt - now };
  }
  return { kind: "send" };
}

/** What came back from a send, reduced to the three things that matter. */
export interface SendOutcome {
  /** An HTTP status, or `null` when no response arrived at all. */
  httpStatus: number | null;
  /** The server's message, when there was one. */
  message: string | null;
  /** True when the request itself never completed (no response, timeout, abort). */
  transportFailed: boolean;
}

export interface Classification {
  status: OutboxStatus;
  /** The server refused because the thing was already done — the state we wanted. */
  successEquivalent: boolean;
  retryable: boolean;
}

/**
 * Duplicate rejections, by pattern rather than by exact string.
 *
 * **This is the fragile part of the design, and it is fragile on purpose rather than by
 * accident.** The API raises these as plain `new Error("Redemption already applied")` with
 * no machine-readable code, so a copy-edit on the server turns a benign duplicate into a
 * red "failed" row on the counter's screen. The pattern is loose to survive rewording, and
 * the drain *re-reads the state* before declaring success on a match — matching the words
 * alone would be trusting a sentence. Adding a `code` to those API errors would retire
 * this; it is worth asking for.
 */
const ALREADY_DONE = /\balready\b(?:\s+\w+){0,3}\s+(?:applied|redeemed|used|assigned|exists)\b/i;

export function isAlreadyDone(message: string | null | undefined): boolean {
  return Boolean(message && ALREADY_DONE.test(message));
}

/**
 * What one send's outcome means for the item.
 *
 * The ordering matters. A transport failure or a 5xx is *ambiguous* — the request may well
 * have committed — so it becomes `unresolved`, never a retry. A 4xx is the server having
 * read the request and rejected it, so retrying will only be rejected again.
 */
export function classifyOutcome(kind: OutboxKind, outcome: SendOutcome): Classification {
  if (outcome.httpStatus !== null && outcome.httpStatus >= 200 && outcome.httpStatus < 300) {
    return { status: "done", successEquivalent: false, retryable: false };
  }

  // A duplicate rejection means the world is already how we wanted it.
  if (isAlreadyDone(outcome.message)) {
    return { status: "done", successEquivalent: true, retryable: false };
  }

  if (outcome.transportFailed || outcome.httpStatus === null) {
    // An award may have landed; the two state flips are safe to send again because a
    // duplicate is success-equivalent.
    return kind === "award"
      ? { status: "unresolved", successEquivalent: false, retryable: false }
      : { status: "pending", successEquivalent: false, retryable: true };
  }

  // Mid-refresh auth. Not the item's fault, and it must not consume an attempt.
  if (outcome.httpStatus === 401 || outcome.httpStatus === 403) {
    return { status: "pending", successEquivalent: false, retryable: true };
  }

  if (outcome.httpStatus >= 500) {
    return kind === "award"
      ? { status: "unresolved", successEquivalent: false, retryable: false }
      : { status: "pending", successEquivalent: false, retryable: true };
  }

  // A deterministic rejection: validation, a customer that does not exist, an org mismatch.
  return { status: "failed", successEquivalent: false, retryable: false };
}

/** Whether an auth failure should be charged to the item's attempt count. */
export function consumesAttempt(outcome: SendOutcome): boolean {
  return outcome.httpStatus !== 401 && outcome.httpStatus !== 403;
}

/* ── reading the queue back ─────────────────────────────────────────────────── */

/** Items still on their way somewhere. What the header chip counts. */
export function pendingItems(items: readonly OutboxItem[]): OutboxItem[] {
  return items.filter(
    (item) =>
      item.status === "pending" || item.status === "unresolved" || item.status === "needs_review",
  );
}

/**
 * The points a customer is owed but the server has not been told about yet.
 *
 * Composed at read time rather than written into the cached balance: a background refetch
 * would silently overwrite a patched cache, and the provisional-ness would vanish with it.
 */
export function pendingDeltaFor(items: readonly OutboxItem[], accountId: string): number {
  return pendingItems(items)
    .filter((item) => item.kind === "award" && item.context.accountId === accountId)
    .reduce((total, item) => total + (item.context.estimatedPoints ?? 0), 0);
}

/** What the header says. `null` when there is nothing to say. */
export function queueSummary(
  items: readonly OutboxItem[],
  online: boolean,
): { label: string; tone: "warm" | "danger" | "neutral" } | null {
  const failed = items.filter((item) => item.status === "failed").length;
  // A silently failed award is a customer who paid and got nothing, so it outranks
  // everything else — including the fact that there is no connection.
  if (failed > 0) {
    return {
      label: failed === 1 ? "1 failed to send" : `${failed} failed to send`,
      tone: "danger",
    };
  }

  const review = items.filter((item) => item.status === "needs_review").length;
  if (review > 0) {
    return { label: review === 1 ? "1 needs checking" : `${review} need checking`, tone: "warm" };
  }

  const waiting = items.filter(
    (item) => item.status === "pending" || item.status === "unresolved",
  ).length;
  if (waiting > 0) {
    return {
      label: online ? `Sending ${waiting}` : `Offline · ${waiting} waiting`,
      tone: "warm",
    };
  }

  return online ? null : { label: "Offline", tone: "neutral" };
}
