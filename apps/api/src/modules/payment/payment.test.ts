import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
  process.env.RAZORPAY_WEBHOOK_SECRET = "rzp_secret";
  process.env.FRONTEND_URL = "https://app.test.example";
});

const stripeStub = vi.hoisted(() => ({
  checkout: { sessions: { create: vi.fn(), retrieve: vi.fn() } },
  webhooks: { constructEvent: vi.fn() },
}));

vi.mock("stripe", () => ({
  default: class {
    constructor() {
      return stripeStub;
    }
  },
}));

vi.mock("../../utils/prisma.js", () => ({
  default: {
    order: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    subscription: { update: vi.fn(), findUnique: vi.fn() },
    subscriptionAddon: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    payments: { create: vi.fn(), upsert: vi.fn() },
    rateupPlan: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    usageStats: { update: vi.fn() },
    paymentPlans: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
    razorpayWebhookEvent: { create: vi.fn(), deleteMany: vi.fn() },
    stripeProducts: { findFirst: vi.fn() },
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("./payment.service.js", async () => {
  const actual = await vi.importActual<any>("./payment.service.js").catch(() => ({}));
  return {
    ...actual,
    updateOrder: vi.fn(),
    syncPaymentPlans: vi.fn(),
    getAllPaymentPlans: vi.fn(),
    getAllRateupPaymentPlans: vi.fn(),
    getAllOrgOrders: vi.fn(),
    getAllPaymentOrders: vi.fn(),
    deletePaymentPlan: vi.fn(),
    createRateUpPlan: vi.fn(),
    updateRateUpPlan: vi.fn(),
    deleteRateUpPlan: vi.fn(),
    updatePaymentPlan: vi.fn(),
    getAllPaymentSubscription: vi.fn(),
    cancelRazorpaySubscription: vi.fn(),
    createCheckoutSession: vi.fn(),
    handlePaymentCaptured: vi.fn(),
    handlePaymentFailed: vi.fn(),
    updateSubscription: vi.fn(),
    applySubscriptionStatusEvent: vi.fn(),
    applySubscriptionUpdate: vi.fn(),
    verifyPayment: vi.fn(),
  };
});

vi.mock("./stripe/stripe.service.js", () => ({
  cancelStripeSubscription: vi.fn(),
  createOrder: vi.fn(),
  createStripePayment: vi.fn(),
  deleteStripeProduct: vi.fn(),
  getAllStripeSubscriptions: vi.fn(),
  getStripeProducts: vi.fn(),
  handleInvoicePaymentFailed: vi.fn(),
  processOrder: vi.fn(),
  syncStripeProducts: vi.fn(),
  updateOrder: vi.fn(),
  updateStripeProduct: vi.fn(),
  deleteOrder: vi.fn(),
  findOrderByCheckoutRef: vi.fn(),
  UnsellableStripePriceError: class UnsellableStripePriceError extends Error {},
}));

vi.mock("supertokens-node/recipe/session/index.js", () => ({
  default: { getSession: vi.fn() },
}));

vi.mock("fastify-raw-body", () => ({ default: vi.fn() }));

import { createHmac } from "node:crypto";

vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../../utils/auth.js", () => ({ assertRootOrg: vi.fn() }));

vi.mock("../../utils/email/payments/subscriptionPurchasedAlert.js", () => ({
  sendSubscriptionPurchasedAlert: vi.fn(),
}));

import Session from "supertokens-node/recipe/session/index.js";
import axios from "axios";

import prisma from "../../utils/prisma.js";
import * as paymentService from "./payment.service.js";
import * as stripeService from "./stripe/stripe.service.js";
import { assertRootOrg } from "../../utils/auth.js";
import { sendSubscriptionPurchasedAlert } from "../../utils/email/payments/subscriptionPurchasedAlert.js";
import {
  createCheckoutSessionHandler as createRazorpayCheckoutHandler,
  isValidRazorpaySignature,
  updateSubscriptionOrderHandler,
  verificationHandler,
} from "./payment.controller.js";
import { Prisma } from "../../generated/prisma/client.js";
import {
  createCheckoutSessionHandler,
  deleteStripeProductsHandler,
  getAllStripeSubscriptionsHandler,
  getSessionStatusHandler,
  updateStripeProductsHandler,
  webHookHandler,
} from "./stripe/stripe.controller.js";
import { paymentRoutes } from "./payment.route.js";
import { orderIdParamsSchema, updateOrderStatusSchema } from "./payment.schema.js";
import { paymentStripeRoutes } from "./stripe/stripe.route.js";
import { stripePublicRoutes } from "./stripe/stripe.public.route.js";
import { paymentPublicRoutes } from "./payment.public.route.js";

type Mock = ReturnType<typeof vi.fn>;

const pay = paymentService as unknown as Record<string, Mock>;
const stripeSvc = stripeService as unknown as Record<string, Mock>;

const USER = "11111111-1111-1111-1111-111111111111";
const ORG = "22222222-2222-2222-2222-222222222222";
const VICTIM_ORDER = "3f8a1e2c-5b7d-4c9e-8a1b-2d3e4f5a6b7c";
const ENTERPRISE_PLAN = "7c6b5a4f-3e2d-4b1a-9c8d-7e6f5a4b3c2d";

function reply() {
  const rep: any = { code: vi.fn(() => rep), status: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return {
    code: rep.code.mock.calls[0]?.[0] ?? rep.status.mock.calls[0]?.[0],
    body: rep.send.mock.calls[0]?.[0],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations but drops queued values.
  pay.updateOrder.mockResolvedValue("updated");
  stripeSvc.createOrder.mockResolvedValue({ id: "order-1" });
  stripeSvc.updateOrder.mockResolvedValue(undefined);
  stripeSvc.getAllStripeSubscriptions.mockResolvedValue([]);
  stripeSvc.deleteStripeProduct.mockResolvedValue({ deleted: true });
  stripeSvc.updateStripeProduct.mockResolvedValue({ id: "prod_x" });
  stripeSvc.deleteOrder.mockResolvedValue({ count: 1 });
  stripeSvc.findOrderByCheckoutRef.mockResolvedValue({ id: "order-1" });
  stripeStub.checkout.sessions.create.mockResolvedValue({
    id: "cs_test_1",
    client_secret: "cs_secret",
  });
  stripeStub.checkout.sessions.retrieve.mockResolvedValue({
    status: "complete",
    payment_status: "paid",
    customer_details: { email: "victim@othercompany.test" },
  });
  (Session.getSession as unknown as Mock).mockResolvedValue({
    getUserId: () => USER,
    getAccessTokenPayload: () => ({ orgId: ORG }),
  });
});

// ===========================================================================
// The order update — a write that grants a subscription
// ===========================================================================

describe("updateSubscriptionOrderHandler", () => {
  const req = (body: Record<string, unknown>, orderId = VICTIM_ORDER) =>
    ({ params: { orderId }, body, user: { orgId: ORG }, userId: USER }) as never;

  test("writes only the status, and only within the caller's org", async () => {
    await updateSubscriptionOrderHandler(
      req({ status: "COMPLETE", paymentStatus: "SUCCESS", amount: 0 }),
      reply(),
    );

    expect(pay.updateOrder).toHaveBeenCalledWith(VICTIM_ORDER, "COMPLETE", ORG);
  });

  // This was the payment bypass: marking ANY order COMPLETE upgraded the CALLER's
  // organisation to that order's plan, with the plan's full feature set and a fresh
  // expiry, and no payment was consulted anywhere on the path. Since trials were
  // removed this route grants nothing at all — the only writer of an org's plan is a
  // signature-verified webhook — so the bypass has no path back even if the guard
  // below were dropped. This test pins that: a status write, and nothing more.
  test("marking an order complete grants no subscription", async () => {
    const rep = reply();

    await updateSubscriptionOrderHandler(req({ status: "COMPLETE" }), rep);

    expect(pay.updateOrder).toHaveBeenCalledWith(VICTIM_ORDER, "COMPLETE", ORG);
    expect(answer(rep).code).toBe(200);
  });

  test("an unpaid order is refused rather than marked complete", async () => {
    pay.updateOrder.mockResolvedValueOnce("unpaid");
    const rep = reply();

    await updateSubscriptionOrderHandler(req({ status: "COMPLETE" }), rep);

    expect(answer(rep).code).toBe(409);
  });

  test("an order outside the caller's org answers 404", async () => {
    pay.updateOrder.mockResolvedValueOnce("not_found");
    const rep = reply();

    await updateSubscriptionOrderHandler(req({ status: "COMPLETE" }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { message: "Order not found" } });
  });

  test("any other status writes the order and skips the paid-order guard", async () => {
    await updateSubscriptionOrderHandler(req({ status: "PENDING" }), reply());

    expect(pay.updateOrder).toHaveBeenCalledOnce();
  });

  test("answers 200 with no body on success", async () => {
    const rep = reply();

    await updateSubscriptionOrderHandler(req({ status: "COMPLETE" }), rep);

    expect(answer(rep)).toEqual({ code: 200, body: undefined });
  });

  test("a failure answers a fixed 500", async () => {
    pay.updateOrder.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await updateSubscriptionOrderHandler(req({ status: "COMPLETE" }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Updating order failed" } });
  });

  test("the route requires billing.manage and validates its body", async () => {
    const { routes } = await collectPaymentRoutes();

    const order = routes.find((r) => r.url === "/order/:orderId");
    expect(order.handler).toBe(updateSubscriptionOrderHandler);
    expect(order.opts.config.permission).toBe("billing.manage");
    expect(order.opts.schema.body).toBe(updateOrderStatusSchema);
    expect(order.opts.schema.params).toBe(orderIdParamsSchema);
  });

  test("the body schema accepts only the three order statuses", () => {
    expect(updateOrderStatusSchema.safeParse({ status: "COMPLETE" }).success).toBe(true);
    expect(updateOrderStatusSchema.safeParse({ status: "complete" }).success).toBe(false);
    expect(
      updateOrderStatusSchema.parse({ status: "COMPLETE", paymentStatus: "SUCCESS", amount: 0 }),
    ).toEqual({ status: "COMPLETE" });
  });
});

// ===========================================================================
// The Stripe catalogue — no root-org gate
// ===========================================================================

describe("the Stripe product routes", () => {
  test("deleting a product takes the id from the path and nothing else", async () => {
    const rep = reply();

    await deleteStripeProductsHandler({ params: { productId: "prod_victim" } } as never, rep);

    expect(stripeSvc.deleteStripeProduct).toHaveBeenCalledWith("prod_victim");
    expect(answer(rep).code).toBe(200);
  });

  test("updating a product takes the id from the body and nothing else", async () => {
    await updateStripeProductsHandler(
      { body: { productId: "prod_victim", name: "Renamed", active: false } } as never,
      reply(),
    );

    expect(stripeSvc.updateStripeProduct).toHaveBeenCalledWith("prod_victim", {
      name: "Renamed",
      active: false,
    });
  });

  test("listing every Stripe subscription takes no argument at all", async () => {
    stripeSvc.getAllStripeSubscriptions.mockResolvedValueOnce([
      { id: "sub_1", customer_email: "someone@othercompany.test", status: "active" },
    ]);
    const rep = reply();

    await getAllStripeSubscriptionsHandler({ user: { orgId: ORG } } as never, rep);

    expect(stripeSvc.getAllStripeSubscriptions).toHaveBeenCalledWith();
    expect(answer(rep).body[0].customer_email).toBe("someone@othercompany.test");
  });

  test("the five catalogue and listing routes carry the root-org check", async () => {
    const { routes } = await collectStripeRoutes();

    const gated = routes.filter((r) => r.opts?.preHandler?.includes(assertRootOrg));
    expect(gated.map((r) => `${r.method} ${r.url}`)).toEqual([
      "GET /products",
      "GET /subscriptions",
      "POST /sync-products",
      "PUT /product",
      "DELETE /product/:productId",
    ]);
  });

  test("the cancellation needs billing.manage rather than the platform org", async () => {
    const { routes } = await collectStripeRoutes();

    const cancel = routes.find((r) => r.url === "/subscriptions/cancel");
    expect(cancel.opts.config.permission).toBe("billing.manage");
  });

  test("the buyer-facing routes stay open to any member", async () => {
    const { routes } = await collectStripeRoutes();

    for (const url of ["/create-checkout-session", "/session-status"]) {
      const r = routes.find((x) => x.url === url);
      expect(r.opts?.preHandler ?? []).not.toContain(assertRootOrg);
    }
  });

  // NOTE: the equivalent Razorpay routes do carry it, which is what makes the
  // Stripe side look like an omission rather than a decision.
  test("the Razorpay catalogue routes are gated on the root org", async () => {
    const { routes } = await collectPaymentRoutes();

    const gated = routes.filter((r) => r.opts?.preHandler?.includes(assertRootOrg));
    expect(gated.map((r) => `${r.method} ${r.url}`)).toEqual([
      "POST /sync-plans",
      "GET /plans",
      "POST /rateup-plan",
      "PUT /rateup-plan",
      "DELETE /rateup-plan/:id",
      "PUT /updateplans",
      "GET /subscriptions",
      "GET /orders/all",
      "DELETE /",
    ]);
  });

  test("the Razorpay plan sync is gated too", async () => {
    const { routes } = await collectPaymentRoutes();

    const sync = routes.find((r) => r.url === "/sync-plans");
    expect(sync.opts.preHandler).toEqual([assertRootOrg]);
  });
});

// ===========================================================================
// getSessionStatusHandler
// ===========================================================================

describe("getSessionStatusHandler", () => {
  const req = (session_id: string) => ({ query: { session_id }, user: { orgId: ORG } }) as never;

  test("resolves the session through an order in the caller's own org", async () => {
    const rep = reply();

    await getSessionStatusHandler(req("cs_test_1"), rep);

    expect(stripeSvc.findOrderByCheckoutRef).toHaveBeenCalledWith("cs_test_1", ORG);
    expect(stripeStub.checkout.sessions.retrieve).toHaveBeenCalledWith("cs_test_1");
    expect(rep.send.mock.calls[0][0]).toEqual({
      status: "complete",
      payment_status: "paid",
      customer_email: "victim@othercompany.test",
    });
  });

  test("another org's session is a 404 and is never retrieved", async () => {
    stripeSvc.findOrderByCheckoutRef.mockResolvedValueOnce(null);
    const rep = reply();

    await getSessionStatusHandler(req("cs_test_victim"), rep);

    expect(stripeStub.checkout.sessions.retrieve).not.toHaveBeenCalled();
    expect(answer(rep)).toEqual({ code: 404, body: { message: "Checkout session not found" } });
  });

  // Previously customer_details was dereferenced without a guard, so a session that has
  // none threw out of the handler. Fixed to fall back to a null customer_email while
  // getting typed for the strict-mode migration.
  test("a session with no customer details returns a null customer_email", async () => {
    stripeStub.checkout.sessions.retrieve.mockResolvedValueOnce({
      status: "open",
      payment_status: "unpaid",
      customer_details: null,
    });
    const rep = reply();

    await getSessionStatusHandler(req("cs_test_1"), rep);

    expect(rep.send.mock.calls[0][0]).toEqual({
      status: "open",
      payment_status: "unpaid",
      customer_email: null,
    });
  });
});

// ===========================================================================
// createCheckoutSessionHandler — the order is written first
// ===========================================================================

describe("createCheckoutSessionHandler (stripe)", () => {
  const body = {
    priceId: "price_1",
    email: "buyer@example.test",
    // What an older client still sends: none of it may reach the order.
    orgId: "99999999-9999-9999-9999-999999999999",
    rateupPlanId: ENTERPRISE_PLAN,
    planName: "Enterprise",
  };
  const req = () => ({ body, user: { orgId: ORG } }) as never;

  test("orders for the session's org and the price only, ignoring body org and plan", async () => {
    await createCheckoutSessionHandler(req(), reply());

    expect(stripeSvc.createOrder).toHaveBeenCalledWith("price_1", ORG, USER);
  });

  test("a price the catalog does not sell answers 400 and never reaches Stripe", async () => {
    stripeSvc.createOrder.mockRejectedValueOnce(
      new stripeService.UnsellableStripePriceError("This plan is not available for checkout."),
    );
    const rep = reply();

    await createCheckoutSessionHandler(req(), rep);

    expect(answer(rep).code).toBe(400);
    expect(stripeStub.checkout.sessions.create).not.toHaveBeenCalled();
  });

  test("creates the local order before calling Stripe", async () => {
    const order: string[] = [];
    stripeSvc.createOrder.mockImplementationOnce(async () => {
      order.push("order");
      return { id: "order-1" };
    });
    stripeStub.checkout.sessions.create.mockImplementationOnce(async () => {
      order.push("stripe");
      return { id: "cs_1", client_secret: "secret" };
    });

    await createCheckoutSessionHandler(req(), reply());

    expect(order).toEqual(["order", "stripe"]);
  });

  test("a Stripe failure removes the order and answers rather than escaping", async () => {
    stripeStub.checkout.sessions.create.mockRejectedValueOnce(new Error("No such price"));
    const rep = reply();

    await expect(createCheckoutSessionHandler(req(), rep)).resolves.toBeDefined();

    expect(stripeSvc.createOrder).toHaveBeenCalledOnce();
    expect(stripeSvc.deleteOrder).toHaveBeenCalledWith("order-1");
    expect(stripeSvc.updateOrder).not.toHaveBeenCalled();
    expect(answer(rep).code).toBe(502);
  });

  test("a cleanup failure does not mask the checkout failure", async () => {
    stripeStub.checkout.sessions.create.mockRejectedValueOnce(new Error("No such price"));
    stripeSvc.deleteOrder.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await expect(createCheckoutSessionHandler(req(), rep)).resolves.toBeDefined();

    expect(answer(rep).code).toBe(502);
  });

  test("carries the local order id into the Stripe metadata", async () => {
    await createCheckoutSessionHandler(req(), reply());

    const arg = stripeStub.checkout.sessions.create.mock.calls[0][0];
    expect(arg.metadata).toEqual({ rateupOrderId: "order-1" });
    expect(arg.subscription_data.metadata).toEqual({ rateupOrderId: "order-1" });
  });

  test("requests the ui_mode this API version documents", async () => {
    await createCheckoutSessionHandler(req(), reply());

    expect(stripeStub.checkout.sessions.create.mock.calls[0][0].ui_mode).toBe("embedded_page");
  });

  test("takes the price and the customer email from the request body", async () => {
    await createCheckoutSessionHandler(req(), reply());

    const arg = stripeStub.checkout.sessions.create.mock.calls[0][0];
    expect(arg.line_items[0].price).toBe("price_1");
    expect(arg.customer_email).toBe("buyer@example.test");
  });
});

// ===========================================================================
// The webhooks — both verify their signature
// ===========================================================================

describe("the Stripe webhook", () => {
  test("verifies the signature against the endpoint secret", async () => {
    stripeStub.webhooks.constructEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: { object: {} },
    });
    const rep = reply();

    await webHookHandler(
      { headers: { "stripe-signature": "t=1,v1=abc" }, body: "{}" } as never,
      rep,
    );

    expect(stripeStub.webhooks.constructEvent).toHaveBeenCalledWith("{}", "t=1,v1=abc", "whsec_x");
    expect(answer(rep).code).toBe(200);
  });

  test("refuses an event whose signature does not verify", async () => {
    stripeStub.webhooks.constructEvent.mockImplementationOnce(() => {
      throw new Error("No signatures found matching the expected signature");
    });
    const rep = reply();

    await webHookHandler({ headers: { "stripe-signature": "bad" }, body: "{}" } as never, rep);

    expect(answer(rep).code).toBe(400);
    expect(stripeSvc.processOrder).not.toHaveBeenCalled();
  });

  test("routes a completed checkout to the order processor", async () => {
    stripeStub.webhooks.constructEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: { object: { id: "cs_1" } },
    });

    await webHookHandler({ headers: {}, body: "{}" } as never, reply());

    expect(stripeSvc.processOrder).toHaveBeenCalledWith({ id: "cs_1" });
  });

  test("acknowledges an event type it does not handle", async () => {
    stripeStub.webhooks.constructEvent.mockReturnValueOnce({
      type: "customer.created",
      data: { object: {} },
    });
    const rep = reply();

    await webHookHandler({ headers: {}, body: "{}" } as never, rep);

    expect(answer(rep).code).toBe(200);
  });

  // NOTE: the raw body is preserved only when request.url matches the webhook
  // path exactly. When it does not, the handler re-serialises the parsed body,
  // which will not byte-match what Stripe signed — so it fails closed.
  test("a re-serialised body is what the fallback hands to the verifier", async () => {
    stripeStub.webhooks.constructEvent.mockReturnValueOnce({
      type: "customer.created",
      data: { object: {} },
    });

    await webHookHandler({ headers: {}, body: { a: 1 } } as never, reply());

    const passed = stripeStub.webhooks.constructEvent.mock.calls[0][0];
    expect(Buffer.isBuffer(passed)).toBe(true);
    expect(passed.toString()).toBe('{"a":1}');
  });

  test("the public tree preserves the raw body for the webhook path only", async () => {
    const parsers: any[] = [];
    const srv: any = {
      addContentTypeParser: vi.fn((type, opts, fn) => parsers.push({ type, opts, fn })),
      post: vi.fn(),
      addHook: vi.fn(),
    };

    await stripePublicRoutes(srv);

    expect(parsers[0].opts).toEqual({ parseAs: "string" });
    const done = vi.fn();
    parsers[0].fn({ url: "/api/public/payment/stripe/webhook" }, '{"a":1}', done);
    expect(done).toHaveBeenCalledWith(null, '{"a":1}');

    const done2 = vi.fn();
    parsers[0].fn({ url: "/api/public/payment/stripe/other" }, '{"a":1}', done2);
    expect(done2).toHaveBeenCalledWith(null, { a: 1 });
  });

  test("the authenticated tree registers no content-type parser of its own", async () => {
    const { routes, parsers } = await collectStripeRoutes();

    expect(routes.map((r) => r.url)).not.toContain("/webhook");
    expect(parsers).toHaveLength(0);
  });

  test("the public payment tree exposes the Razorpay webhook with no session check", async () => {
    const routes: any[] = [];
    const srv: any = {
      get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
      post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
      addHook: vi.fn(),
      register: vi.fn(),
    };

    await paymentPublicRoutes(srv);

    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual([
      "GET /rateup-plans",
      "POST /webhooks/verification",
    ]);
    expect(srv.addHook).not.toHaveBeenCalled();
  });

  test("the Razorpay webhook route opts in to the raw body", async () => {
    const routes: any[] = [];
    const srv: any = {
      get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
      post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
      addHook: vi.fn(),
      register: vi.fn(),
    };

    await paymentPublicRoutes(srv);

    // Without this the handler falls back to nothing and rejects every delivery: the
    // signature is an HMAC over the bytes Razorpay sent, not over a re-serialization.
    const webhook = routes.find((r) => r.url === "/webhooks/verification");
    expect(webhook.opts.config.rawBody).toBe(true);
    expect(srv.register).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ field: "rawBody", global: false }),
    );
  });
});

