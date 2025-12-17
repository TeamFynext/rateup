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
import { $Pref } from "./payment.schema.js";
import { assertRootOrg } from "../../utils/auth.js";
import { checkSession } from "../../utils/checkSession.js";
import { checkRoleHandler } from "../../utils/checkRoleHandler.js";

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
        body: $Pref("createRateUpPlanSchema"),
      },
    },
    createRateUpPlanHandler,
  );

  server.put(
    "/rateup-plan",
    {
      preHandler: [assertRootOrg],
      schema: {
        body: $Pref("updateRateUpPlanSchema"),
      },
    },
    updateRateUpPlanHandler,
  );
  server.delete(
    "/rateup-plan/:id",
    {
      preHandler: [assertRootOrg],
      schema: {
        params: $Pref("rateupPlanParamSchema"),
      },
    },
    deleteRateUpPlanHandler,
  );
  server.post(
    "/create-checkout-session",
    {
      schema: {
        body: $Pref("createCheckoutRequestSchema"),
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
        body: $Pref("paymentPlanDeleteSchema"),
      },
    },
    deletePaymentPlanHandler,
  );

  server.put("/order/:orderId", updateSubscriptionOrderHandler);
}
