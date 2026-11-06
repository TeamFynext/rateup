import { describe, expect, test } from "vitest";

import {
  backoffFor,
  classifyOutcome,
  consumesAttempt,
  isAlreadyDone,
  MAX_ATTEMPTS,
  nextAction,
  pendingDeltaFor,
  pendingItems,
  queueSummary,
  refusalFor,
  STALE_AFTER_MS,
  type OutboxItem,
  type OutboxKind,
  type SendOutcome,
} from "./outbox";

const NOW = 1_760_000_000_000;

function item(over: Partial<OutboxItem> = {}): OutboxItem {
  return {
    id: "01J000000000000000000000",
    orgId: "org1",
    kind: "award",
    status: "pending",
    payload: { contactId: "c1", purchaseAmount: 430, orderId: "01J000000000000000000000" },
    context: {
      accountId: "a1",
      contactId: "c1",
      phone: "919876541207",
      customerName: "Priya",
      tierName: "Gold",
      estimatedPoints: 43,
      balanceBefore: 1240,
    },
    attempts: 0,
    nextAttemptAt: null,
    createdAt: NOW - 1000,
    lastError: null,
    ...over,
  };
}

function outcome(over: Partial<SendOutcome> = {}): SendOutcome {
  return { httpStatus: 200, message: null, transportFailed: false, ...over };
}

describe("nextAction", () => {
  test("a fresh item is sent", () => {
    expect(nextAction(item(), NOW)).toEqual({ kind: "send" });
  });

  test("a settled item is skipped", () => {
    expect(nextAction(item({ status: "done" }), NOW).kind).toBe("skip");
    expect(nextAction(item({ status: "failed" }), NOW).kind).toBe("skip");
  });

  test("an item still in backoff waits, and says for how long", () => {
    expect(nextAction(item({ nextAttemptAt: NOW + 5000 }), NOW)).toEqual({
      kind: "wait",
      delayMs: 5000,
    });
    expect(nextAction(item({ nextAttemptAt: NOW - 1 }), NOW).kind).toBe("send");
  });

  // The single most important assertion in this file: an award whose outcome is unknown is
  // *never* sent again, because the server would happily award the points twice.
  test("an unresolved award is probed, not resent", () => {
    expect(nextAction(item({ status: "unresolved" }), NOW)).toEqual({ kind: "probe" });
  });

  // An item written before `orderId` was sent has no probe key at all. Rather than guess,
  // it goes to a human.
  test("an unresolved award with no probe key goes to a human", () => {
    const noKey = item({ status: "unresolved", payload: { contactId: "c1", purchaseAmount: 430 } });
    expect(nextAction(noKey, NOW)).toEqual({ kind: "review" });
  });

  test("an unresolved state flip cannot be probed either, so it is reviewed", () => {
    expect(nextAction(item({ kind: "apply_redemption", status: "unresolved" }), NOW).kind).toBe(
      "review",
    );
  });

  // The server applies whichever earning rules are in force when the request lands, and
  // stamps `createdAt = now()`. A purchase from last night must not quietly earn today's
  // rate, on today's date, with a WhatsApp about yesterday's coffee.
  test("a stale award needs checking rather than draining on its own", () => {
    const old = item({ createdAt: NOW - STALE_AFTER_MS - 1 });
    expect(nextAction(old, NOW)).toEqual({ kind: "review" });
    const justInside = item({ createdAt: NOW - STALE_AFTER_MS + 1000 });
    expect(nextAction(justInside, NOW).kind).toBe("send");
  });

  // A state flip carries no rule and no timestamp, so age changes nothing about it.
  test("a stale state flip still sends", () => {
    const old = item({ kind: "redeem_shortcode", createdAt: NOW - STALE_AFTER_MS - 1 });
    expect(nextAction(old, NOW).kind).toBe("send");
  });

  test("an item out of attempts is not sent again", () => {
    expect(nextAction(item({ attempts: MAX_ATTEMPTS }), NOW).kind).toBe("skip");
  });
});

describe("classifyOutcome", () => {
  test("a 2xx is done", () => {
    for (const status of [200, 201, 204]) {
      expect(classifyOutcome("award", outcome({ httpStatus: status })).status).toBe("done");
    }
  });

  // The request never completed, so it may or may not have committed. For an award that is
  // the ambiguous case the whole design exists for.
  test("no response to an award leaves it unresolved, not retryable", () => {
    const result = classifyOutcome("award", outcome({ httpStatus: null, transportFailed: true }));
    expect(result).toEqual({ status: "unresolved", successEquivalent: false, retryable: false });
  });

  test("a 5xx on an award is equally ambiguous", () => {
    expect(classifyOutcome("award", outcome({ httpStatus: 503 })).status).toBe("unresolved");
  });

  // The two state flips are safe to send again: a duplicate is refused with a message that
  // means the world is already how we wanted it.
  test("no response to a state flip is retryable", () => {
    for (const kind of ["apply_redemption", "redeem_shortcode"] as OutboxKind[]) {
      const result = classifyOutcome(kind, outcome({ httpStatus: null, transportFailed: true }));
      expect(result).toEqual({ status: "pending", successEquivalent: false, retryable: true });
      expect(classifyOutcome(kind, outcome({ httpStatus: 500 })).retryable).toBe(true);
    }
  });

  test("a duplicate rejection is success, not failure", () => {
    const messages = [
      "Redemption already applied",
      "Reward is already redeemed",
      "Customer account already exists",
      "Reward is already assigned to this customer",
    ];
    for (const message of messages) {
      const result = classifyOutcome("apply_redemption", outcome({ httpStatus: 400, message }));
      expect(result).toEqual({ status: "done", successEquivalent: true, retryable: false });
    }
  });

  test("a deterministic rejection fails rather than looping", () => {
    const result = classifyOutcome(
      "award",
      outcome({ httpStatus: 400, message: "Invalid amount" }),
    );
    expect(result).toEqual({ status: "failed", successEquivalent: false, retryable: false });
    expect(classifyOutcome("award", outcome({ httpStatus: 404 })).status).toBe("failed");
  });

  // SuperTokens refreshes the session behind the request; the item is fine.
  test("an auth failure is retried and costs no attempt", () => {
    for (const status of [401, 403]) {
      expect(classifyOutcome("award", outcome({ httpStatus: status })).retryable).toBe(true);
      expect(consumesAttempt(outcome({ httpStatus: status }))).toBe(false);
    }
    expect(consumesAttempt(outcome({ httpStatus: 500 }))).toBe(true);
  });
});

