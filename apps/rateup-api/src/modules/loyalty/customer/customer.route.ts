import { FastifyInstance } from "fastify";
import {
  createLCustomerHandler,
  customerActionHandler,
  deleteLoyaltyCustomersHandler,
  getLoyaltyCustomersHandler,
} from "./customer.controller";
import { $lCustomerRef } from "./customer.schema";

export async function loyaltyCustomerRoutes(server: FastifyInstance) {
  server.get("/", getLoyaltyCustomersHandler);
  server.delete("/:id", deleteLoyaltyCustomersHandler);
  server.post(
    "/:customerId/:actionId",
    {
      schema: {
        params: $lCustomerRef("actionCustomerIdParamSchema"),
        body: $lCustomerRef("amountSchema"),
      },
    },
    customerActionHandler,
  );
}
