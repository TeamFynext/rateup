import { describe, expect, test } from "vitest";

import { LoyaltyEventType } from "@/api/loyalty/loyalty.type";

import type { ReceiptCustomer } from "./cashier.types";
import type { EarnEstimate } from "./points-estimate";
import {
  provisionalEarnReceipt,
  provisionalMarkUsedReceipt,
  reconcile,
} from "./provisionalReceipt";

const CUSTOMER: ReceiptCustomer = {
  id: "a1",
  contactId: "c1",
  name: "Priya Menon",
  phone: "919876541207",
  tierName: "Gold",
};

const ESTIMATE: EarnEstimate = {
  points: 43,
  basePoints: 29,
  rule: { name: "Happy hour", pointsPerUnit: 0.1, multiplier: 1, isDefault: true },
  tierMultiplier: 1.5,
};

const NOW = new Date("2026-09-10T15:44:00.000Z");

describe("provisionalEarnReceipt", () => {
  test("the balance is the cached one plus the estimate", () => {
    const receipt = provisionalEarnReceipt({
      customer: CUSTOMER,
      clientRef: "ref1",
      estimate: ESTIMATE,
      balanceBefore: 1240,
      balanceAsOf: "2026-09-10T15:02:00.000Z",
      amount: 430,
      now: NOW,
    });
    expect(receipt.before).toBe(1240);
    expect(receipt.delta).toBe(43);
    expect(receipt.after).toBe(1283);
    expect(receipt.provisional).toBe(true);
    expect(receipt.clientRef).toBe("ref1");
    expect(receipt.queuedAt).toBe(NOW.toISOString());
    expect(receipt.balanceAsOf).toBe("2026-09-10T15:02:00.000Z");
  });

  // `estimateEarn` does not model tier crossing, and `amountToNext` shifts with every
  // queued award. A wrongly announced "You're Gold now!" is worse than saying nothing.
  test("no tier is claimed", () => {
    const receipt = provisionalEarnReceipt({
      customer: CUSTOMER,
      clientRef: "ref1",
      estimate: ESTIMATE,
      balanceBefore: 1240,
      balanceAsOf: NOW.toISOString(),
      amount: 430,
      now: NOW,
    });
    expect(receipt.tierBefore).toBeNull();
    expect(receipt.tierAfter).toBeNull();
    expect(receipt.nextTierName).toBeNull();
    expect(receipt.amountToNext).toBeNull();
  });

  // Nothing has been sent, so there is no outcome to report — and inventing one is how the
  // WhatsApp block starts lying.
  test("no notification is synthesised", () => {
    const receipt = provisionalEarnReceipt({
      customer: CUSTOMER,
      clientRef: "ref1",
      estimate: ESTIMATE,
      balanceBefore: 0,
      balanceAsOf: NOW.toISOString(),
      amount: 430,
      now: NOW,
    });
    expect(receipt.notification).toBeNull();
    expect(receipt.event).toBe(LoyaltyEventType.POINTS_ISSUED);
  });

  test("the arithmetic is carried so it can be read out", () => {
    const receipt = provisionalEarnReceipt({
      customer: CUSTOMER,
      clientRef: "ref1",
      estimate: ESTIMATE,
      balanceBefore: 0,
      balanceAsOf: NOW.toISOString(),
      amount: 430,
      now: NOW,
    });
    expect(receipt.estimate).toEqual({
      points: 43,
      basePoints: 29,
      ruleName: "Happy hour",
      tierMultiplier: 1.5,
    });
  });
});

describe("provisionalMarkUsedReceipt", () => {
  test("the balance does not move, and no tier is claimed", () => {
    const receipt = provisionalMarkUsedReceipt({
      customer: CUSTOMER,
      clientRef: "ref2",
      rewardName: "Free coffee",
      code: "KC-4471",
      balanceBefore: 1240,
      balanceAsOf: NOW.toISOString(),
      now: NOW,
    });
    expect(receipt.delta).toBe(0);
    expect(receipt.before).toBe(1240);
    expect(receipt.after).toBe(1240);
    expect(receipt.tierAfter).toBeNull();
    expect(receipt.provisional).toBe(true);
    expect(receipt.code).toBe("KC-4471");
  });
});

describe("reconcile", () => {
  const provisional = provisionalEarnReceipt({
    customer: CUSTOMER,
    clientRef: "ref1",
    estimate: ESTIMATE,
    balanceBefore: 1240,
    balanceAsOf: NOW.toISOString(),
    amount: 430,
    now: NOW,
  });

  test("matching figures settle quietly", () => {
    const { receipt, diverged } = reconcile(provisional, { delta: 43, after: 1283 });
    expect(diverged).toBe(false);
    expect(receipt.provisional).toBe(false);
    expect(receipt.delta).toBe(43);
  });

  // The counter already read "43" out loud. When the server says 41, the receipt has to
  // show both — silently swapping the number is how staff are made to look wrong.
  test("a different figure is adopted, flagged, and keeps the estimate", () => {
    const { receipt, diverged } = reconcile(provisional, { delta: 41, after: 1281 });
    expect(diverged).toBe(true);
    expect(receipt.delta).toBe(41);
    expect(receipt.after).toBe(1281);
    expect(receipt.estimate?.points).toBe(43);
    expect(receipt.provisional).toBe(false);
  });

  // A ledger row recovered by a probe carries points and a balance, and no tier movement
  // or send outcome at all. Neither may be invented from the estimate.
  test("nothing beyond the figures is invented", () => {
    const { receipt } = reconcile(provisional, { delta: 41, after: 1281 });
    expect(receipt.tierAfter).toBeNull();
    expect(receipt.notification).toBeNull();
  });
});
