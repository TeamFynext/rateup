import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    customerLoyaltyAccount: { findMany: vi.fn() },
    loyaltyProgram: { findUnique: vi.fn() },
  },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../settings/webhooks/webhook.events.js", () => ({ emitWebhookEvents: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { emitWebhookEvents, type WebhookEventInput } from "../settings/webhooks/webhook.events.js";
import {
  announceLoyaltyTransactions,
  loyaltyPointsData,
  loyaltyWebhookEventType,
  type LoyaltyLedgerRow,
} from "./loyalty.webhooks.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as Record<string, Record<string, Mock>>;
const emit = emitWebhookEvents as unknown as Mock;

const ORG = "11111111-1111-4111-8111-111111111111";
const MEMBER = { phone: "919000000001", cardCode: "K7Q2M9XR4" };

function ledger(over: Partial<LoyaltyLedgerRow> = {}): LoyaltyLedgerRow {
  return {
    id: "txn-1",
    accountId: "acct-1",
    programId: "prog-1",
    transactionType: "earn",
    source: "purchase",
    points: 50,
    balanceAfter: 350,
    description: null,
    referenceId: "order-77",
    idempotencyKey: "pos:till-3:991",
    createdAt: new Date("2026-10-16T10:00:00.000Z"),
    ...over,
  };
}

/** The events handed to `emitWebhookEvents`, with their lazy payloads resolved. */
async function emitted() {
  const events = (emit.mock.calls[0]?.[0] ?? []) as WebhookEventInput[];
  return Promise.all(
    events.map(async (e) => ({
      ...e,
      data: typeof e.data === "function" ? await e.data() : e.data,
    })),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  emit.mockImplementation(async (events: unknown[]) => events.length);
  db.customerLoyaltyAccount.findMany.mockResolvedValue([
    {
      id: "acct-1",
      cardCode: MEMBER.cardCode,
      contact: { identities: [{ kind: "PHONE", value: MEMBER.phone }] },
    },
  ]);
  db.loyaltyProgram.findUnique.mockResolvedValue({ orgId: ORG });
});

describe("loyaltyWebhookEventType", () => {
  test("earn, redeem, and everything else is an adjustment", () => {
    expect(loyaltyWebhookEventType("earn")).toBe("loyalty.points.earned");
    expect(loyaltyWebhookEventType("redeem")).toBe("loyalty.points.redeemed");
    expect(loyaltyWebhookEventType("adjust")).toBe("loyalty.points.adjusted");
    expect(loyaltyWebhookEventType("refund")).toBe("loyalty.points.adjusted");
  });
});

describe("loyaltyPointsData", () => {
  test("member, delta, balance, transaction id, reason/type and idempotency key", () => {
    expect(loyaltyPointsData(ledger({ description: "Birthday treat" }), MEMBER)).toEqual({
      transactionId: "txn-1",
      member: { phone: "919000000001", cardCode: "K7Q2M9XR4" },
      points: 50,
      balanceAfter: 350,
      type: "earn",
      source: "purchase",
      reason: "Birthday treat",
      referenceId: "order-77",
      idempotencyKey: "pos:till-3:991",
      createdAt: "2026-10-16T10:00:00.000Z",
    });
  });

  test("absent optional fields are null", () => {
    const data = loyaltyPointsData(
      ledger({ referenceId: undefined, idempotencyKey: undefined }),
      undefined,
    );
    expect(data).toMatchObject({
      member: { phone: null, cardCode: null },
      reason: null,
      referenceId: null,
      idempotencyKey: null,
    });
  });
});

describe("announceLoyaltyTransactions", () => {
  test("one event per row, typed by the row", async () => {
    await announceLoyaltyTransactions(
      ORG,
      [ledger(), ledger({ id: "txn-2", transactionType: "redeem", points: -100 })],
      MEMBER,
    );

    const events = await emitted();
    expect(events.map((e) => [e.type, (e.data as any).transactionId])).toEqual([
      ["loyalty.points.earned", "txn-1"],
      ["loyalty.points.redeemed", "txn-2"],
    ]);
    expect(events[0]!.orgId).toBe(ORG);
    expect(events[0]!.createdAt).toEqual(new Date("2026-10-16T10:00:00.000Z"));
  });

  test("a row that moved no points (held for approval) is skipped", async () => {
    await announceLoyaltyTransactions(ORG, [ledger({ points: 0 }), null, undefined]);

    expect(emit).not.toHaveBeenCalled();
  });

  test("uses the member the caller holds without a lookup", async () => {
    await announceLoyaltyTransactions(ORG, [ledger()], MEMBER);
    await emitted();

    expect(db.customerLoyaltyAccount.findMany).not.toHaveBeenCalled();
  });

  test("looks the members up only when a payload is actually built", async () => {
    // emitWebhookEvents decides subscription; an unsubscribed org never calls the builder.
    emit.mockResolvedValue(0);
    await announceLoyaltyTransactions(ORG, [ledger()]);
    expect(db.customerLoyaltyAccount.findMany).not.toHaveBeenCalled();

    emit.mockImplementation(async (events: unknown[]) => events.length);
    await announceLoyaltyTransactions(ORG, [ledger(), ledger({ id: "txn-2" })]);
    const events = await (async () => {
      const list = emit.mock.calls[1]![0] as WebhookEventInput[];
      return Promise.all(list.map((e) => (e.data as () => Promise<any>)()));
    })();

    expect(events[1].member).toEqual(MEMBER);
    // Both rows share one lookup.
    expect(db.customerLoyaltyAccount.findMany).toHaveBeenCalledTimes(1);
  });

  test("finds the org from the programme when the caller has none", async () => {
    await announceLoyaltyTransactions(undefined, [ledger()], MEMBER);

    expect(db.loyaltyProgram.findUnique).toHaveBeenCalledWith({
      where: { id: "prog-1" },
      select: { orgId: true },
    });
    expect((await emitted())[0]!.orgId).toBe(ORG);
  });

  test("never throws into the caller", async () => {
    db.loyaltyProgram.findUnique.mockRejectedValue(new Error("db down"));
    await expect(announceLoyaltyTransactions(null, [ledger()])).resolves.toBe(0);

    emit.mockRejectedValue(new Error("unexpected"));
    await expect(announceLoyaltyTransactions(ORG, [ledger()], MEMBER)).resolves.toBe(0);
  });
});
