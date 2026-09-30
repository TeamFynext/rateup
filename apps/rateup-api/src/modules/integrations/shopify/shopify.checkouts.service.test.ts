import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    integration: { findFirst: vi.fn() },
    rule: { findMany: vi.fn() },
    contact: { findFirst: vi.fn() },
    shopifyCheckout: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    shopifyCheckoutReminder: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { info: vi.fn(), error: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("../../../workers/bullmq/queues/abandonedCheckout.queue.js", () => ({
  armCheckoutReminder: vi.fn(),
  disarmCheckoutReminder: vi.fn(),
  hasCheckoutReminderJob: vi.fn(),
}));
vi.mock("../../whatsapp/automatedReply/wa_automatedReply.utils.js", () => ({
  executeScheduledRule: vi.fn(),
}));
vi.mock("../../../utils/constants/constants.js", () => ({ API_URL: "https://api.rateup.test" }));

import prisma from "../../../utils/prisma.js";
import {
  armCheckoutReminder,
  disarmCheckoutReminder,
  hasCheckoutReminderJob,
} from "../../../workers/bullmq/queues/abandonedCheckout.queue.js";
import { executeScheduledRule } from "../../whatsapp/automatedReply/wa_automatedReply.utils.js";
import { ruleOptionsSchema } from "../../whatsapp/automatedReply/wa_rule.schema.js";
import {
  checkoutPhone,
  cleanupShopifyCheckouts,
  fireCheckoutReminder,
  handleCheckoutDeleted,
  handleCheckoutWebhook,
  markCheckoutRecovered,
  reconcileCheckoutReminders,
  redactShopifyCustomer,
} from "./shopify.checkouts.service.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  integration: Record<string, Mock>;
  rule: Record<string, Mock>;
  contact: Record<string, Mock>;
  shopifyCheckout: Record<string, Mock>;
  shopifyCheckoutReminder: Record<string, Mock>;
};

const ORG = "org-1";
const SHOP = "rateup.myshopify.com";
const UPDATED = "2026-09-30T10:00:00.000Z";

function webhook(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    token: "tok-42",
    phone: "+919400651372",
    email: "ravi@example.com",
    updated_at: UPDATED,
    completed_at: null,
    buyer_accepts_marketing: true,
    billing_address: { country_code: "IN" },
    line_items: [{ product_id: 7 }],
    abandoned_checkout_url: "https://rateup.myshopify.com/checkouts/recover/42",
    ...overrides,
  };
}

function storedCheckout(overrides: Record<string, unknown> = {}) {
  return {
    id: "chk-1",
    orgId: ORG,
    shop: SHOP,
    shopifyId: "42",
    token: "tok-42",
    phone: "919400651372",
    acceptsMarketing: true,
    body: webhook(),
    productIds: ["gid://shopify/Product/7"],
    shopifyUpdatedAt: new Date(UPDATED),
    status: "OPEN",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.integration.findFirst.mockResolvedValue({ orgId: ORG });
  db.shopifyCheckout.findUnique.mockResolvedValue(null);
  db.shopifyCheckout.upsert.mockImplementation(async ({ create }) => storedCheckout(create));
  db.rule.findMany.mockResolvedValue([
    { id: "rule-1", options: { shopifyEvent: "ABANDONED_CHECKOUTS" } },
  ]);
  db.shopifyCheckoutReminder.findUnique.mockResolvedValue(null);
  db.shopifyCheckoutReminder.findMany.mockResolvedValue([]);
  db.shopifyCheckoutReminder.create.mockImplementation(async ({ data }) => ({
    id: "rem-1",
    ...data,
  }));
  db.shopifyCheckoutReminder.update.mockImplementation(async ({ data }) => ({
    id: "rem-1",
    ...data,
  }));
});

describe("checkoutPhone", () => {
  test("stores the number the way Contact.phone does", () => {
    expect(checkoutPhone({ phone: "+91 94006 51372" })).toBe("919400651372");
  });

  test("reads a local number in the checkout's own country", () => {
    expect(
      checkoutPhone({ billing_address: { phone: "(415) 555-2671", country_code: "US" } }),
    ).toBe("14155552671");
  });

  test("falls through junk to the next number, and never throws", () => {
    expect(checkoutPhone({ phone: "abc", shipping_address: { phone: "9400651372" } })).toBe(
      "919400651372",
    );
    expect(checkoutPhone({ phone: "12" })).toBeNull();
  });
});