// ===========================================================================
// Route collection helpers
// ===========================================================================

async function collectPaymentRoutes() {
  const routes: any[] = [];
  const hooks: any[] = [];
  const srv: any = {
    addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
    get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
    post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
    put: vi.fn((url, opts, handler) => routes.push({ method: "PUT", url, opts, handler })),
    delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
  };
  await paymentRoutes(srv);
  return { srv, routes, hooks };
}

async function collectStripeRoutes() {
  const routes: any[] = [];
  const hooks: any[] = [];
  const parsers: any[] = [];
  const srv: any = {
    addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
    addContentTypeParser: vi.fn((type, opts, fn) => parsers.push({ type, opts, fn })),
    get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
    post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
    put: vi.fn((url, opts, handler) => routes.push({ method: "PUT", url, opts, handler })),
    delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
  };
  await paymentStripeRoutes(srv);
  return { srv, routes, hooks, parsers };
}

describe("route registration", () => {
  test("both authenticated trees require a session", async () => {
    const a = await collectPaymentRoutes();
    const b = await collectStripeRoutes();

    for (const { hooks } of [a, b]) {
      expect(hooks).toEqual([{ name: "onRoute", fn: expect.any(Function) }]);
      const probe: any = { method: "GET", url: "/x", config: {} };
      hooks[0].fn(probe);
      expect(probe.config).toEqual({ access: "session" });
    }
  });

  test("the Razorpay cancellation is restricted to the owner role", async () => {
    const { routes } = await collectPaymentRoutes();

    const cancel = routes.find((r) => r.url === "/subscriptions/cancel");
    expect(cancel.opts.config.permission).toBe("billing.manage");
  });

  test("the per-org order listing needs no extra gate", async () => {
    const { routes } = await collectPaymentRoutes();

    const orgOrders = routes.find((r) => r.url === "/org/orders");
    expect(orgOrders.opts).toBeDefined();
  });
});