describe("isAlreadyDone", () => {
  // Matched by pattern, not by exact sentence: the API has no error codes, so a reworded
  // message must not turn a benign duplicate into a red row at the counter.
  test("survives rewording, and does not match unrelated errors", () => {
    expect(isAlreadyDone("This redemption has already been applied to the order")).toBe(true);
    expect(isAlreadyDone("already used")).toBe(true);
    expect(isAlreadyDone("Not enough points")).toBe(false);
    expect(isAlreadyDone("Already a valued customer")).toBe(false);
    expect(isAlreadyDone(null)).toBe(false);
  });
});

describe("backoffFor", () => {
  test("the ladder grows and then caps", () => {
    const full = () => 1;
    expect(backoffFor(0, full)).toBe(0);
    expect(backoffFor(1, full)).toBe(5_000);
    expect(backoffFor(5, full)).toBe(900_000);
    expect(backoffFor(6, full)).toBe(1_800_000);
    expect(backoffFor(50, full)).toBe(1_800_000);
  });

  test("jitter never pushes a delay past its rung", () => {
    for (let attempts = 0; attempts < 10; attempts++) {
      const delay = backoffFor(attempts, () => 0.5);
      expect(delay).toBeLessThanOrEqual(backoffFor(attempts, () => 1));
      expect(delay).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("reading the queue", () => {
  test("only unsettled items are pending", () => {
    const items = [
      item({ id: "1", status: "pending" }),
      item({ id: "2", status: "unresolved" }),
      item({ id: "3", status: "needs_review" }),
      item({ id: "4", status: "done" }),
      item({ id: "5", status: "failed" }),
    ];
    expect(pendingItems(items).map((row) => row.id)).toEqual(["1", "2", "3"]);
  });

  test("the pending delta is per customer and only counts awards", () => {
    const items = [
      item({ id: "1", context: { ...item().context, estimatedPoints: 43 } }),
      item({ id: "2", context: { ...item().context, estimatedPoints: 12 } }),
      item({ id: "3", kind: "apply_redemption" }),
      item({ id: "4", context: { ...item().context, accountId: "other", estimatedPoints: 99 } }),
      item({ id: "5", status: "done", context: { ...item().context, estimatedPoints: 500 } }),
    ];
    expect(pendingDeltaFor(items, "a1")).toBe(55);
    expect(pendingDeltaFor(items, "other")).toBe(99);
    expect(pendingDeltaFor([], "a1")).toBe(0);
  });
});

describe("queueSummary", () => {
  test("nothing to say when the queue is empty and the network is up", () => {
    expect(queueSummary([], true)).toBeNull();
  });

  test("being offline is said even with an empty queue", () => {
    expect(queueSummary([], false)).toEqual({ label: "Offline", tone: "neutral" });
  });

  // A refusal must never be the first time staff learn there is no network.
  test("waiting items are counted, and worded by whether we can send", () => {
    const items = [item({ id: "1" }), item({ id: "2" })];
    expect(queueSummary(items, false)?.label).toBe("Offline · 2 waiting");
    expect(queueSummary(items, true)?.label).toBe("Sending 2");
  });

  // A silently failed award is a customer who paid and got nothing, so it outranks the
  // rest — including the fact that the device is offline.
  test("a failure outranks everything", () => {
    const items = [item({ id: "1", status: "failed" }), item({ id: "2", status: "pending" })];
    expect(queueSummary(items, false)).toEqual({ label: "1 failed to send", tone: "danger" });
  });

  test("items needing a human outrank ones merely waiting", () => {
    const items = [item({ id: "1", status: "needs_review" }), item({ id: "2", status: "pending" })];
    expect(queueSummary(items, true)?.label).toBe("1 needs checking");
  });
});

describe("refusalFor", () => {
  // The refusal has to offer what does work, or "come back when we have signal" is how a
  // sale is lost.
  test("redeeming says why, and what to do instead", () => {
    const message = refusalFor("redeem", "Beans");
    expect(message).toContain("Beans");
    expect(message).toMatch(/gift/i);
    expect(message).toMatch(/purchase/i);
  });

  test("registering says the number can still be taken", () => {
    expect(refusalFor("register", "Beans")).toMatch(/number/i);
  });
});