describe("handleCheckoutWebhook", () => {
  test("stores the checkout and schedules each rule's reminder after its delay", async () => {
    db.rule.findMany.mockResolvedValue([
      { id: "rule-1", options: { shopifyEvent: "ABANDONED_CHECKOUTS" } },
      {
        id: "rule-2",
        options: { shopifyEvent: "ABANDONED_CHECKOUTS", abandonedCheckoutDelayMinutes: 24 * 60 },
      },
    ]);

    await handleCheckoutWebhook(SHOP, webhook());

    const created = db.shopifyCheckout.upsert.mock.calls[0][0].create;
    expect(created).toMatchObject({
      orgId: ORG,
      shop: SHOP,
      shopifyId: "42",
      token: "tok-42",
      phone: "919400651372",
      acceptsMarketing: true,
      productIds: ["gid://shopify/Product/7"],
      status: "OPEN",
    });
    const dues = db.shopifyCheckoutReminder.create.mock.calls.map((c) => c[0].data);
    expect(dues).toEqual([
      {
        checkoutId: "chk-1",
        ruleId: "rule-1",
        dueAt: new Date("2026-09-30T11:00:00.000Z"),
        linkCode: expect.stringMatching(/^[0-9A-Za-z]{10}$/),
      },
      {
        checkoutId: "chk-1",
        ruleId: "rule-2",
        dueAt: new Date("2026-10-01T10:00:00.000Z"),
        linkCode: expect.stringMatching(/^[0-9A-Za-z]{10}$/),
      },
    ]);
    expect(dues[0].linkCode).not.toBe(dues[1].linkCode);
    expect(armCheckoutReminder).toHaveBeenCalledTimes(2);
  });

  test("a later update pushes a waiting reminder back", async () => {
    db.shopifyCheckout.findUnique.mockResolvedValue(storedCheckout());
    db.shopifyCheckoutReminder.findUnique.mockResolvedValue({ id: "rem-1", status: "SCHEDULED" });

    await handleCheckoutWebhook(SHOP, webhook({ updated_at: "2026-09-30T10:20:00.000Z" }));

    expect(db.shopifyCheckoutReminder.update).toHaveBeenCalledWith({
      where: { id: "rem-1" },
      data: { dueAt: new Date("2026-09-30T11:20:00.000Z") },
    });
    expect(armCheckoutReminder).toHaveBeenCalledWith("rem-1", new Date("2026-09-30T11:20:00.000Z"));
  });

  test("a reminder already sent is not sent again when the buyer comes back", async () => {
    db.shopifyCheckout.findUnique.mockResolvedValue(storedCheckout());
    db.shopifyCheckoutReminder.findUnique.mockResolvedValue({ id: "rem-1", status: "SENT" });

    await handleCheckoutWebhook(SHOP, webhook({ updated_at: "2026-09-30T12:00:00.000Z" }));

    expect(db.shopifyCheckoutReminder.update).not.toHaveBeenCalled();
    expect(armCheckoutReminder).not.toHaveBeenCalled();
  });

  test("an older delivery than the one stored is ignored", async () => {
    db.shopifyCheckout.findUnique.mockResolvedValue(
      storedCheckout({ shopifyUpdatedAt: new Date("2026-09-30T10:30:00.000Z") }),
    );

    await handleCheckoutWebhook(SHOP, webhook());

    expect(db.shopifyCheckout.upsert).not.toHaveBeenCalled();
  });

  test("a completed checkout is recovered and its reminders cancelled", async () => {
    db.shopifyCheckoutReminder.findMany.mockResolvedValue([{ id: "rem-1" }]);

    await handleCheckoutWebhook(SHOP, webhook({ completed_at: UPDATED }));

    expect(db.shopifyCheckout.upsert.mock.calls[0][0].create.status).toBe("RECOVERED");
    expect(db.shopifyCheckoutReminder.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["rem-1"] }, status: "SCHEDULED" },
      data: { status: "CANCELLED" },
    });
    expect(disarmCheckoutReminder).toHaveBeenCalledWith("rem-1");
    expect(db.shopifyCheckoutReminder.create).not.toHaveBeenCalled();
  });

  test("a checkout with no usable phone gets no reminder", async () => {
    await handleCheckoutWebhook(SHOP, webhook({ phone: null }));

    expect(db.shopifyCheckoutReminder.create).not.toHaveBeenCalled();
  });

  test("a product-filtered rule skips a cart without its products", async () => {
    db.rule.findMany.mockResolvedValue([
      {
        id: "rule-1",
        options: {
          shopifyEvent: "ABANDONED_CHECKOUTS",
          shopifyProductIds: ["gid://shopify/Product/9"],
        },
      },
    ]);

    await handleCheckoutWebhook(SHOP, webhook());

    expect(db.shopifyCheckoutReminder.create).not.toHaveBeenCalled();
  });

  test("a shop with no active integration is ignored", async () => {
    db.integration.findFirst.mockResolvedValue(null);

    await handleCheckoutWebhook(SHOP, webhook());

    expect(db.shopifyCheckout.upsert).not.toHaveBeenCalled();
  });
});