describe("the Razorpay webhook handler", () => {
  const OLD_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

  function makeReply() {
    const reply: any = {
      code: vi.fn(() => reply),
      send: vi.fn(() => reply),
    };
    return reply;
  }

  const sign = (raw: string, secret = "rzp_secret") =>
    createHmac("sha256", secret).update(raw).digest("hex");

  /** A delivery signed the way Razorpay signs: hex HMAC-SHA256 over the raw bytes. */
  function makeRequest(body: unknown, rawBody?: string, headers: Record<string, string> = {}) {
    return {
      headers: {
        "x-razorpay-signature": rawBody === undefined ? "sig" : sign(rawBody),
        ...headers,
      },
      body,
      rawBody,
    } as never;
  }

  function delivery(body: Record<string, unknown>, headers: Record<string, string> = {}) {
    return makeRequest(body, JSON.stringify(body), headers);
  }

  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "rzp_secret";
    vi.mocked(prisma.razorpayWebhookEvent.create).mockResolvedValue({} as never);
    vi.mocked(prisma.razorpayWebhookEvent.deleteMany).mockResolvedValue({ count: 1 } as never);
    pay.updateSubscription.mockResolvedValue({ success: true });
    pay.verifyPayment.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = OLD_SECRET;
  });

  test("verifies the signature against the raw bytes, not a re-serialization", async () => {
    // Razorpay signs what it sent. The parsed body round-trips to different bytes here
    // (spacing), so a signature over JSON.stringify(request.body) must not be accepted.
    const raw = '{ "event": "subscription.charged", "payload": {} }';
    const reply = makeReply();

    await verificationHandler(
      makeRequest({ event: "subscription.charged", payload: {} }, raw),
      reply,
    );

    expect(paymentService.updateSubscription).toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(201);
  });

  test("rejects a bad signature with a 400", async () => {
    const reply = makeReply();
    const body = { event: "subscription.charged" };

    await verificationHandler(
      {
        headers: { "x-razorpay-signature": sign(JSON.stringify(body), "wrong") },
        body,
        rawBody: JSON.stringify(body),
      } as never,
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(paymentService.updateSubscription).not.toHaveBeenCalled();
  });

  test("rejects a missing or truncated signature without throwing", async () => {
    const body = { event: "subscription.charged" };
    const raw = JSON.stringify(body);

    for (const signature of [undefined, sign(raw).slice(0, 10), `${sign(raw)}00`]) {
      const reply = makeReply();
      await verificationHandler(
        { headers: { "x-razorpay-signature": signature }, body, rawBody: raw } as never,
        reply,
      );
      expect(reply.code).toHaveBeenCalledWith(400);
    }
    expect(paymentService.updateSubscription).not.toHaveBeenCalled();
  });

  test("fails loudly when the route did not supply a raw body", async () => {
    const reply = makeReply();

    await verificationHandler(makeRequest({ event: "subscription.charged" }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(paymentService.updateSubscription).not.toHaveBeenCalled();
  });

  test("records the event id and acts on the first delivery", async () => {
    const body = { event: "subscription.charged", payload: { subscription: { entity: {} } } };

    await verificationHandler(delivery(body, { "x-razorpay-event-id": "evt_1" }), makeReply());

    expect(prisma.razorpayWebhookEvent.create).toHaveBeenCalledWith({
      data: { eventId: "evt_1", event: "subscription.charged" },
    });
    expect(paymentService.updateSubscription).toHaveBeenCalledOnce();
  });

  test("acknowledges a replayed event id without acting on it again", async () => {
    // A captured, validly signed delivery replayed later would otherwise reset the org's
    // monthly counters (subscription.charged) or try to credit packs again.
    vi.mocked(prisma.razorpayWebhookEvent.create).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "x",
      }),
    );
    const reply = makeReply();
    const body = { event: "subscription.charged", payload: { subscription: { entity: {} } } };

    await verificationHandler(delivery(body, { "x-razorpay-event-id": "evt_1" }), reply);

    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ success: true, duplicate: true });
    expect(paymentService.updateSubscription).not.toHaveBeenCalled();
  });

  test("frees the event id when handling fails, so Razorpay's retry is applied", async () => {
    pay.updateSubscription.mockResolvedValueOnce({ success: false, error: "db down" });
    const body = { event: "subscription.charged", payload: { subscription: { entity: {} } } };

    await verificationHandler(delivery(body, { "x-razorpay-event-id": "evt_9" }), makeReply());

    expect(prisma.razorpayWebhookEvent.deleteMany).toHaveBeenCalledWith({
      where: { eventId: "evt_9" },
    });
  });

  test("keeps the event id once the event was applied", async () => {
    const body = { event: "subscription.charged", payload: { subscription: { entity: {} } } };

    await verificationHandler(delivery(body, { "x-razorpay-event-id": "evt_2" }), makeReply());

    expect(prisma.razorpayWebhookEvent.deleteMany).not.toHaveBeenCalled();
  });

  test.each([
    ["subscription.authenticated"],
    ["subscription.activated"],
    ["subscription.pending"],
    ["subscription.halted"],
    ["subscription.cancelled"],
    ["subscription.completed"],
  ])("routes %s to the lifecycle recorder", async (event) => {
    const payload = { subscription: { entity: { id: "sub_1" } } };

    await verificationHandler(delivery({ event, payload }), makeReply());

    expect(paymentService.applySubscriptionStatusEvent).toHaveBeenCalledWith(event, payload);
  });

  // subscription.updated is handled now — see the plan-change test below.
  test.each([["subscription.paused"], ["subscription.resumed"], ["payment.authorized"]])(
    "acknowledges %s without touching the order",
    async (event) => {
      // Subscribed to on the dashboard but deliberately unmodelled — see the comment on
      // SUBSCRIPTION_STATUS_BY_EVENT. They must still 200 or Razorpay redelivers them.
      const reply = makeReply();
      const body = { event, payload: { subscription: { entity: { id: "sub_1" } } } };

      await verificationHandler(delivery(body), reply);

      expect(reply.code).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({ success: true, handled: false });
      expect(paymentService.applySubscriptionStatusEvent).not.toHaveBeenCalled();
    },
  );

  test("routes subscription.updated to the plan-change handler", async () => {
    const payload = { subscription: { entity: { id: "sub_1", plan_id: "plan_2" } } };

    await verificationHandler(delivery({ event: "subscription.updated", payload }), makeReply());

    expect(paymentService.applySubscriptionUpdate).toHaveBeenCalledWith(payload);
  });

  test("routes subscription.charged to the subscription updater", async () => {
    const payload = { subscription: { entity: { id: "sub_1" } } };

    await verificationHandler(delivery({ event: "subscription.charged", payload }), makeReply());

    expect(paymentService.updateSubscription).toHaveBeenCalledWith(payload);
  });
});

