import { FastifyInstance } from "fastify";
import { $extLoyaltyRef } from "../loyalty.external.schema";
import {
  createLCustomerHandler,
  getLoyaltyCustomersHandler,
} from "../../../../loyalty/customer/customer.controller";
import { customerActionHandler } from "./internal-copy/customer/customer.controller";
import { $lCustomerRef } from "../../../../loyalty/customer/customer.schema";

export async function externalLoyaltyCustomerRoutes(server: FastifyInstance) {
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

  server.post(
    "/action",
    {
      schema: {
        tags: ["Loyalty/Customer"],
        description: "Customer Action",
        summary: "Appy action to customer",
        body: $lCustomerRef("amountSchema"),
        querystring: $extLoyaltyRef("customerActionQuerySchema"),
      },
    },
    customerActionHandler,
  );
}
