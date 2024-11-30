import { FastifyInstance } from "fastify";
import { $lCustomerRef } from "./customer.schema";
import {
  createLCustomerHandler,
  customerActionHandler,
} from "./customer.controller";

export async function loyaltyCustomerPublicRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: $lCustomerRef("LCustomerSchema"),
      },
    },
    createLCustomerHandler,
  );

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