describe("isValidRazorpaySignature", () => {
  test("accepts the hex HMAC of the exact bytes, and nothing else", () => {
    const raw = '{"event":"payment.captured"}';
    const good = createHmac("sha256", "s").update(raw).digest("hex");

    expect(isValidRazorpaySignature(raw, good, "s")).toBe(true);
    expect(isValidRazorpaySignature(Buffer.from(raw), good, "s")).toBe(true);
    expect(isValidRazorpaySignature(raw, good.toUpperCase(), "s")).toBe(false);
    expect(isValidRazorpaySignature(`${raw} `, good, "s")).toBe(false);
    expect(isValidRazorpaySignature(raw, "", "s")).toBe(false);
    expect(isValidRazorpaySignature(raw, undefined, "s")).toBe(false);
  });
});

describe("getOrgInvoices", () => {
  const axiosGet = vi.spyOn(axios, "get");

  // The spy's config parameter is typed as AxiosRequestConfig, whose `params` is `unknown`.
  const subIdOf = (config?: { params?: unknown }) =>
    (config?.params as { subscription_id?: string } | undefined)?.subscription_id;

  function invoice(id: string, overrides: Record<string, unknown> = {}) {
    return {
      id,
      status: "paid",
      // Razorpay bills in paise — the UI shows major units.
      amount: 240000,
      currency: "INR",
      issued_at: 100,
      paid_at: 200,
      billing_start: 300,
      billing_end: 400,
      short_url: `https://rzp.io/i/${id}`,
      payment_id: `pay_${id}`,
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.mocked(prisma.subscription.findUnique).mockReset();
    vi.mocked(prisma.order.findMany)
      .mockReset()
      .mockResolvedValue([] as never);
    axiosGet.mockReset();
  });

  test("maps a Razorpay invoice into the billing page's shape", async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      subscriptionRef: "sub_1",
    } as never);
    axiosGet.mockResolvedValue({ data: { items: [invoice("inv_1")] } });

    const invoices = await paymentService.getOrgInvoices("org_1");

    expect(axiosGet).toHaveBeenCalledWith(
      "https://api.razorpay.com/v1/invoices",
      expect.objectContaining({ params: { subscription_id: "sub_1", count: 100 } }),
    );
    expect(invoices).toEqual([
      {
        id: "inv_1",
        subscriptionId: "sub_1",
        status: "paid",
        amount: 2400,
        currency: "INR",
        issuedAt: 100,
        paidAt: 200,
        billingStart: 300,
        billingEnd: 400,
        url: "https://rzp.io/i/inv_1",
        paymentId: "pay_inv_1",
      },
    ]);
  });

  test("covers every subscription the org has had, newest charge first", async () => {
    // Re-subscribing creates a new subscription. Scoping to the current one would hide
    // the entire charge history from before the latest signup.
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      subscriptionRef: "sub_new",
    } as never);
    vi.mocked(prisma.order.findMany).mockResolvedValue([
      { subscriptionId: "sub_new" },
      { subscriptionId: "sub_old" },
    ] as never);
    axiosGet.mockImplementation((_url: string, config?: { params?: unknown }) =>
      Promise.resolve({
        data: {
          items:
            subIdOf(config) === "sub_old"
              ? [invoice("inv_old", { issued_at: 50 })]
              : [invoice("inv_new", { issued_at: 900 })],
        },
      }),
    );

    const invoices = await paymentService.getOrgInvoices("org_1");

    // `sub_new` appears in both the subscription ref and the orders — queried once.
    expect(axiosGet).toHaveBeenCalledTimes(2);
    expect(invoices.map((i) => i.id)).toEqual(["inv_new", "inv_old"]);
  });

  test("skips a subscription Razorpay cannot read instead of blanking the history", async () => {
    // A subscription created under a previous account's keys 400s here.
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      subscriptionRef: "sub_ok",
    } as never);
    vi.mocked(prisma.order.findMany).mockResolvedValue([{ subscriptionId: "sub_dead" }] as never);
    axiosGet.mockImplementation((_url: string, config?: { params?: unknown }) =>
      subIdOf(config) === "sub_dead"
        ? Promise.reject(new Error("BAD_REQUEST_ERROR"))
        : Promise.resolve({ data: { items: [invoice("inv_ok")] } }),
    );

    expect((await paymentService.getOrgInvoices("org_1")).map((i) => i.id)).toEqual(["inv_ok"]);
  });

  test.each([[null], [undefined], ["shopify_gid://x"], ["stripe_sub_1"]])(
    "returns an empty list without calling Razorpay for subscriptionRef %s",
    async (subscriptionRef) => {
      // Free, Stripe-billed and Shopify orgs all reach this endpoint; none of them have a
      // Razorpay subscription, and asking Razorpay about one would 400.
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
        subscriptionRef === undefined ? null : ({ subscriptionRef } as never),
      );

      expect(await paymentService.getOrgInvoices("org_1")).toEqual([]);
      expect(axiosGet).not.toHaveBeenCalled();
    },
  );
});

