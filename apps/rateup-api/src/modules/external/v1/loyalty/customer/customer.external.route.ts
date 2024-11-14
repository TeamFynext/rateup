import { FastifyInstance } from "fastify";
import {
  createLCustomerHandler,
  getLoyaltyCustomersHandler,
} from "./internal-copy/customer/customer.controller";
import { $lCustomerRef } from "./internal-copy/customer/customer.schema";
import { $extLoyaltyRef } from "../loyalty.external.schema";

export async function externalLoyaltyCustomerRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        tags: ["Loyalty/Customer"],
        description: "Create a new loyalty customer",
        summary: "Create a new customer",
        body: $lCustomerRef("LCustomerSchema"),
      },
    },
    createLCustomerHandler,
  );

  server.get(
    "/",
    {
      schema: {
        tags: ["Loyalty/Customer"],
        description: "Get all loyalty customers",
        summary: "Get all customers",
        response: {
          200: {
            type: "array",
            items: $extLoyaltyRef("lCustomerResponseSchema"),
          },
        },
      },
    },
    getLoyaltyCustomersHandler,
  );
}
