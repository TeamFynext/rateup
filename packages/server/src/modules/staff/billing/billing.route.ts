import type { FastifyInstance } from "fastify";
import { idParamSchema, type IdParam } from "../staff.schema.js";
import {
  createTier,
  deleteRazorpayPlan,
  deleteStripeProduct,
  deleteTier,
  gatewayStatusSchema,
  reasonBodySchema,
  setRazorpayPlanStatus,
  setStripeProductStatus,
  syncRazorpay,
  syncStripe,
  tierCreateSchema,
  tierUpdateSchema,
  updateTier,
  type GatewayStatusInput,
  type ReasonBody,
  type TierCreateInput,
  type TierUpdateInput,
} from "./billing.actions.js";
import {
  listOrders,
  listRateupPlans,
  listRazorpayPlans,
  listRazorpaySubscriptions,
  listStripeProducts,
  listStripeSubscriptions,
  listSubscriptions,
  orderListQuerySchema,
  subscriptionListQuerySchema,
  type OrderListQuery,
  type SubscriptionListQuery,
} from "./billing.service.js";

export async function staffBillingRoutes(server: FastifyInstance) {
  server.get("/billing/plans", async () => ({ data: await listRateupPlans() }));
  server.get("/billing/razorpay/plans", async () => ({ data: await listRazorpayPlans() }));
  server.get("/billing/razorpay/subscriptions", async () => ({
    data: await listRazorpaySubscriptions(),
  }));
  server.get("/billing/stripe/products", async () => ({ data: await listStripeProducts() }));
  server.get("/billing/stripe/subscriptions", async () => ({
    data: await listStripeSubscriptions(),
  }));
  server.get<{ Querystring: OrderListQuery }>(
    "/billing/orders",
    { schema: { querystring: orderListQuerySchema } },
    async (request) => listOrders(request.query),
  );
  server.get<{ Querystring: SubscriptionListQuery }>(
    "/billing/subscriptions",
    { schema: { querystring: subscriptionListQuerySchema } },
    async (request) => listSubscriptions(request.query),
  );

  // The catalog, written. Every one takes a reason; deletions refuse anything still in use.
  const withReason = { schema: { body: reasonBodySchema } };
  const idAndReason = { schema: { params: idParamSchema, body: reasonBodySchema } };
  const idAndStatus = { schema: { params: idParamSchema, body: gatewayStatusSchema } };

  server.post<{ Body: TierCreateInput }>(
    "/billing/plans",
    { schema: { body: tierCreateSchema } },
    async (request) => ({ data: await createTier(request, request.body) }),
  );
  server.put<{ Params: IdParam; Body: TierUpdateInput }>(
    "/billing/plans/:id",
    { schema: { params: idParamSchema, body: tierUpdateSchema } },
    async (request) => ({ data: await updateTier(request, request.params.id, request.body) }),
  );
  server.delete<{ Params: IdParam; Body: ReasonBody }>(
    "/billing/plans/:id",
    idAndReason,
    async (request) => ({ data: await deleteTier(request, request.params.id, request.body) }),
  );

  server.post<{ Body: ReasonBody }>("/billing/razorpay/sync", withReason, async (request) => ({
    data: await syncRazorpay(request, request.body),
  }));
  server.put<{ Params: IdParam; Body: GatewayStatusInput }>(
    "/billing/razorpay/plans/:id/status",
    idAndStatus,
    async (request) => ({
      data: await setRazorpayPlanStatus(request, request.params.id, request.body),
    }),
  );
  server.delete<{ Params: IdParam; Body: ReasonBody }>(
    "/billing/razorpay/plans/:id",
    idAndReason,
    async (request) => ({
      data: await deleteRazorpayPlan(request, request.params.id, request.body),
    }),
  );

  server.post<{ Body: ReasonBody }>("/billing/stripe/sync", withReason, async (request) => ({
    data: await syncStripe(request, request.body),
  }));
  server.put<{ Params: IdParam; Body: GatewayStatusInput }>(
    "/billing/stripe/products/:id/status",
    idAndStatus,
    async (request) => ({
      data: await setStripeProductStatus(request, request.params.id, request.body),
    }),
  );
  server.delete<{ Params: IdParam; Body: ReasonBody }>(
    "/billing/stripe/products/:id",
    idAndReason,
    async (request) => ({
      data: await deleteStripeProduct(request, request.params.id, request.body),
    }),
  );
}
