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
  paymentPlanDeleteSchema,
  rateupPlanParamSchema,
  updateRateUpPlanSchema,
} from "./payment.schema.js";

export async function paymentRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.post("/sync-plans", syncPaymentPlansHandler);

  server.get(
    "/plans",
    {
      preHandler: [assertRootOrg],
    },
    getAllPaymentPlansHandler,
  );

  server.post(
    "/rateup-plan",
    {
      preHandler: [assertRootOrg],
      schema: {
        body: createRateUpPlanSchema,
      },
    },
    createRateUpPlanHandler,
  );

  server.put(
    "/rateup-plan",
    {
      preHandler: [assertRootOrg],
      schema: {
        body: updateRateUpPlanSchema,
      },
    },
    updateRateUpPlanHandler,
  );
  server.delete(
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

  server.put(
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

  server.delete(
    "/",
    {
      preHandler: [assertRootOrg],
      schema: {
        body: paymentPlanDeleteSchema,
      },
    },
    deletePaymentPlanHandler,
  );

  server.put("/order/:orderId", updateSubscriptionOrderHandler);
}
