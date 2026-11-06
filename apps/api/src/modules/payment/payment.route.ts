import { FastifyInstance } from "fastify";
import {
  cancelRazorpaySubscriptionHandler,
  changeSubscriptionPlanHandler,
  createAddonOrderHandler,
  getAddonOfferHandler,
  getSubscriptionChangeOptionsHandler,
  createCheckoutSessionHandler,
  createRateUpPlanHandler,
  deletePaymentPlanHandler,
  deleteRateUpPlanHandler,
  getAllOrdersByOrg,
  getAllPaymentOrdersHandler,
  getAllPaymentPlansHandler,
  getAllPaymentSubscriptionHandler,
  getOrgInvoicesHandler,
  syncPaymentPlansHandler,
  updatePaymentPlanHandler,
  updateRateUpPlanHandler,
  updateSubscriptionOrderHandler,
} from "./payment.controller.js";
import { assertRootOrg } from "../../utils/auth.js";
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
  updatePlanSchema,
  changePlanSchema,
  type ChangePlanInput,
  orderIdParamsSchema,
  updateOrderStatusSchema,
  type OrderIdParamsInput,
  type UpdateOrderStatusInput,
  addonKindParamsSchema,
  addonOrderSchema,
  type AddonKindParams,
  type AddonOrderInput,
} from "./payment.schema.js";
import { declareAccess } from "../../authz/registry.js";

export async function paymentRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });

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
      config: { permission: "billing.manage" },
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
      schema: { body: updatePlanSchema },
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
      config: { permission: "billing.manage" },
    },
    cancelRazorpaySubscriptionHandler,
  );

  server.get(
    "/subscriptions/change-options",
    { config: { permission: "billing.read" } },
    getSubscriptionChangeOptionsHandler,
  );

  server.get<{ Params: AddonKindParams }>(
    "/subscriptions/addons/:kind",
    { config: { permission: "billing.read" }, schema: { params: addonKindParamsSchema } },
    getAddonOfferHandler,
  );

  server.post<{ Params: AddonKindParams; Body: AddonOrderInput }>(
    "/subscriptions/addons/:kind",
    {
      config: { permission: "billing.manage" },
      // Same gate as changing the plan: it spends the org's money.
      schema: { params: addonKindParamsSchema, body: addonOrderSchema },
    },
    createAddonOrderHandler,
  );

  // Kept for one release so a billing page loaded before the deploy can still buy.
  server.get<{ Params: Partial<AddonKindParams> }>(
    "/subscriptions/conversation-addon",
    { config: { permission: "billing.read" } },
    getAddonOfferHandler,
  );

  server.post<{ Params: Partial<AddonKindParams>; Body: AddonOrderInput }>(
    "/subscriptions/conversation-addon",
    { config: { permission: "billing.manage" }, schema: { body: addonOrderSchema } },
    createAddonOrderHandler,
  );

  server.put<{ Body: ChangePlanInput }>(
    "/subscriptions/change-plan",
    {
      config: { permission: "billing.manage" },
      // Same gate as cancelling: changing what the org is billed is an owner action.
      schema: { body: changePlanSchema },
    },
    changeSubscriptionPlanHandler,
  );

  server.get("/org/orders", { config: { permission: "billing.read" } }, getAllOrdersByOrg);

  server.get("/org/invoices", { config: { permission: "billing.read" } }, getOrgInvoicesHandler);

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
      config: { permission: "billing.manage" },
      schema: {
        params: orderIdParamsSchema,
        body: updateOrderStatusSchema,
      },
    },
    updateSubscriptionOrderHandler,
  );
}