describe("changeSubscriptionPlan", () => {
  const axiosPatch = vi.spyOn(axios, "patch");
  const axiosGetSub = vi.spyOn(axios, "get");

  /** Razorpay's view of the live subscription, as the change-options pre-check reads it. */
  function razorpaySubscription(overrides: Record<string, unknown> = {}) {
    return {
      data: { status: "active", payment_method: "card", current_end: 1789842600, ...overrides },
    };
  }

  const STARTER = { id: "tier_starter", name: "STARTER PLAN", yearlyPrice: 24000 };
  const PRO = {
    id: "tier_pro",
    name: "PRO PLAN",
    displayName: "Pro",
    yearlyPrice: 108000,
    monthlyPaymentPlan: { planId: "plan_pro_m" },
    yearlyPaymentPlan: { planId: "plan_pro_y" },
    usdMonthlyPaymentPlan: { planId: "plan_pro_usd_m" },
    usdYearlyPaymentPlan: { planId: "plan_pro_usd_y" },
  };
  const STARTER_FULL = {
    ...STARTER,
    displayName: "Starter",
    monthlyPaymentPlan: { planId: "plan_starter_m" },
    yearlyPaymentPlan: { planId: "plan_starter_y" },
    usdMonthlyPaymentPlan: { planId: "plan_starter_usd_m" },
    usdYearlyPaymentPlan: { planId: "plan_starter_usd_y" },
  };

  beforeEach(() => {
    vi.mocked(prisma.subscription.findUnique).mockReset();
    vi.mocked(prisma.rateupPlan.findUnique).mockReset();
    // No order row, so the billing currency falls back to INR — the default every
    // subscription created before dollar plans existed charges.
    vi.mocked(prisma.order.findFirst)
      .mockReset()
      .mockResolvedValue(null as never);
    vi.mocked(prisma.paymentPlans.findFirst)
      .mockReset()
      .mockResolvedValue(null as never);
    axiosPatch.mockReset().mockResolvedValue({ data: { status: "active" } });
    // No card_mandate_id by default: the subscription can be re-priced mid-cycle.
    axiosGetSub.mockReset().mockResolvedValue(razorpaySubscription());
  });

  /** `target` is fetched with its gateway plans; `current` is the plain tier row. */
  function onPlan(current: unknown, target: unknown) {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      subscriptionRef: "sub_1",
      basePlanId: (current as { id: string }).id,
    } as never);
    vi.mocked(prisma.rateupPlan.findUnique)
      .mockResolvedValueOnce(target as never)
      .mockResolvedValueOnce(current as never);
  }

  test("applies an upgrade immediately", async () => {
    onPlan(STARTER, PRO);

    const result = await paymentService.changeSubscriptionPlan("org_1", "tier_pro", "yearly");

    expect(result.scheduleChangeAt).toBe("now");
    expect(axiosPatch).toHaveBeenCalledWith(
      "https://api.razorpay.com/v1/subscriptions/sub_1",
      expect.objectContaining({ plan_id: "plan_pro_y", schedule_change_at: "now" }),
      expect.anything(),
    );
  });

  test("defers a downgrade to the end of the cycle", async () => {
    // The customer already paid for the current period; dropping them now would owe a
    // refund and claw back capacity they may have used.
    onPlan(PRO, STARTER_FULL);

    const result = await paymentService.changeSubscriptionPlan("org_1", "tier_starter", "yearly");

    expect(result).toMatchObject({ scheduleChangeAt: "cycle_end", isDowngrade: true });
    expect(axiosPatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ plan_id: "plan_starter_y", schedule_change_at: "cycle_end" }),
      expect.anything(),
    );
  });

  test("compares on the yearly price so a cadence switch is not read as a downgrade", async () => {
    // Pro monthly (10,800) is a smaller number than Starter yearly (24,000), but moving
    // Starter → Pro is an upgrade either way.
    onPlan(STARTER, PRO);

    const result = await paymentService.changeSubscriptionPlan("org_1", "tier_pro", "monthly");

    expect(result).toMatchObject({ scheduleChangeAt: "now", isDowngrade: false });
    expect(axiosPatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ plan_id: "plan_pro_m" }),
      expect.anything(),
    );
  });

  test("defers an upgrade when a card mandate forbids a mid-cycle change", async () => {
    // A card mandate is registered with the bank for a fixed amount, so Razorpay refuses
    // to re-price it partway through a cycle. Practically every Indian card subscription
    // has one, so this is the normal path rather than an edge case.
    onPlan(STARTER, PRO);
    axiosGetSub.mockResolvedValue(razorpaySubscription({ card_mandate_id: "mandate_1" }));

    const result = await paymentService.changeSubscriptionPlan("org_1", "tier_pro", "yearly");

    expect(result).toMatchObject({ scheduleChangeAt: "cycle_end", isDowngrade: false });
    expect(result.deferredReason).toMatch(/next renewal/i);
    expect(axiosPatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ schedule_change_at: "cycle_end" }),
      expect.anything(),
    );
  });

  test("retries as a scheduled change when Razorpay refuses an immediate one", async () => {
    // The pre-check reads the mandate Razorpay reports, but it is not the only reason an
    // immediate change can be refused — the upgrade should still land, just at renewal.
    onPlan(STARTER, PRO);
    axiosPatch.mockRejectedValueOnce(
      Object.assign(new Error("400"), {
        isAxiosError: true,
        response: {
          data: {
            error: {
              description: "Can't update subscription immediately when card mandate is applicable",
            },
          },
        },
      }),
    );

    const result = await paymentService.changeSubscriptionPlan("org_1", "tier_pro", "yearly");

    expect(result.scheduleChangeAt).toBe("cycle_end");
    expect(axiosPatch).toHaveBeenCalledTimes(2);
  });

  test("refuses outright for a UPI subscription, which cannot be updated at all", async () => {
    onPlan(STARTER, PRO);
    axiosGetSub.mockResolvedValue(razorpaySubscription({ payment_method: "upi" }));

    await expect(
      paymentService.changeSubscriptionPlan("org_1", "tier_pro", "yearly"),
    ).rejects.toThrow(/UPI or eMandate/);
    expect(axiosPatch).not.toHaveBeenCalled();
  });

  test("keeps a dollar subscriber on a dollar plan", async () => {
    // A Razorpay plan carries one currency. Handing a USD subscriber the INR plan would
    // change what they are charged in as a side effect of picking a different tier.
    onPlan(STARTER, PRO);
    vi.mocked(prisma.order.findFirst).mockResolvedValue({ planId: "plan_usd_current" } as never);
    vi.mocked(prisma.paymentPlans.findFirst).mockResolvedValue({ currency: "USD" } as never);

    await paymentService.changeSubscriptionPlan("org_1", "tier_pro", "yearly");

    expect(axiosPatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ plan_id: "plan_pro_usd_y" }),
      expect.anything(),
    );
  });

  test("surfaces Razorpay's own reason instead of the HTTP status", async () => {
    onPlan(STARTER, PRO);
    const rejection = Object.assign(new Error("Request failed with status code 400"), {
      isAxiosError: true,
      response: { data: { error: { description: "Subscription is not updatable" } } },
    });
    axiosPatch.mockRejectedValue(rejection);

    await expect(
      paymentService.changeSubscriptionPlan("org_1", "tier_pro", "yearly"),
    ).rejects.toThrow("Subscription is not updatable");
  });

  test("refuses when the org has no Razorpay subscription", async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      subscriptionRef: null,
    } as never);

    await expect(
      paymentService.changeSubscriptionPlan("org_1", "tier_pro", "yearly"),
    ).rejects.toThrow(/no Razorpay subscription/);
    expect(axiosPatch).not.toHaveBeenCalled();
  });
});

