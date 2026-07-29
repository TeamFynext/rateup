import { beforeEach, describe, expect, test, vi } from "vitest";

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
    order: { update: vi.fn(), findUnique: vi.fn() },
    subscription: { update: vi.fn() },
    rateupPlan: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    usageStats: { update: vi.fn() },
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
    updateSubscriptionForTrial: vi.fn(),
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
}));

vi.mock("supertokens-node/recipe/session/index.js", () => ({
  default: { getSession: vi.fn() },
}));

vi.mock("razorpay/dist/utils/razorpay-utils.js", () => ({
  validateWebhookSignature: vi.fn(),
}));

vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../../utils/auth.js", () => ({ assertRootOrg: vi.fn() }));
vi.mock("../../utils/checkRoleHandler.js", () => ({
  checkRoleHandler: vi.fn((roles) => Object.assign(vi.fn(), { roles })),
}));

import Session from "supertokens-node/recipe/session/index.js";
import * as paymentService from "./payment.service.js";
import * as stripeService from "./stripe/stripe.service.js";
import { assertRootOrg } from "../../utils/auth.js";
import { checkSession } from "../../utils/checkSession.js";
import { updateSubscriptionOrderHandler } from "./payment.controller.js";
import {
  createCheckoutSessionHandler,
  deleteStripeProductsHandler,
  getAllStripeSubscriptionsHandler,
  getSessionStatusHandler,
  updateStripeProductsHandler,
  webHookHandler,
} from "./stripe/stripe.controller.js";
import { paymentRoutes } from "./payment.route.js";
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
    rateupPlanId: ENTERPRISE_PLAN,
    subscriptionId: "sub_x",
  });
  pay.updateSubscriptionForTrial.mockResolvedValue(undefined);
  stripeSvc.createOrder.mockResolvedValue({ id: "order-1" });
  stripeSvc.updateOrder.mockResolvedValue(undefined);
  stripeSvc.getAllStripeSubscriptions.mockResolvedValue([]);
  stripeSvc.deleteStripeProduct.mockResolvedValue({ deleted: true });
  stripeSvc.updateStripeProduct.mockResolvedValue({ id: "prod_x" });
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

  // NOTE: the route is PUT /api/payment/order/:orderId with checkSession only —
  // no role check and no body schema — and updateOrder is
  // prisma.order.update({ where: { id: orderId }, data }) with no org
  // condition (payment.service.ts:768-775).
  test("writes the whole body onto whatever order the path names", async () => {
    await updateSubscriptionOrderHandler(
      req({ status: "COMPLETE", paymentStatus: "SUCCESS", amount: 0 }),
      reply(),
    );

    expect(pay.updateOrder).toHaveBeenCalledWith(VICTIM_ORDER, {
      status: "COMPLETE",
      paymentStatus: "SUCCESS",
      amount: 0,
    });
  });

  // NOTE: this is the payment bypass. Marking any order COMPLETE upgrades the
  // CALLER's organisation to that order's plan, with the plan's full feature
  // set and a fresh expiry — no payment is consulted anywhere on this path.
  test("marking an order complete upgrades the caller's own org to its plan", async () => {
    await updateSubscriptionOrderHandler(req({ status: "COMPLETE" }), reply());

    expect(pay.updateSubscriptionForTrial).toHaveBeenCalledWith(
      ORG,
      ENTERPRISE_PLAN,
      "sub_x",
      USER,
    );
  });

  test("the org upgraded is the caller's, not the order's", async () => {
    pay.updateOrder.mockResolvedValueOnce({
      id: VICTIM_ORDER,
      orgId: "a-different-org",
      rateupPlanId: ENTERPRISE_PLAN,
      subscriptionId: "sub_x",
    });

    await updateSubscriptionOrderHandler(req({ status: "COMPLETE" }), reply());

    expect(pay.updateSubscriptionForTrial.mock.calls[0][0]).toBe(ORG);
  });

  test("nothing checks that the order belongs to the caller", async () => {
    await updateSubscriptionOrderHandler(req({ status: "COMPLETE" }), reply());

    // The only lookup is the update itself.
    expect(pay.updateOrder).toHaveBeenCalledOnce();
  });

  test("any other status writes the order without touching the subscription", async () => {
    await updateSubscriptionOrderHandler(req({ status: "PENDING" }), reply());

    expect(pay.updateOrder).toHaveBeenCalledOnce();
    expect(pay.updateSubscriptionForTrial).not.toHaveBeenCalled();
  });

  test("the status comparison is exact", async () => {
    await updateSubscriptionOrderHandler(req({ status: "complete" }), reply());

    expect(pay.updateSubscriptionForTrial).not.toHaveBeenCalled();
  });

  test("answers 200 with no body on success", async () => {
    const rep = reply();

    await updateSubscriptionOrderHandler(req({ status: "COMPLETE" }), rep);

    expect(answer(rep)).toEqual({ code: 200, body: undefined });
  });

  test("a failure answers a fixed 500", async () => {
    pay.updateOrder.mockRejectedValueOnce(new Error("Record to update not found"));
    const rep = reply();

    await updateSubscriptionOrderHandler(req({ status: "COMPLETE" }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: "Updating order failed" });
  });

  test("the route carries no role check and no schema", async () => {
    const { routes } = await collectPaymentRoutes();

    const order = routes.find((r) => r.url === "/order/:orderId");
    expect(order.opts).toBe(updateSubscriptionOrderHandler);
    expect(order.handler).toBeUndefined();
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

  // NOTE: the Razorpay tree gates every catalogue route on assertRootOrg. The
  // Stripe tree gates only the subscription cancellation, and on role rather
  // than on the platform org.
  test("only the cancellation is gated in the Stripe tree", async () => {
    const { routes } = await collectStripeRoutes();

    const gated = routes.filter((r) => r.opts?.preHandler);
    expect(gated.map((r) => `${r.method} ${r.url}`)).toEqual(["PUT /subscriptions/cancel"]);
    expect((gated[0].opts.preHandler[0] as any).roles).toEqual(["SUPER_ADMIN"]);
  });

  test("no Stripe route carries the root-org check", async () => {
    const { routes } = await collectStripeRoutes();

    for (const r of routes) {
      expect(r.opts?.preHandler ?? []).not.toContain(assertRootOrg);
    }
  });

  // NOTE: the equivalent Razorpay routes do carry it, which is what makes the
  // Stripe side look like an omission rather than a decision.
  test("the Razorpay catalogue routes are gated on the root org", async () => {
    const { routes } = await collectPaymentRoutes();

    const gated = routes.filter((r) => r.opts?.preHandler?.includes(assertRootOrg));
    expect(gated.map((r) => `${r.method} ${r.url}`)).toEqual([
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

  // NOTE: sync-plans is the one Razorpay administrative route without it.
  test("the Razorpay plan sync is not gated", async () => {
    const { routes } = await collectPaymentRoutes();

    const sync = routes.find((r) => r.url === "/sync-plans");
    expect(sync.opts).toBeDefined();
    expect(sync.opts?.preHandler).toBeUndefined();
  });
});

// ===========================================================================
// getSessionStatusHandler
// ===========================================================================

describe("getSessionStatusHandler", () => {
  // NOTE: the session id comes from the query string and is retrieved from
  // Stripe directly — nothing ties it to the caller's org or to an order.
  test("retrieves whatever checkout session the query names", async () => {
    const rep = reply();

    await getSessionStatusHandler({ query: { session_id: "cs_test_victim" } } as never, rep);

    expect(stripeStub.checkout.sessions.retrieve).toHaveBeenCalledWith("cs_test_victim");
    expect(rep.send.mock.calls[0][0]).toEqual({
      status: "complete",
      payment_status: "paid",
      customer_email: "victim@othercompany.test",
    });
  });

  test("the customer's email address is part of the response", async () => {
    const rep = reply();

    await getSessionStatusHandler({ query: { session_id: "cs_test_victim" } } as never, rep);

    expect(rep.send.mock.calls[0][0].customer_email).toContain("@");
  });

  // NOTE: customer_details is dereferenced without a guard, so a session that
  // has none throws out of the handler.
  test("a session with no customer details throws", async () => {
    stripeStub.checkout.sessions.retrieve.mockResolvedValueOnce({
      status: "open",
      payment_status: "unpaid",
      customer_details: null,
    });

    await expect(
      getSessionStatusHandler({ query: { session_id: "cs_test_1" } } as never, reply()),
    ).rejects.toThrow(TypeError);
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

  // NOTE: only updateOrder is inside the try, so a Stripe failure escapes the
  // handler with the Order row already written.
  test("a Stripe failure leaves the order behind and escapes the handler", async () => {
    stripeStub.checkout.sessions.create.mockRejectedValueOnce(new Error("No such price"));

    await expect(createCheckoutSessionHandler({ body } as never, reply())).rejects.toThrow(
      "No such price",
    );
    expect(stripeSvc.createOrder).toHaveBeenCalledOnce();
    expect(stripeSvc.updateOrder).not.toHaveBeenCalled();
  });

  test("carries the local order id into the Stripe metadata", async () => {
    await createCheckoutSessionHandler({ body } as never, reply());

    const arg = stripeStub.checkout.sessions.create.mock.calls[0][0];
    expect(arg.metadata).toEqual({ rateupOrderId: "order-1" });
    expect(arg.subscription_data.metadata).toEqual({ rateupOrderId: "order-1" });
  });

  // NOTE: Stripe's documented ui_mode values are "embedded", "hosted" and
  // "custom" — "embedded_page" is not one of them.
  test("requests an ui_mode Stripe does not document", async () => {
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

  // NOTE: the authenticated Stripe tree registers the same parser keyed on
  // "/api/payment/webhook" — a route that tree does not have.
  test("the authenticated tree's parser keys on a route that does not exist", async () => {
    const { routes, parsers } = await collectStripeRoutes();

    expect(routes.map((r) => r.url)).not.toContain("/webhook");
    const done = vi.fn();
    parsers[0].fn({ url: "/api/payment/webhook" }, '{"a":1}', done);
    expect(done).toHaveBeenCalledWith(null, '{"a":1}');
  });

  test("the public payment tree exposes the Razorpay webhook with no session check", async () => {
    const routes: any[] = [];
    const srv: any = {
      get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
      post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
      addHook: vi.fn(),
    };

    await paymentPublicRoutes(srv);

    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual([
      "GET /rateup-plans",
      "POST /webhooks/verification",
      "POST /mail",
    ]);
    expect(srv.addHook).not.toHaveBeenCalled();
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
