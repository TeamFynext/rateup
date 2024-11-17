import { FastifyInstance } from "fastify";
import { $lCustomerRef } from "./customer.schema";
import { customerActionHandler } from "./customer.controller";

export async function loyaltyCustomerPublicRoutes(server: FastifyInstance) {
  server.post(
    "/:customerId/:actionId",
    {
      schema: {
        params: $lCustomerRef("actionCustomerIdParamSchema"),
      },
    },
    customerActionHandler,
  );
}