describe("syncPaymentPlans", () => {
  // Mocked at the top of this file for the controller tests; reach past it for the real one.
  let service: typeof import("./payment.service.js");
  beforeAll(async () => {
    service = await vi.importActual<typeof import("./payment.service.js")>("./payment.service.js");
  });

  const axiosGet = vi.spyOn(axios, "get");

  /** One entry of Razorpay's plan list. `active` lives on the nested item, not the plan. */
  function gatewayPlan(id: string, active = true) {
    return {
      id,
      period: "yearly",
      interval: 1,
      created_at: 1,
      item: { name: id, amount: 100_000, currency: "INR", active },
    };
  }

  beforeEach(() => {
    axiosGet.mockReset();
    vi.mocked(prisma.rateupPlan.findMany)
      .mockReset()
      .mockResolvedValue([] as never);
    vi.mocked(prisma.paymentPlans.findFirst)
      .mockReset()
      .mockResolvedValue(null as never);
    vi.mocked(prisma.paymentPlans.create)
      .mockReset()
      .mockResolvedValue({} as never);
    vi.mocked(prisma.paymentPlans.update)
      .mockReset()
      .mockResolvedValue({} as never);
  });

  function statusWritten() {
    const call = vi.mocked(prisma.paymentPlans.update).mock.calls[0]?.[0];
    return (call as { data?: { status?: string } } | undefined)?.data?.status;
  }

  test("never imports a plan Razorpay has retired", async () => {
    axiosGet.mockResolvedValue({ data: { items: [gatewayPlan("plan_dead", false)] } });

    expect(await service.syncPaymentPlans()).toMatchObject({
      data: { created: 0, skipped: 1 },
    });
    expect(prisma.paymentPlans.create).not.toHaveBeenCalled();
  });

  test("disables a known plan once Razorpay retires it", async () => {
    vi.mocked(prisma.paymentPlans.findFirst).mockResolvedValue({
      id: "pp-1",
      status: "ACTIVE",
    } as never);
    axiosGet.mockResolvedValue({ data: { items: [gatewayPlan("plan_1", false)] } });

    await service.syncPaymentPlans();

    expect(statusWritten()).toBe("INACTIVE");
  });

  test("keeps a plan a catalog tier links as ACTIVE", async () => {
    vi.mocked(prisma.rateupPlan.findMany).mockResolvedValue([
      { paymentPlanId: null, monthlyPaymentPlanId: null, yearlyPaymentPlanId: "pp-1" },
    ] as never);
    vi.mocked(prisma.paymentPlans.findFirst).mockResolvedValue({
      id: "pp-1",
      status: "INACTIVE",
    } as never);
    axiosGet.mockResolvedValue({ data: { items: [gatewayPlan("plan_1")] } });

    await service.syncPaymentPlans();

    expect(statusWritten()).toBe("ACTIVE");
  });

  test("disables an active gateway plan that no tier sells", async () => {
    // The Razorpay account still holds every plan ever made there, all of them `active`
    // because Razorpay cannot retire one. Without this the sync walks over the catalog
    // retirement on every run and puts years of dead products back on sale.
    vi.mocked(prisma.rateupPlan.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.paymentPlans.findFirst).mockResolvedValue({
      id: "pp-orphan",
      status: "ACTIVE",
    } as never);
    axiosGet.mockResolvedValue({ data: { items: [gatewayPlan("plan_legacy")] } });

    expect(await service.syncPaymentPlans()).toMatchObject({ data: { deactivated: 1 } });
    expect(statusWritten()).toBe("INACTIVE");
  });

  test("brings a brand-new plan in disabled, not on sale", async () => {
    // Nothing links it yet. Putting a product on sale is a deliberate act, not a side
    // effect of someone creating a plan in the Razorpay dashboard.
    axiosGet.mockResolvedValue({ data: { items: [gatewayPlan("plan_new")] } });

    await service.syncPaymentPlans();

    const created = vi.mocked(prisma.paymentPlans.create).mock.calls[0]?.[0] as {
      data: { status: string };
    };
    expect(created.data.status).toBe("INACTIVE");
  });

  test("writes nothing when every plan already has the right status", async () => {
    vi.mocked(prisma.paymentPlans.findFirst).mockResolvedValue({
      id: "pp-1",
      status: "INACTIVE",
    } as never);
    axiosGet.mockResolvedValue({ data: { items: [gatewayPlan("plan_1")] } });

    await service.syncPaymentPlans();

    expect(prisma.paymentPlans.update).not.toHaveBeenCalled();
  });
});

describe("a pack arriving on the subscription webhook", () => {
  let service: typeof import("./payment.service.js");
  beforeAll(async () => {
    service = await vi.importActual<typeof import("./payment.service.js")>("./payment.service.js");
  });

  const PACK = { id: "addon-1", name: "ACTIVE CONTACT PACK", planType: "ADDON", features: {} };

  function charged() {
    return {
      subscription: {
        entity: {
          id: "sub_addon",
          plan_id: "plan_pack",
          current_end: Math.floor(Date.now() / 1000) + 86_400,
          notes: { orgId: "org-1" },
        },
      },
    };
  }

  beforeEach(() => {
    vi.mocked(prisma.paymentPlans.findFirst)
      .mockReset()
      .mockResolvedValue({ id: "pp" } as never);
    vi.mocked(prisma.rateupPlan.findFirst)
      .mockReset()
      .mockResolvedValue(PACK as never);
    vi.mocked(prisma.subscription.update)
      .mockReset()
      .mockResolvedValue({} as never);
    vi.mocked(prisma.order.update)
      .mockReset()
      .mockResolvedValue({} as never);
  });

  test("is refused rather than replacing the customer's plan", async () => {
    // Packs are bought outright now, so nothing should ever arrive here on an add-on
    // plan. The bug this guards is what the alternative would be: falling through to the
    // base-plan write, swapping a subscriber's tier for a pack.
    const result = await service.updateSubscription(charged());

    expect(result.success).toBe(false);
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  test("still moves the plan for a BASE tier", async () => {
    vi.mocked(prisma.rateupPlan.findFirst).mockResolvedValue({
      ...PACK,
      planType: "BASE",
    } as never);

    await service.updateSubscription(charged());

    expect(prisma.subscription.update).toHaveBeenCalled();
  });
});

describe("the internal alert on a subscription charge", () => {
  let service: typeof import("./payment.service.js");
  beforeAll(async () => {
    service = await vi.importActual<typeof import("./payment.service.js")>("./payment.service.js");
  });

  const PLAN = { id: "plan-pro", name: "PRO PLAN", displayName: "Pro", planType: "BASE" };

  function charged() {
    return {
      subscription: {
        entity: {
          id: "sub_1",
          plan_id: "plan_pro",
          current_end: Math.floor(Date.now() / 1000) + 86_400,
          notes: { orgId: "org-1" },
        },
      },
      payment: { entity: { email: "owner@example.com", amount: 400_000, currency: "INR" } },
    };
  }

  beforeEach(() => {
    vi.mocked(sendSubscriptionPurchasedAlert).mockClear();
    vi.mocked(prisma.paymentPlans.findFirst)
      .mockReset()
      .mockResolvedValue({ id: "pp" } as never);
    vi.mocked(prisma.rateupPlan.findFirst)
      .mockReset()
      .mockResolvedValue(PLAN as never);
    vi.mocked(prisma.subscription.update)
      .mockReset()
      .mockResolvedValue({} as never);
    vi.mocked(prisma.order.update)
      .mockReset()
      .mockResolvedValue({ id: "order-1" } as never);
    vi.mocked(prisma.usageStats.update)
      .mockReset()
      .mockResolvedValue({} as never);
    vi.mocked(prisma.order.findUnique).mockReset();
  });

  test("fires when the order is not yet complete, i.e. on the first charge", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ status: "PENDING" } as never);

    await service.updateSubscription(charged());

    expect(sendSubscriptionPurchasedAlert).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org-1", planName: "Pro", gateway: "Razorpay" }),
    );
  });

  test("stays silent on a renewal, whose order is already complete", async () => {
    // `subscription.charged` fires every cycle; only the first one is news. This is also
    // what makes a webhook redelivery of the first charge silent.
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ status: "COMPLETE" } as never);

    await service.updateSubscription(charged());

    expect(sendSubscriptionPurchasedAlert).not.toHaveBeenCalled();
  });
});

describe("buying packs outright", () => {
  const axiosPost = vi.spyOn(axios, "post");
  let service: typeof import("./payment.service.js");
  beforeAll(async () => {
    service = await vi.importActual<typeof import("./payment.service.js")>("./payment.service.js");
  });

  const PACK = {
    id: "addon-1",
    name: "ACTIVE CONTACT PACK",
    displayName: "Active contact pack",
    planType: "ADDON",
    monthlyPrice: 999,
    usdMonthlyPrice: 19,
  };

  /** An org on a plan that links a gateway product, i.e. one allowed to buy packs. */
  function onPaidPlan() {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      subscriptionRef: null,
      basePlan: {
        name: "PRO PLAN",
        displayName: "Pro",
        paymentPlanId: null,
        monthlyPaymentPlanId: "gw",
        yearlyPaymentPlanId: null,
        stripeId: null,
      },
    } as never);
  }

  beforeEach(() => {
    vi.mocked(prisma.subscription.findUnique).mockReset();
    vi.mocked(prisma.rateupPlan.findFirst)
      .mockReset()
      .mockResolvedValue(PACK as never);
    vi.mocked(prisma.subscriptionAddon.findMany)
      .mockReset()
      .mockResolvedValue([] as never);
    vi.mocked(prisma.subscriptionAddon.findUnique)
      .mockReset()
      .mockResolvedValue(null as never);
    vi.mocked(prisma.subscriptionAddon.create)
      .mockReset()
      .mockResolvedValue({} as never);
    vi.mocked(prisma.order.create)
      .mockReset()
      .mockResolvedValue({ id: "order-1" } as never);
    vi.mocked(prisma.order.update)
      .mockReset()
      .mockResolvedValue({ id: "order-1" } as never);
    vi.mocked(prisma.order.delete)
      .mockReset()
      .mockResolvedValue({} as never);
    vi.mocked(prisma.order.findUnique).mockReset();
    vi.mocked(prisma.payments.create)
      .mockReset()
      .mockResolvedValue({ id: "pay-row" } as never);
    axiosPost.mockReset().mockResolvedValue({ data: { id: "order_rzp" } });
  });

  test("creates a one-off order, not a subscription", async () => {
    onPaidPlan();

    const result = await service.createAddonOrder("user-1", "org-1", "ACTIVE_CONTACTS", 2);

    expect(axiosPost.mock.calls[0]?.[0]).toBe("https://api.razorpay.com/v1/orders");
    expect(result.gatewayOrderId).toBe("order_rzp");
  });

  test("charges for every pack asked for", async () => {
    onPaidPlan();

    const result = await service.createAddonOrder("user-1", "org-1", "ACTIVE_CONTACTS", 3);

    // Minor units at the gateway, major units back to the caller.
    expect(axiosPost.mock.calls[0]?.[1]).toMatchObject({
      amount: 3 * 999 * 100,
      currency: "INR",
    });
    expect(result.amount).toBe(3 * 999);
  });

  test("sells the pack row for the kind asked for, and tags the order with it", async () => {
    onPaidPlan();

    const result = await service.createAddonOrder("user-1", "org-1", "CAMPAIGN_CREDITS", 1);

    expect(prisma.rateupPlan.findFirst).toHaveBeenCalledWith({
      where: { name: "CAMPAIGN CREDIT PACK" },
    });
    expect(axiosPost.mock.calls[0]?.[1]).toMatchObject({
      notes: { addonKind: "CAMPAIGN_CREDITS" },
    });
    expect(result.kind).toBe("CAMPAIGN_CREDITS");
  });

  test("refuses a plan that may not buy packs, before charging anything", async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      subscriptionRef: null,
      basePlan: {
        name: "FREE PLAN",
        displayName: "Free",
        paymentPlanId: null,
        monthlyPaymentPlanId: null,
        yearlyPaymentPlanId: null,
        stripeId: null,
      },
    } as never);

    await expect(service.createAddonOrder("user-1", "org-1", "ACTIVE_CONTACTS", 1)).rejects.toThrow(
      /Upgrading/,
    );
    expect(axiosPost).not.toHaveBeenCalled();
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  test("caps one order rather than billing an unbounded amount", async () => {
    onPaidPlan();

    const result = await service.createAddonOrder("user-1", "org-1", "ACTIVE_CONTACTS", 5_000);

    expect(result.quantity).toBe(service.MAX_PACKS_PER_ORDER);
  });

  test("does not leave an unpayable order behind when the gateway fails", async () => {
    onPaidPlan();
    axiosPost.mockRejectedValue(new Error("razorpay down"));

    await expect(
      service.createAddonOrder("user-1", "org-1", "ACTIVE_CONTACTS", 1),
    ).rejects.toThrow();
    expect(prisma.order.delete).toHaveBeenCalledWith({ where: { id: "order-1" } });
  });
});

