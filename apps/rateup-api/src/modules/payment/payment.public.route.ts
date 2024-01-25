import { FastifyInstance } from "fastify";
import {
  getAllRateupPaymentPlansHandler,
  verificationHandler,
} from "./payment.controller";

export async function paymentPublicRoutes(server: FastifyInstance) {
  server.get("/rateup-plans", getAllRateupPaymentPlansHandler);

  server.post("/webhooks/verification", verificationHandler);
}
