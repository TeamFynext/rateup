import { FastifyInstance } from "fastify";
import {
  getAllRateupPaymentPlansHandler,
  sendEmailPlanSelectionDetailsHandler,
  verificationHandler,
} from "./payment.controller.js";
import { orgPlanEmailSchema } from "./payment.schema.js";

export async function paymentPublicRoutes(server: FastifyInstance) {
  server.get("/rateup-plans", getAllRateupPaymentPlansHandler);

  server.post("/webhooks/verification", verificationHandler);

  server.post(
    "/mail",
    {
      schema: {
        body: orgPlanEmailSchema,
      },
    },
    sendEmailPlanSelectionDetailsHandler,
  );
}