describe("crediting packs when the payment lands", () => {
  let service: typeof import("./payment.service.js");
  beforeAll(async () => {
    service = await vi.importActual<typeof import("./payment.service.js")>("./payment.service.js");
  });

  function captured(overrides: Record<string, unknown> = {}) {
    return {
      id: "pay_1",
      amount: 3 * 999 * 100,
      currency: "INR",
      method: "card",
      created_at: Math.floor(Date.now() / 1000),
      order_id: "order_rzp",
      notes: {},
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.mocked(prisma.payments.upsert)
      .mockReset()
      .mockResolvedValue({ id: "pay-row" } as never);
    vi.mocked(prisma.order.update)
      .mockReset()
      .mockResolvedValue({} as never);
    vi.mocked(prisma.order.updateMany)
      .mockReset()
      .mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.order.findUnique).mockReset();
    vi.mocked(prisma.subscriptionAddon.findUnique)
      .mockReset()
      .mockResolvedValue(null as never);
    vi.mocked(prisma.subscriptionAddon.create)
      .mockReset()
      .mockResolvedValue({} as never);
  });

  function onAddonOrder(
    name = "ACTIVE CONTACT PACK",
    order: Record<string, unknown> = {
      addonQuantity: 3,
      amountMinor: 3 * 999 * 100,
      currency: "INR",
    },
  ) {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: "order-1",
      orgId: "org-1",
      paymentStatus: "PENDING",
      addonQuantity: null,
      amountMinor: null,
      currency: null,
      ...order,
      RateupPlan: {
        id: "addon-1",
        name,
        planType: "ADDON",
        monthlyPrice: 999,
        usdMonthlyPrice: 19,
      },
    } as never);
  }

  function credited() {
    return (
      vi.mocked(prisma.subscriptionAddon.create).mock.calls[0][0] as unknown as {
        data: {
          orgId: string;
          kind: string;
          quantity: number;
          creditsGranted: number | null;
          expiresAt: Date;
          paymentRef: string;
        };
      }
    ).data;
  }

  const daysOut = (date: Date) => Math.round((date.getTime() - Date.now()) / 86_400_000);

  test("finds the order by the gateway order id Razorpay set, not by the notes", async () => {
    onAddonOrder();

    await service.verifyPayment(
      captured({ notes: { rateupOrderId: "someone-elses-order" } }),
      "payment.captured",
    );

    expect(vi.mocked(prisma.order.findUnique).mock.calls[0][0].where).toEqual({
      checkoutRefId: "order_rzp",
    });
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "order-1" } }),
    );
  });

  test("credits the packs the order bought, whatever the payment notes claim", async () => {
    // WEBH-2: the browser sets the payment's notes; one pack paid for must not become 1000.
    onAddonOrder();

    await service.verifyPayment(
      captured({ notes: { rateupOrderId: "order-1", addonQuantity: "1000", orgId: "org-2" } }),
      "payment.captured",
    );

    expect(credited()).toMatchObject({ quantity: 3, paymentRef: "pay_1", orgId: "org-1" });
  });

  test("refuses a capture whose amount is not the order's", async () => {
    onAddonOrder();

    const result = await service.verifyPayment(captured({ amount: 999 * 100 }), "payment.captured");

    expect(result.success).toBe(false);
    expect(prisma.payments.upsert).not.toHaveBeenCalled();
    expect(prisma.subscriptionAddon.create).not.toHaveBeenCalled();
  });

  test("refuses a capture in another currency", async () => {
    onAddonOrder();

    const result = await service.verifyPayment(captured({ currency: "USD" }), "payment.captured");

    expect(result.success).toBe(false);
    expect(prisma.subscriptionAddon.create).not.toHaveBeenCalled();
  });

  test("an order from before quantities were stored is credited from the captured amount", async () => {
    onAddonOrder("ACTIVE CONTACT PACK", {});

    await service.verifyPayment(captured({ amount: 2 * 999 * 100 }), "payment.captured");

    expect(credited().quantity).toBe(2);
  });

  test("an older order whose amount is no whole number of packs is refused", async () => {
    onAddonOrder("ACTIVE CONTACT PACK", {});

    const result = await service.verifyPayment(captured({ amount: 1_000 }), "payment.captured");

    expect(result.success).toBe(false);
    expect(prisma.subscriptionAddon.create).not.toHaveBeenCalled();
  });

  test("ignores a payment no order names, such as a subscription's", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null as never);

    const result = await service.verifyPayment(
      captured({ order_id: "order_auto", notes: { rateupOrderId: "order-1" } }),
      "payment.captured",
    );

    expect(result).toMatchObject({ success: true, handled: false });
    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(prisma.payments.upsert).not.toHaveBeenCalled();
  });

  test("dates a contact pack a month out, so it lapses on its own", async () => {
    onAddonOrder();

    await service.verifyPayment(captured(), "payment.captured");

    expect(credited()).toMatchObject({ kind: "ACTIVE_CONTACTS", creditsGranted: null });
    expect(daysOut(credited().expiresAt)).toBe(30);
  });

  test("grants a credit pack's credits and dates it 90 days out", async () => {
    onAddonOrder("CAMPAIGN CREDIT PACK", {
      addonQuantity: 2,
      amountMinor: 2 * 999 * 100,
      currency: "INR",
    });

    await service.verifyPayment(captured({ amount: 2 * 999 * 100 }), "payment.captured");

    expect(credited()).toMatchObject({ kind: "CAMPAIGN_CREDITS", creditsGranted: 20_000 });
    expect(daysOut(credited().expiresAt)).toBe(90);
  });

  test("credits an order placed before the pack was renamed as contacts", async () => {
    onAddonOrder("CONVERSATION PACK");

    await service.verifyPayment(captured(), "payment.captured");

    expect(credited().kind).toBe("ACTIVE_CONTACTS");
  });

  test("credits a retried webhook only once", async () => {
    // Razorpay retries a delivery it did not get a 200 for.
    onAddonOrder();
    vi.mocked(prisma.subscriptionAddon.findUnique).mockResolvedValue({ id: "existing" } as never);

    await service.verifyPayment(captured(), "payment.captured");

    expect(prisma.subscriptionAddon.create).not.toHaveBeenCalled();
  });

  test("credits nothing for an ordinary plan payment", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: "order-1",
      orgId: "org-1",
      amountMinor: null,
      currency: null,
      addonQuantity: null,
      RateupPlan: { id: "pro", name: "PRO PLAN", planType: "BASE" },
    } as never);

    await service.verifyPayment(captured(), "payment.captured");

    expect(prisma.subscriptionAddon.create).not.toHaveBeenCalled();
  });

  test("a failed attempt records nothing and never overwrites a successful payment", async () => {
    onAddonOrder();

    await service.verifyPayment(captured(), "payment.failed");

    expect(prisma.subscriptionAddon.create).not.toHaveBeenCalled();
    expect(prisma.payments.upsert).not.toHaveBeenCalled();
    expect(prisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order-1", paymentStatus: { not: "SUCCESS" } },
      }),
    );
  });
});

