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
  deleteOrder: vi.fn(),
  findOrderByCheckoutRef: vi.fn(),
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
  pay.updateSubscriptionForTrial.mockResolvedValue(undefined);
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

  // The route was PUT /api/payment/order/:orderId with checkSession only — no
  // role check and no body schema — and updateOrder was
  // `prisma.order.update({ where: { id: orderId }, data })` with no org
  // condition, `data` being the request body typed Partial<Order>. So every
  // column of any organisation's order was writable by anyone with a session.
  test("writes only the status, and only within the caller's org", async () => {
    await updateSubscriptionOrderHandler(
      req({ status: "COMPLETE", paymentStatus: "SUCCESS", amount: 0 }),
      reply(),
    );

    expect(pay.updateOrder).toHaveBeenCalledWith(VICTIM_ORDER, "COMPLETE", ORG);
  });

  // This was the payment bypass: marking ANY order COMPLETE upgraded the
  // CALLER's organisation to that order's plan, with the plan's full feature set
  // and a fresh expiry, and no payment was consulted anywhere on the path. The
  // subscription is now granted from the order's own paymentStatus — which only
  // the signature-verified webhooks set.
  test("a paid order still starts its subscription", async () => {
    await updateSubscriptionOrderHandler(req({ status: "COMPLETE" }), reply());

    expect(pay.updateSubscriptionForTrial).toHaveBeenCalledWith(
      ORG,
      ENTERPRISE_PLAN,
      "sub_x",
      USER,
    );
  });

  test("an unpaid order is refused rather than upgraded", async () => {
    pay.updateOrder.mockResolvedValueOnce({
      id: VICTIM_ORDER,
      orgId: ORG,
      paymentStatus: "PENDING",
      rateupPlanId: ENTERPRISE_PLAN,
      subscriptionId: "sub_x",
    });
    const rep = reply();

    await updateSubscriptionOrderHandler(req({ status: "COMPLETE" }), rep);

    expect(pay.updateSubscriptionForTrial).not.toHaveBeenCalled();
    expect(answer(rep).code).toBe(409);
  });

  // The org upgraded used to be the SESSION's, whatever org the order belonged
  // to. It is the order's now — and the scoped update means they are the same.
  test("the org upgraded is the order's", async () => {
    pay.updateOrder.mockResolvedValueOnce({
      id: VICTIM_ORDER,
      orgId: "the-orders-own-org",
      paymentStatus: "SUCCESS",
      rateupPlanId: ENTERPRISE_PLAN,
      subscriptionId: "sub_x",
    });

    await updateSubscriptionOrderHandler(req({ status: "COMPLETE" }), reply());

    expect(pay.updateSubscriptionForTrial.mock.calls[0][0]).toBe("the-orders-own-org");
  });

  test("an order outside the caller's org answers 404", async () => {
    pay.updateOrder.mockRejectedValueOnce(
      Object.assign(new Error("Record to update not found."), { code: "P2025" }),
    );
    const rep = reply();

    await updateSubscriptionOrderHandler(req({ status: "COMPLETE" }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { message: "Order not found" } });
    expect(pay.updateSubscriptionForTrial).not.toHaveBeenCalled();
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
    pay.updateOrder.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await updateSubscriptionOrderHandler(req({ status: "COMPLETE" }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Updating order failed" } });
  });

  // Registered as `server.put("/order/:orderId", handler)` — two arguments, so
  // no role check and no body schema, on the one route in either payment tree
  // that changes what an organisation is entitled to.
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

  // The Razorpay tree gates every catalogue route on assertRootOrg; the Stripe
  // tree gated only the subscription cancellation, and on role rather than on the
  // platform org — so any authenticated user of any organisation could delete or
  // rename products in the PLATFORM's Stripe account, and read every
  // subscription on it.
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

  // sync-plans was the one Razorpay administrative route without it — a
  // platform-wide catalogue resync any authenticated user could trigger, hitting
  // Razorpay's API on every call.
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

  // The session id came from the query string and was retrieved from Stripe
  // directly, with nothing tying it to the caller's org — so handing it another
  // buyer's session id returned that person's email address and whether they
  // paid. Session ids are not secret: the module's own return_url puts each one
  // in the buyer's browser history and in anything that logs query strings.
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

  // Only updateOrder used to be inside a try, so a Stripe failure escaped the
  // handler with the Order row already written — carrying a rateupPlanId and no
  // session, which is exactly the artefactfed on, and it could
  // be produced deliberately by sending a price id that does not exist.
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

  // CORRECTION to: the entry read "embedded_page" against
  // Stripe's public docs ("embedded", "hosted", "custom") and hedged both ways.
  // The installed SDK settles it — Stripe.Checkout.SessionCreateParams.UiMode is
  // 'elements' | 'embedded_page' | 'form' | 'hosted_page' for this API version —
  // so the literal is valid and is left as it was.
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

  // The authenticated Stripe tree used to register a copy of the same parser
  // keyed on "/api/payment/webhook" — a route that tree does not have — so the
  // branch was unreachable and every request to the tree took the else path,
  // hand-parsing the body instead of letting Fastify do it. It also read as
  // though raw-body preservation were configured for a webhook in this tree.
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
