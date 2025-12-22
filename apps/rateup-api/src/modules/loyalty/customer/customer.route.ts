import { FastifyInstance } from "fastify";
import {
  createLCustomerHandler,
  customerActionHandler,
  deleteLoyaltyCustomersHandler,
  getLCustomerByIdHanlder,
  getLoyaltyCustomersHandler,
  importCSVContactsHandler,
} from "./customer.controller.js";
import { $lCustomerRef } from "./customer.schema.js";
import fastifyMultipart from "@fastify/multipart";
import { $contactRef } from "../../contact/contact.schema.js";

export async function loyaltyCustomerRoutes(server: FastifyInstance) {
  server.register(fastifyMultipart, {
    limits: {
      fileSize: 1048576 * 10,
    },
    throwFileSizeLimit: true,
  });
  server.get(
    "/",
    {
      schema: {
        params: $contactRef("paginationQuery"),
      },
    },
    getLoyaltyCustomersHandler,
  );
  server.delete("/:id", deleteLoyaltyCustomersHandler);
  server.post(
    "/:phone/:actionId",
    {
      schema: {
        params: $lCustomerRef("actionCustomerIdParamSchema"),
        body: $lCustomerRef("amountSchema"),
      },
    },
    customerActionHandler,
  );
  server.post(
    "/importcsv",
    {
      schema: {
        consumes: ["multipart/form-data"],
      },
    },
    importCSVContactsHandler,
  );

  server.get(
    "/:customerId",
    {
      schema: {
        params: $lCustomerRef("byCustomerIdSchema"),
      },
    },
    getLCustomerByIdHanlder,
  );
}