describe("the Razorpay subscription checkout", () => {
  const axiosPost = vi.spyOn(axios, "post");
  let service: typeof import("./payment.service.js");
  beforeAll(async () => {
    service = await vi.importActual<typeof import("./payment.service.js")>("./payment.service.js");
  });

  const gw = (planId: string, period: string, amount: number, currency = "INR") => ({
    id: `pp-${planId}`,
    planId,
    period,
    amount,
    currency,
    status: "ACTIVE",
  });
  const PRO = {
    id: "pro",
    name: "PRO PLAN",
    displayName: "Pro",
    planType: "BASE",
    paymentPlan: null,
    monthlyPaymentPlan: gw("plan_pro_m", "monthly", 4000),
    yearlyPaymentPlan: gw("plan_pro_y", "yearly", 40000),
    usdMonthlyPaymentPlan: gw("plan_pro_usd_m", "monthly", 49, "USD"),
    usdYearlyPaymentPlan: null,
  };

  beforeEach(() => {
    vi.mocked(prisma.rateupPlan.findUnique)
      .mockReset()
      .mockResolvedValue(PRO as never);
    vi.mocked(prisma.order.create)
      .mockReset()
      .mockImplementation((async (args: { data: object }) => ({
        id: "o-1",
        ...args.data,
      })) as never);
    axiosPost.mockReset().mockResolvedValue({ data: { id: "sub_new", current_end: 1 } });
  });

  const body = (over: Record<string, unknown> = {}) =>
    ({ rateupPlanId: "pro", period: "monthly", planId: "plan_pro_m", ...over }) as never;

  test("writes the session's org, not the body's, onto the order and the notes", async () => {
    await service.createCheckoutSession("user-1", "org-me", body({ orgId: "org-victim" }));

    const order = vi.mocked(prisma.order.create).mock.calls[0][0].data;
    expect(order.orgId).toBe("org-me");
    expect(axiosPost.mock.calls[0][1]).toMatchObject({ notes: { orgId: "org-me" } });
  });

  test("names the order after the tier, not the body's planName", async () => {
    await service.createCheckoutSession("user-1", "org-me", body({ planName: "Enterprise" }));

    expect(vi.mocked(prisma.order.create).mock.calls[0][0].data).toMatchObject({
      name: "Pro",
      rateupPlanId: "pro",
      planId: "plan_pro_m",
      amountMinor: 400_000,
      currency: "INR",
    });
  });

  test("honours a gateway plan the tier links, which is how the UI picks dollars", async () => {
    await service.createCheckoutSession("user-1", "org-me", body({ planId: "plan_pro_usd_m" }));

    expect(axiosPost.mock.calls[0][1]).toMatchObject({ plan_id: "plan_pro_usd_m" });
  });

  test("refuses a gateway plan the tier does not link", async () => {
    // MSG-1: the cheapest (or an orphaned) gateway plan paired with an expensive tier.
    await expect(
      service.createCheckoutSession("user-1", "org-me", body({ planId: "plan_starter_m" })),
    ).rejects.toThrow(/not available/);
    expect(axiosPost).not.toHaveBeenCalled();
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  test("refuses an unknown tier and a pack", async () => {
    vi.mocked(prisma.rateupPlan.findUnique).mockResolvedValueOnce(null as never);
    await expect(service.createCheckoutSession("u", "o", body())).rejects.toThrow();

    vi.mocked(prisma.rateupPlan.findUnique).mockResolvedValueOnce({
      ...PRO,
      planType: "ADDON",
    } as never);
    await expect(service.createCheckoutSession("u", "o", body())).rejects.toThrow(/one-off/);
    expect(axiosPost).not.toHaveBeenCalled();
  });

  test("refuses a retired gateway plan", async () => {
    vi.mocked(prisma.rateupPlan.findUnique).mockResolvedValueOnce({
      ...PRO,
      monthlyPaymentPlan: { ...PRO.monthlyPaymentPlan, status: "INACTIVE" },
    } as never);

    await expect(service.createCheckoutSession("u", "o", body())).rejects.toThrow();
  });

  test("picks the tier's own plan for the period when the body names none", async () => {
    await service.createCheckoutSession("u", "o", body({ planId: undefined, period: "yearly" }));

    expect(axiosPost.mock.calls[0][1]).toMatchObject({ plan_id: "plan_pro_y", total_count: 100 });
  });

  test("the handler passes the session org", async () => {
    pay.createCheckoutSession.mockResolvedValueOnce({ success: true });

    await createRazorpayCheckoutHandler(
      { body: { rateupPlanId: "pro", orgId: "org-victim" }, user: { orgId: ORG } } as never,
      reply(),
    );

    expect(pay.createCheckoutSession).toHaveBeenCalledWith(USER, ORG, expect.anything());
  });
});

describe("subscription.charged trusts only server-side links", () => {
  let service: typeof import("./payment.service.js");
  beforeAll(async () => {
    service = await vi.importActual<typeof import("./payment.service.js")>("./payment.service.js");
  });

  const END = Math.floor(Date.now() / 1000) + 86_400;
  const charged = (notes: Record<string, string> = {}) => ({
    subscription: { entity: { id: "sub_1", plan_id: "plan_x", current_end: END, notes } },
    payment: { entity: { id: "pay_9", amount: 400_000, currency: "INR", method: "card" } },
  });

  beforeEach(() => {
    vi.mocked(prisma.paymentPlans.findFirst).mockReset();
    vi.mocked(prisma.rateupPlan.findFirst).mockReset();
    vi.mocked(prisma.rateupPlan.findUnique).mockReset();
    vi.mocked(prisma.subscription.findUnique)
      .mockReset()
      .mockResolvedValue(null as never);
    vi.mocked(prisma.subscription.update)
      .mockReset()
      .mockResolvedValue({} as never);
    vi.mocked(prisma.order.update)
      .mockReset()
      .mockResolvedValue({ id: "order-1" } as never);
    vi.mocked(prisma.usageStats.update)
      .mockReset()
      .mockResolvedValue({} as never);
    vi.mocked(prisma.payments.upsert)
      .mockReset()
      .mockResolvedValue({ id: "pay-row" } as never);
    vi.mocked(prisma.order.findUnique).mockReset();
  });

  test("an unlinked gateway plan does not fall back to notes.rateupPlanId", async () => {
    vi.mocked(prisma.paymentPlans.findFirst).mockResolvedValue({ id: "pp-orphan" } as never);
    vi.mocked(prisma.rateupPlan.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.rateupPlan.findUnique).mockResolvedValue({ id: "enterprise" } as never);

    const result = await service.updateSubscription(charged({ rateupPlanId: "enterprise" }));

    expect(result.success).toBe(false);
    expect(prisma.rateupPlan.findUnique).not.toHaveBeenCalled();
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  test("writes the subscription of the org on the order, not the one in the notes", async () => {
    vi.mocked(prisma.paymentPlans.findFirst).mockResolvedValue({ id: "pp" } as never);
    vi.mocked(prisma.rateupPlan.findFirst).mockResolvedValue({
      id: "pro",
      name: "PRO",
      planType: "BASE",
    } as never);
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: "order-1",
      status: "PENDING",
      orgId: "org-owner",
      paymentId: null,
    } as never);

    await service.updateSubscription(charged({ orgId: "org-victim" }));

    expect(vi.mocked(prisma.subscription.update).mock.calls[0][0].where).toEqual({
      orgId: "org-owner",
    });
    expect(vi.mocked(prisma.usageStats.update).mock.calls[0][0].where).toEqual({
      orgId: "org-owner",
    });
    // The authenticated charge is what marks the subscription order paid.
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: "SUCCESS", paymentId: "pay-row" }),
      }),
    );
  });

  test("a replay of a cycle already applied resets nothing", async () => {
    vi.mocked(prisma.paymentPlans.findFirst).mockResolvedValue({ id: "pp" } as never);
    vi.mocked(prisma.rateupPlan.findFirst).mockResolvedValue({
      id: "pro",
      name: "PRO",
      planType: "BASE",
    } as never);
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: "order-1",
      status: "COMPLETE",
      orgId: "org-owner",
      paymentId: "pay-row",
    } as never);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      subscriptionRef: "sub_1",
      basePlanId: "pro",
      expiresAt: new Date(END * 1000),
    } as never);

    const result = await service.updateSubscription(charged());

    expect(result).toMatchObject({ success: true, duplicate: true });
    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(prisma.usageStats.update).not.toHaveBeenCalled();
  });
});

describe("updateOrder", () => {
  let service: typeof import("./payment.service.js");
  beforeAll(async () => {
    service = await vi.importActual<typeof import("./payment.service.js")>("./payment.service.js");
  });

  beforeEach(() => {
    vi.mocked(prisma.order.updateMany).mockReset();
    vi.mocked(prisma.order.findFirst).mockReset();
  });

  test("COMPLETE is written only where the order is paid, in the same UPDATE", async () => {
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.order.findFirst).mockResolvedValue({ id: "o" } as never);

    const outcome = await service.updateOrder("o", "COMPLETE", "org-1");

    expect(outcome).toBe("unpaid");
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: "o", orgId: "org-1", paymentStatus: "SUCCESS" },
      data: { status: "COMPLETE" },
    });
  });

  test("another org's order is not found", async () => {
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.order.findFirst).mockResolvedValue(null as never);

    expect(await service.updateOrder("o", "FAILED", "org-1")).toBe("not_found");
  });

  test("a paid order is updated", async () => {
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 1 } as never);

    expect(await service.updateOrder("o", "COMPLETE", "org-1")).toBe("updated");
  });
});
