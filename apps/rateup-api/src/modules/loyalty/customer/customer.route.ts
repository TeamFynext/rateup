import { FastifyInstance } from "fastify";
import {
  createLCustomerHandler,
  getLoyaltyCustomersHandler,
} from "./customer.controller";
import { $lCustomerRef } from "./customer.schema";

export async function loyaltyCustomerRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: $lCustomerRef("LCustomerSchema"),
      },
    },
    createLCustomerHandler,
  );

  server.get("/", getLoyaltyCustomersHandler);
}
