import { FastifyInstance } from "fastify";
import {
  cancelRazorpaySubscriptionHandler,
  createCheckoutSessionHandler,
  createRateUpPlanHandler,
  deletePaymentPlanHandler,
  deleteRateUpPlanHandler,
  getAllOrdersByOrg,
  getAllPaymentOrdersHandler,
  getAllPaymentPlansHandler,
  getAllPaymentSubscriptionHandler,
  syncPaymentPlansHandler,
  updatePaymentPlanHandler,
  updateRateUpPlanHandler,
  updateSubscriptionOrderHandler,
} from "./payment.controller.js";
import { assertRootOrg } from "../../utils/auth.js";
import { checkSession } from "../../utils/checkSession.js";
import { checkRoleHandler } from "../../utils/checkRoleHandler.js";
import {
  createCheckoutRequestSchema,
  createRateUpPlanSchema,
  createRateUpPlanInput,
  paymentPlanDeleteSchema,
  paymentPlanDeleteInput,
  rateupPlanParamSchema,
  rateupPlanParamInput,
  updateRateUpPlanSchema,
  updateRateUpPlanInput,
  UpdatePlanInput,
  orderIdParamsSchema,
  updateOrderStatusSchema,
  type OrderIdParamsInput,
  type UpdateOrderStatusInput,
} from "./payment.schema.js";

export async function paymentRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.post("/sync-plans", { preHandler: [assertRootOrg] }, syncPaymentPlansHandler);

  server.get(
    "/plans",
    {
      preHandler: [assertRootOrg],
    },
    getAllPaymentPlansHandler,
  );

  server.post<{ Body: createRateUpPlanInput }>(
    "/rateup-plan",
    {
      preHandler: [assertRootOrg],
      schema: {
        body: createRateUpPlanSchema,
      },
    },
    createRateUpPlanHandler,
  );

  server.put<{ Body: updateRateUpPlanInput }>(
    "/rateup-plan",
    {
      preHandler: [assertRootOrg],
      schema: {
        body: updateRateUpPlanSchema,
      },
    },
    updateRateUpPlanHandler,
  );
  server.delete<{ Params: rateupPlanParamInput }>(
    "/rateup-plan/:id",
    {
      preHandler: [assertRootOrg],
      schema: {
        params: rateupPlanParamSchema,
      },
    },
    deleteRateUpPlanHandler,
  );
  server.post(
    "/create-checkout-session",
    {
      schema: {
        body: createCheckoutRequestSchema,
      },
    },
    createCheckoutSessionHandler,
  );

  server.put<{ Body: UpdatePlanInput }>(
    "/updateplans",
    {
      preHandler: [assertRootOrg],
    },
    updatePaymentPlanHandler,
  );

  server.get(
    "/subscriptions",
    {
      preHandler: [assertRootOrg],
    },
    getAllPaymentSubscriptionHandler,
  );

  server.put(
    "/subscriptions/cancel",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN"])],
    },
    cancelRazorpaySubscriptionHandler,
  );

  server.get("/org/orders", getAllOrdersByOrg);

  server.get(
    "/orders/all",
    {
      preHandler: [assertRootOrg],
    },
    getAllPaymentOrdersHandler,
  );

  server.delete<{ Body: paymentPlanDeleteInput }>(
    "/",
    {
      preHandler: [assertRootOrg],
      schema: {
        body: paymentPlanDeleteSchema,
      },
    },
    deletePaymentPlanHandler,
  );

  server.put<{ Params: OrderIdParamsInput; Body: UpdateOrderStatusInput }>(
    "/order/:orderId",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        params: orderIdParamsSchema,
        body: updateOrderStatusSchema,
      },
    },
    updateSubscriptionOrderHandler,
  );
}