describe("recovery and expiry", () => {
  const order = {
    id: 1001,
    checkout_token: "tok-42",
    created_at: "2026-09-30T12:00:00+05:30",
    total_price: "1180.00",
    currency: "INR",
    total_price_set: { shop_money: { amount: "1180.00", currency_code: "INR" } },
  };

  test("an order carrying the checkout's token stops its reminders", async () => {
    db.shopifyCheckout.findMany.mockResolvedValue([{ id: "chk-1" }]);
    db.shopifyCheckoutReminder.findMany.mockResolvedValue([{ id: "rem-1" }]);
    db.shopifyCheckoutReminder.findFirst.mockResolvedValue(null);

    await markCheckoutRecovered(ORG, order as never);

    expect(db.shopifyCheckout.findMany).toHaveBeenCalledWith({
      where: { orgId: ORG, token: "tok-42", status: "OPEN" },
      select: { id: true },
    });
    expect(db.shopifyCheckout.update).toHaveBeenCalledWith({
      where: { id: "chk-1" },
      data: { status: "RECOVERED", recoveredOrderId: "1001" },
    });
    expect(disarmCheckoutReminder).toHaveBeenCalledWith("rem-1");
  });

  test("credits the order to the last reminder sent before it was placed", async () => {
    db.shopifyCheckout.findMany.mockResolvedValue([{ id: "chk-1" }]);
    db.shopifyCheckoutReminder.findFirst.mockResolvedValue({ id: "rem-2" });

    await markCheckoutRecovered(ORG, order as never);

    expect(db.shopifyCheckoutReminder.findFirst).toHaveBeenCalledWith({
      where: { checkoutId: "chk-1", status: "SENT", sentAt: { lte: new Date(order.created_at) } },
      orderBy: { sentAt: "desc" },
      select: { id: true },
    });
    const data = db.shopifyCheckoutReminder.update.mock.calls[0][0].data;
    expect(db.shopifyCheckoutReminder.update.mock.calls[0][0].where).toEqual({ id: "rem-2" });
    expect(data).toMatchObject({
      attributedOrderId: "1001",
      attributedAt: new Date(order.created_at),
      currency: "INR",
    });
    expect(String(data.revenue)).toBe("1180");
  });

  test("credits nothing when no reminder was sent before the order", async () => {
    db.shopifyCheckout.findMany.mockResolvedValue([{ id: "chk-1" }]);
    db.shopifyCheckoutReminder.findFirst.mockResolvedValue(null);

    await markCheckoutRecovered(ORG, order as never);

    expect(db.shopifyCheckoutReminder.update).not.toHaveBeenCalled();
  });

  test("checkouts/delete expires the checkout", async () => {
    db.shopifyCheckout.findUnique.mockResolvedValue(storedCheckout());

    await handleCheckoutDeleted(SHOP, { id: 42 });

    expect(db.shopifyCheckout.update).toHaveBeenCalledWith({
      where: { id: "chk-1" },
      data: { status: "EXPIRED" },
    });
  });
});

