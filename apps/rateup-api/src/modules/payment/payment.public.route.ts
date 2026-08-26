import { FastifyInstance } from "fastify";
import fastifyRawBody from "fastify-raw-body";
import {
  getAllRateupPaymentPlansHandler,
  sendEmailPlanSelectionDetailsHandler,
  verificationHandler,
} from "./payment.controller.js";
import { orgPlanEmailSchema } from "./payment.schema.js";

export async function paymentPublicRoutes(server: FastifyInstance) {
  // The Razorpay signature is an HMAC over the bytes Razorpay sent, so the handler needs
  // the raw body — re-serializing the parsed object is not guaranteed to reproduce them.
  await server.register(fastifyRawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true,
  });

  server.get("/rateup-plans", getAllRateupPaymentPlansHandler);

  server.post("/webhooks/verification", { config: { rawBody: true } }, verificationHandler);

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
