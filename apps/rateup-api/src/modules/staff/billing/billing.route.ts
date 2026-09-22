import type { FastifyInstance } from "fastify";
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
}
