import { FastifyInstance } from "fastify/types/instance";

import { $extLCustomerRef } from "./ext.customer.schema";
import {
  getLCustomersByOrgHandler,
  getLCustomerByIdHandler,
  createLCustomerHandler,
  updateLCustomerHandler,
  deleteLCustomerHandler,
} from "../../../../loyalty/internal/customer/customer.controller";

export async function externalLoyaltyCustomerRoutes(server: FastifyInstance) {
  server.get(
    "/",
    {
      schema: {
        description: "Get all customers",
        tags: ["Loyalty/Customer"],
        summary: "Get all customers",
      },
    },
    getLCustomersByOrgHandler,
  );

  server.get(
    "/:customerId",
    {
      schema: {
        description: "Get a customer by id",
        tags: ["Loyalty/Customer"],
        summary: "Get a customer by id",
        params: $extLCustomerRef("bylCustomerIdParamSchema"),
        response: {
          "2xx": $extLCustomerRef("LCustomerSchema"),
        },
      },
    },
    getLCustomerByIdHandler,
  );

  server.post(
    "/",
    {
      schema: {
        description: "Create a customer",
        tags: ["Loyalty/Customer"],
        summary: "Create a customer",
        body: $extLCustomerRef("createLCustomerSchema"),
        response: {
          "2xx": $extLCustomerRef("LCustomerSchema"),
        },
      },
    },
    createLCustomerHandler,
  );

  server.put(
    "/:customerId",
    {
      schema: {
        description: "Update a customer",
        tags: ["Loyalty/Customer"],
        summary: "Update a customer",
        params: $extLCustomerRef("bylCustomerIdParamSchema"),
        body: $extLCustomerRef("updateLCustomerSchema"),
        response: {
          "2xx": $extLCustomerRef("LCustomerSchema"),
        },
      },
    },
    updateLCustomerHandler,
  );

  server.delete(
    "/:customerId",
    {
      schema: {
        description: "Delete a customer",
        tags: ["Loyalty/Customer"],
        summary: "Delete a customer",
        params: $extLCustomerRef("bylCustomerIdParamSchema"),
      },
    },
    deleteLCustomerHandler,
  );
}