describe("fireCheckoutReminder", () => {
  function claimed(checkout = storedCheckout(), options: Record<string, unknown> = {}) {
    db.shopifyCheckoutReminder.updateMany.mockResolvedValue({ count: 1 });
    db.shopifyCheckoutReminder.findUniqueOrThrow.mockResolvedValue({
      id: "rem-1",
      linkCode: "AbC123xYz9",
      checkout,
      rule: { id: "rule-1", options: { shopifyEvent: "ABANDONED_CHECKOUTS", ...options } },
    });
  }
  const lastStatus = () => db.shopifyCheckoutReminder.update.mock.calls.at(-1)?.[0].data;

  test("does nothing when the reminder cannot be claimed", async () => {
    db.shopifyCheckoutReminder.updateMany.mockResolvedValue({ count: 0 });

    await expect(fireCheckoutReminder("rem-1")).resolves.toBe("skipped");
    expect(executeScheduledRule).not.toHaveBeenCalled();
  });

  test("claims only a due reminder whose checkout is still open", async () => {
    db.shopifyCheckoutReminder.updateMany.mockResolvedValue({ count: 0 });

    await fireCheckoutReminder("rem-1");

    expect(db.shopifyCheckoutReminder.updateMany.mock.calls[0][0].where).toMatchObject({
      id: "rem-1",
      status: "SCHEDULED",
      checkout: { status: "OPEN" },
    });
  });

  test("sends the tracked recovery link and keeps the sent message's id", async () => {
    claimed();
    (executeScheduledRule as Mock).mockResolvedValue({
      status: "ran",
      executedActions: [{ actionId: "a-1", success: true, messageId: "wamid.sent" }],
    });

    await expect(fireCheckoutReminder("rem-1")).resolves.toBe("sent");
    expect(executeScheduledRule).toHaveBeenCalledWith(
      "rule-1",
      expect.objectContaining({
        orgId: ORG,
        phone: "919400651372",
        shopifyEvent: "ABANDONED_CHECKOUTS",
        shopifyBody: expect.objectContaining({
          abandoned_checkout_url: "https://api.rateup.test/api/public/r/AbC123xYz9",
          recovery_link_code: "AbC123xYz9",
          email: "ravi@example.com",
        }),
      }),
    );
    expect(lastStatus()).toMatchObject({ status: "SENT", waMessageId: "wamid.sent" });
  });

  test("skips a buyer who did not accept marketing, unless the rule allows it", async () => {
    claimed(storedCheckout({ acceptsMarketing: false }));
    await expect(fireCheckoutReminder("rem-1")).resolves.toBe("skipped");
    expect(lastStatus()).toMatchObject({ status: "SKIPPED", reason: "no_marketing_consent" });

    claimed(storedCheckout({ acceptsMarketing: false }), { requireMarketingConsent: false });
    (executeScheduledRule as Mock).mockResolvedValue({ status: "ran", executedActions: [] });
    await expect(fireCheckoutReminder("rem-1")).resolves.toBe("sent");
  });

  test("skips a contact who opted out", async () => {
    claimed();
    db.contact.findFirst.mockResolvedValue({
      consent: false,
      blockedOnWhatsApp: false,
      isSpam: false,
    });

    await expect(fireCheckoutReminder("rem-1")).resolves.toBe("skipped");
    expect(lastStatus()).toMatchObject({ status: "SKIPPED", reason: "contact_opted_out" });
  });

  test("waits for the rule's business hours", async () => {
    claimed();
    db.contact.findFirst.mockResolvedValue(null);
    (executeScheduledRule as Mock).mockResolvedValue({ status: "outside_business_hours" });

    await expect(fireCheckoutReminder("rem-1")).resolves.toBe("deferred");
    expect(lastStatus()).toMatchObject({ status: "SCHEDULED" });
    expect(armCheckoutReminder).toHaveBeenCalled();
  });

  test("records a failed send with its reason", async () => {
    claimed();
    db.contact.findFirst.mockResolvedValue(null);
    (executeScheduledRule as Mock).mockResolvedValue({
      status: "ran",
      executedActions: [{ actionId: "a-1", success: false, error: "template not approved" }],
    });

    await expect(fireCheckoutReminder("rem-1")).resolves.toBe("failed");
    expect(lastStatus()).toMatchObject({ status: "FAILED", reason: "template not approved" });
  });
});

