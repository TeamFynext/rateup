import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

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
      delete: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    subscription: { update: vi.fn(), findUnique: vi.fn() },
    subscriptionAddon: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    payments: { create: vi.fn() },
    rateupPlan: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    usageStats: { update: vi.fn() },
    paymentPlans: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
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
    sendEmailPlanSelectionDetails: vi.fn(),
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
}));

vi.mock("supertokens-node/recipe/session/index.js", () => ({
  default: { getSession: vi.fn() },
}));

vi.mock("fastify-raw-body", () => ({ default: vi.fn() }));

vi.mock("razorpay/dist/utils/razorpay-utils.js", () => ({
  validateWebhookSignature: vi.fn(),
}));

import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils.js";

vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../../utils/auth.js", () => ({ assertRootOrg: vi.fn() }));
vi.mock("../../utils/checkRoleHandler.js", () => ({
  checkRoleHandler: vi.fn((roles) => Object.assign(vi.fn(), { roles })),
}));

import Session from "supertokens-node/recipe/session/index.js";
import axios from "axios";

import prisma from "../../utils/prisma.js";
import * as paymentService from "./payment.service.js";
import * as stripeService from "./stripe/stripe.service.js";
import { assertRootOrg } from "../../utils/auth.js";
import { checkSession } from "../../utils/checkSession.js";
import { updateSubscriptionOrderHandler, verificationHandler } from "./payment.controller.js";
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
  pay.updateOrder.mockResolvedValue({
    id: VICTIM_ORDER,
    orgId: ORG,
    paymentStatus: "SUCCESS",
    rateupPlanId: ENTERPRISE_PLAN,
    subscriptionId: "sub_x",
  });
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
    pay.updateOrder.mockResolvedValueOnce({
      id: VICTIM_ORDER,
      orgId: ORG,
      paymentStatus: "PENDING",
      rateupPlanId: ENTERPRISE_PLAN,
      subscriptionId: "sub_x",
    });
    const rep = reply();

    await updateSubscriptionOrderHandler(req({ status: "COMPLETE" }), rep);

    expect(answer(rep).code).toBe(409);
  });

  test("an order outside the caller's org answers 404", async () => {
    pay.updateOrder.mockRejectedValueOnce(
      Object.assign(new Error("Record to update not found."), { code: "P2025" }),
    );
    const rep = reply();

    await updateSubscriptionOrderHandler(req({ status: "COMPLETE" }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { message: "Order not found" } });
  });

  test("any other status writes the order and skips the paid-order guard", async () => {
    await updateSubscriptionOrderHandler(req({ status: "PENDING" }), reply());

    expect(pay.updateOrder).toHaveBeenCalledOnce();
  });

  test("the status comparison is exact", async () => {
    // A lowercase "complete" is not COMPLETE, so the unpaid guard must not fire —
    // otherwise the comparison has gone case-insensitive somewhere.
    pay.updateOrder.mockResolvedValueOnce({
      id: VICTIM_ORDER,
      orgId: ORG,
      paymentStatus: "PENDING",
      rateupPlanId: ENTERPRISE_PLAN,
      subscriptionId: "sub_x",
    });
    const rep = reply();

    await updateSubscriptionOrderHandler(req({ status: "complete" }), rep);

    expect(answer(rep).code).toBe(200);
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

  test("the route requires SUPER_ADMIN and validates its body", async () => {
    const { routes } = await collectPaymentRoutes();

    const order = routes.find((r) => r.url === "/order/:orderId");
    expect(order.handler).toBe(updateSubscriptionOrderHandler);
    expect((order.opts.preHandler[0] as any).roles).toEqual(["SUPER_ADMIN"]);
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

  test("the cancellation keeps its role check rather than a platform one", async () => {
    const { routes } = await collectStripeRoutes();

    const cancel = routes.find((r) => r.url === "/subscriptions/cancel");
    expect((cancel.opts.preHandler[0] as any).roles).toEqual(["SUPER_ADMIN"]);
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
  const body = { priceId: "price_1", email: "buyer@example.test" };

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

    await createCheckoutSessionHandler({ body } as never, reply());

    expect(order).toEqual(["order", "stripe"]);
  });

  test("a Stripe failure removes the order and answers rather than escaping", async () => {
    stripeStub.checkout.sessions.create.mockRejectedValueOnce(new Error("No such price"));
    const rep = reply();

    await expect(createCheckoutSessionHandler({ body } as never, rep)).resolves.toBeDefined();

    expect(stripeSvc.createOrder).toHaveBeenCalledOnce();
    expect(stripeSvc.deleteOrder).toHaveBeenCalledWith("order-1");
    expect(stripeSvc.updateOrder).not.toHaveBeenCalled();
    expect(answer(rep).code).toBe(502);
  });

  test("a cleanup failure does not mask the checkout failure", async () => {
    stripeStub.checkout.sessions.create.mockRejectedValueOnce(new Error("No such price"));
    stripeSvc.deleteOrder.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await expect(createCheckoutSessionHandler({ body } as never, rep)).resolves.toBeDefined();

    expect(answer(rep).code).toBe(502);
  });

  test("carries the local order id into the Stripe metadata", async () => {
    await createCheckoutSessionHandler({ body } as never, reply());

    const arg = stripeStub.checkout.sessions.create.mock.calls[0][0];
    expect(arg.metadata).toEqual({ rateupOrderId: "order-1" });
    expect(arg.subscription_data.metadata).toEqual({ rateupOrderId: "order-1" });
  });

  test("requests the ui_mode this API version documents", async () => {
    await createCheckoutSessionHandler({ body } as never, reply());

    expect(stripeStub.checkout.sessions.create.mock.calls[0][0].ui_mode).toBe("embedded_page");
  });

  test("takes the price and the customer email from the request body", async () => {
    await createCheckoutSessionHandler({ body } as never, reply());

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
      "POST /mail",
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

    expect(a.hooks).toEqual([{ name: "preHandler", fn: checkSession }]);
    expect(b.hooks).toEqual([{ name: "preHandler", fn: checkSession }]);
  });

  test("the Razorpay cancellation is restricted to the owner role", async () => {
    const { routes } = await collectPaymentRoutes();

    const cancel = routes.find((r) => r.url === "/subscriptions/cancel");
    expect((cancel.opts.preHandler[0] as any).roles).toEqual(["SUPER_ADMIN"]);
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

  function makeRequest(body: unknown, rawBody?: string) {
    return {
      headers: { "x-razorpay-signature": "sig" },
      body,
      rawBody,
    } as never;
  }

  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "rzp_secret";
  });

  afterEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = OLD_SECRET;
  });

  test("verifies the signature against the raw bytes, not a re-serialization", async () => {
    // Razorpay signs what it sent. The parsed body round-trips to different bytes here
    // (spacing), so passing JSON.stringify(request.body) would hash the wrong string.
    vi.mocked(validateWebhookSignature).mockReturnValue(true);
    const raw = '{ "event": "subscription.paused" }';

    await verificationHandler(makeRequest({ event: "subscription.paused" }, raw), makeReply());

    expect(validateWebhookSignature).toHaveBeenCalledWith(raw, "sig", "rzp_secret");
  });

  test("rejects a bad signature with a 400", async () => {
    vi.mocked(validateWebhookSignature).mockReturnValue(false);
    const reply = makeReply();

    const body = { event: "subscription.charged" };
    await verificationHandler(makeRequest(body, JSON.stringify(body)), reply);

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(paymentService.updateSubscription).not.toHaveBeenCalled();
  });

  test("fails loudly when the route did not supply a raw body", async () => {
    vi.mocked(validateWebhookSignature).mockReturnValue(true);
    const reply = makeReply();

    await verificationHandler(makeRequest({ event: "subscription.charged" }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(validateWebhookSignature).not.toHaveBeenCalled();
  });

  test.each([
    ["subscription.authenticated"],
    ["subscription.activated"],
    ["subscription.pending"],
    ["subscription.halted"],
    ["subscription.cancelled"],
    ["subscription.completed"],
  ])("routes %s to the lifecycle recorder", async (event) => {
    vi.mocked(validateWebhookSignature).mockReturnValue(true);
    const payload = { subscription: { entity: { id: "sub_1" } } };
    const body = { event, payload };

    await verificationHandler(makeRequest(body, JSON.stringify(body)), makeReply());

    expect(paymentService.applySubscriptionStatusEvent).toHaveBeenCalledWith(event, payload);
  });

  // subscription.updated is handled now — see the plan-change test below.
  test.each([["subscription.paused"], ["subscription.resumed"], ["payment.authorized"]])(
    "acknowledges %s without touching the order",
    async (event) => {
      // Subscribed to on the dashboard but deliberately unmodelled — see the comment on
      // SUBSCRIPTION_STATUS_BY_EVENT. They must still 200 or Razorpay redelivers them.
      vi.mocked(validateWebhookSignature).mockReturnValue(true);
      const reply = makeReply();
      const body = { event, payload: { subscription: { entity: { id: "sub_1" } } } };

      await verificationHandler(makeRequest(body, JSON.stringify(body)), reply);

      expect(reply.code).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({ success: true, handled: false });
      expect(paymentService.applySubscriptionStatusEvent).not.toHaveBeenCalled();
    },
  );

  test("routes subscription.updated to the plan-change handler", async () => {
    vi.mocked(validateWebhookSignature).mockReturnValue(true);
    const payload = { subscription: { entity: { id: "sub_1", plan_id: "plan_2" } } };
    const body = { event: "subscription.updated", payload };

    await verificationHandler(makeRequest(body, JSON.stringify(body)), makeReply());

    expect(paymentService.applySubscriptionUpdate).toHaveBeenCalledWith(payload);
  });

  test("routes subscription.charged to the subscription updater", async () => {
    vi.mocked(validateWebhookSignature).mockReturnValue(true);
    const payload = { subscription: { entity: { id: "sub_1" } } };

    const body = { event: "subscription.charged", payload };
    await verificationHandler(makeRequest(body, JSON.stringify(body)), makeReply());

    expect(paymentService.updateSubscription).toHaveBeenCalledWith(payload);
  });
});

describe("getOrgInvoices", () => {
  const axiosGet = vi.spyOn(axios, "get");

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
    axiosGet.mockImplementation(
      (_url: string, config?: { params?: { subscription_id?: string } }) =>
        Promise.resolve({
          data: {
            items:
              config?.params?.subscription_id === "sub_old"
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
    axiosGet.mockImplementation(
      (_url: string, config?: { params?: { subscription_id?: string } }) =>
        config?.params?.subscription_id === "sub_dead"
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

  const PACK = { id: "addon-1", name: "CONVERSATION PACK", planType: "ADDON", features: {} };

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
    // base-plan write, swapping a Max subscriber's tier for a 5,000-conversation pack.
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

describe("buying conversation packs outright", () => {
  const axiosPost = vi.spyOn(axios, "post");
  let service: typeof import("./payment.service.js");
  beforeAll(async () => {
    service = await vi.importActual<typeof import("./payment.service.js")>("./payment.service.js");
  });

  const PACK = {
    id: "addon-1",
    name: "CONVERSATION PACK",
    displayName: "Conversation pack",
    planType: "ADDON",
    monthlyPrice: 1_200,
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

    const result = await service.createConversationAddonOrder("user-1", "org-1", 2);

    expect(axiosPost.mock.calls[0]?.[0]).toBe("https://api.razorpay.com/v1/orders");
    expect(result.gatewayOrderId).toBe("order_rzp");
  });

  test("charges for every pack asked for", async () => {
    onPaidPlan();

    const result = await service.createConversationAddonOrder("user-1", "org-1", 3);

    // Minor units at the gateway, major units back to the caller.
    expect(axiosPost.mock.calls[0]?.[1]).toMatchObject({
      amount: 3 * 1_200 * 100,
      currency: "INR",
    });
    expect(result.amount).toBe(3 * 1_200);
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

    await expect(service.createConversationAddonOrder("user-1", "org-1", 1)).rejects.toThrow(
      /Upgrading/,
    );
    expect(axiosPost).not.toHaveBeenCalled();
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  test("caps one order rather than billing an unbounded amount", async () => {
    onPaidPlan();

    const result = await service.createConversationAddonOrder("user-1", "org-1", 5_000);

    expect(result.quantity).toBe(service.MAX_PACKS_PER_ORDER);
  });

  test("does not leave an unpayable order behind when the gateway fails", async () => {
    onPaidPlan();
    axiosPost.mockRejectedValue(new Error("razorpay down"));

    await expect(service.createConversationAddonOrder("user-1", "org-1", 1)).rejects.toThrow();
    expect(prisma.order.delete).toHaveBeenCalledWith({ where: { id: "order-1" } });
  });
});

describe("crediting packs when the payment lands", () => {
  let service: typeof import("./payment.service.js");
  beforeAll(async () => {
    service = await vi.importActual<typeof import("./payment.service.js")>("./payment.service.js");
  });

  function captured(notes: Record<string, string>) {
    return {
      id: "pay_1",
      amount: 240_000,
      currency: "INR",
      method: "card",
      created_at: Math.floor(Date.now() / 1000),
      notes,
    };
  }

  beforeEach(() => {
    vi.mocked(prisma.payments.create)
      .mockReset()
      .mockResolvedValue({ id: "pay-row" } as never);
    vi.mocked(prisma.order.update)
      .mockReset()
      .mockResolvedValue({} as never);
    vi.mocked(prisma.order.findUnique).mockReset();
    vi.mocked(prisma.subscriptionAddon.findUnique)
      .mockReset()
      .mockResolvedValue(null as never);
    vi.mocked(prisma.subscriptionAddon.create)
      .mockReset()
      .mockResolvedValue({} as never);
  });

  function onAddonOrder() {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      orgId: "org-1",
      RateupPlan: { id: "addon-1", name: "CONVERSATION PACK", planType: "ADDON" },
    } as never);
  }

  test("credits the packs the order bought", async () => {
    onAddonOrder();

    await service.verifyPayment(
      captured({ rateupOrderId: "order-1", addonQuantity: "3" }),
      "payment.captured",
    );

    const call = vi.mocked(prisma.subscriptionAddon.create).mock.calls[0]?.[0] as {
      data: { quantity: number; paymentRef: string; expiresAt: Date };
    };
    expect(call.data.quantity).toBe(3);
    expect(call.data.paymentRef).toBe("pay_1");
  });

  test("dates the pack a month out, so it lapses on its own", async () => {
    onAddonOrder();

    await service.verifyPayment(captured({ rateupOrderId: "order-1" }), "payment.captured");

    const call = vi.mocked(prisma.subscriptionAddon.create).mock.calls[0]?.[0] as {
      data: { expiresAt: Date };
    };
    const days = (call.data.expiresAt.getTime() - Date.now()) / 86_400_000;
    expect(Math.round(days)).toBe(30);
  });

  test("credits a retried webhook only once", async () => {
    // Razorpay retries a delivery it did not get a 200 for. Crediting again would hand
    // the customer a second month of headroom for free.
    onAddonOrder();
    vi.mocked(prisma.subscriptionAddon.findUnique).mockResolvedValue({ id: "existing" } as never);

    await service.verifyPayment(captured({ rateupOrderId: "order-1" }), "payment.captured");

    expect(prisma.subscriptionAddon.create).not.toHaveBeenCalled();
  });

  test("credits nothing for an ordinary plan payment", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      orgId: "org-1",
      RateupPlan: { id: "pro", name: "PRO PLAN", planType: "BASE" },
    } as never);

    await service.verifyPayment(captured({ rateupOrderId: "order-1" }), "payment.captured");

    expect(prisma.subscriptionAddon.create).not.toHaveBeenCalled();
  });

  test("credits nothing when the payment failed", async () => {
    onAddonOrder();

    await service.verifyPayment(captured({ rateupOrderId: "order-1" }), "payment.failed");

    expect(prisma.subscriptionAddon.create).not.toHaveBeenCalled();
  });
});
