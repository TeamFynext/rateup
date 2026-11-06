import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const sessions = vi.hoisted(() => ({ create: vi.fn(), retrieve: vi.fn() }));

vi.mock("stripe", () => ({
  default: class {
    checkout = { sessions };
  },
}));

const { stripeProvider } = await import("./stripe.provider.js");

const input = (amount: number, currency: string) => ({
  orderId: "o1",
  orderNumber: 1001,
  storeName: "Shop",
  amount,
  currency,
  customer: {},
  returnUrl: "https://shop.test/c/tok?paid=1",
  cancelUrl: "https://shop.test/c/tok",
  expiresAt: new Date(Date.now() + 3_600_000),
});

beforeEach(() => {
  vi.clearAllMocks();
  sessions.create.mockResolvedValue({ id: "cs_1", url: "https://pay" });
});

describe("Stripe charges and reads back the order's amount", () => {
  test.each([
    ["KWD", 12.34, 12340],
    ["BHD", 5.5, 5500],
    ["JPY", 2450, 2450],
    ["USD", 24.5, 2450],
    ["EUR", 19.99, 1999],
  ])("%s %d", async (currency, amount, minor) => {
    await stripeProvider.createLink({ apiKey: "sk_test" }, input(amount, currency));
    const lineItem = sessions.create.mock.calls[0][0].line_items[0];
    expect(lineItem.price_data.unit_amount).toBe(minor);

    sessions.retrieve.mockResolvedValue({
      id: "cs_1",
      payment_status: "paid",
      status: "complete",
      payment_intent: "pi_1",
      amount_total: minor,
      currency: currency.toLowerCase(),
      metadata: { orderId: "o1" },
    });
    const state = await stripeProvider.fetchState({ apiKey: "sk_test" }, "cs_1");
    expect(state).toMatchObject({ state: "paid", amount, currency });
  });
});