describe("reconcileCheckoutReminders", () => {
  test("re-arms a scheduled reminder whose job Redis lost", async () => {
    const dueAt = new Date(UPDATED);
    db.shopifyCheckoutReminder.findMany.mockResolvedValue([
      { id: "rem-1", dueAt },
      { id: "rem-2", dueAt },
    ]);
    (hasCheckoutReminderJob as Mock).mockImplementation(async (id: string) => id === "rem-2");

    await expect(reconcileCheckoutReminders()).resolves.toEqual({ checked: 2, armed: 1 });
    expect(armCheckoutReminder).toHaveBeenCalledWith("rem-1", dueAt);
  });
});

describe("forgetting checkouts", () => {
  const sentReminder = { reminders: { some: { status: "SENT" } } };

  test("customers/redact keeps the results of checkouts a reminder went out for", async () => {
    db.shopifyCheckout.updateMany.mockResolvedValue({ count: 1 });
    db.shopifyCheckout.deleteMany.mockResolvedValue({ count: 2 });

    await redactShopifyCustomer(SHOP, {
      customer: { email: "ravi@example.com", phone: "+919400651372" },
    });

    const match = {
      shop: SHOP,
      OR: [{ email: "ravi@example.com" }, { phone: "919400651372" }],
    };
    expect(db.shopifyCheckout.updateMany).toHaveBeenCalledWith({
      where: { AND: [match, sentReminder, { NOT: { body: { equals: {} } } }] },
      data: { phone: null, email: null, body: {}, productIds: [] },
    });
    expect(db.shopifyCheckout.deleteMany).toHaveBeenCalledWith({
      where: { AND: [match, { NOT: sentReminder }] },
    });
  });
});

describe("delays of up to 7 days", () => {
  test("a rule may wait anywhere from 15 minutes to 7 days", () => {
    const delay = (minutes: number) =>
      ruleOptionsSchema.safeParse({ abandonedCheckoutDelayMinutes: minutes }).success;
    expect(delay(15)).toBe(true);
    expect(delay(7 * 24 * 60)).toBe(true);
    expect(delay(14)).toBe(false);
    expect(delay(7 * 24 * 60 + 1)).toBe(false);
  });

  test("a 7-day reminder is due before its checkout expires", async () => {
    db.rule.findMany.mockResolvedValue([
      {
        id: "rule-1",
        options: {
          shopifyEvent: "ABANDONED_CHECKOUTS",
          abandonedCheckoutDelayMinutes: 7 * 24 * 60,
        },
      },
    ]);
    await handleCheckoutWebhook(SHOP, webhook());
    const dueAt = db.shopifyCheckoutReminder.create.mock.calls[0][0].data.dueAt as Date;

    db.shopifyCheckout.findMany.mockResolvedValue([]);
    db.shopifyCheckout.updateMany.mockResolvedValue({ count: 0 });
    db.shopifyCheckout.deleteMany.mockResolvedValue({ count: 0 });
    await cleanupShopifyCheckouts();

    const expiryCutoff = db.shopifyCheckout.findMany.mock.calls[0][0].where.shopifyUpdatedAt.lt;
    const updated = new Date(UPDATED);
    // Expiry cancels reminders of a checkout untouched since before the cutoff; this one's
    // reminder must fall due while the checkout is still inside the window.
    const expiresAt = new Date(updated.getTime() + (Date.now() - expiryCutoff.getTime()));
    expect(dueAt.getTime()).toBeLessThan(expiresAt.getTime());
  });

  test("forgets checkouts by the buyer's last activity, not the row's age", async () => {
    db.shopifyCheckout.findMany.mockResolvedValue([]);
    db.shopifyCheckout.updateMany.mockResolvedValue({ count: 0 });
    db.shopifyCheckout.deleteMany.mockResolvedValue({ count: 0 });

    await cleanupShopifyCheckouts();

    const where = db.shopifyCheckout.deleteMany.mock.calls[0][0].where.AND[0];
    expect(Object.keys(where)).toEqual(["shopifyUpdatedAt"]);
    const retentionDays = (Date.now() - where.shopifyUpdatedAt.lt.getTime()) / 86_400_000;
    expect(Math.round(retentionDays)).toBeGreaterThan(8);
  });
});
