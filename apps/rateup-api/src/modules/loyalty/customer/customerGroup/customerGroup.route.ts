import { FastifyInstance } from "fastify";
import { $customerGroupRef } from "./customerGroup.schema.js";
import {
  addNewCustomersfromCSVToGroupHandler,
  getCustomersByContactGroupIdHandler,
} from "./customerGroup.controller.js";
import fastifyMultipart from "@fastify/multipart";

export async function customerGroupRoutes(server: FastifyInstance) {
  server.register(fastifyMultipart, {
    limits: {
      fileSize: 1048576 * 10,
    },
    throwFileSizeLimit: true,
  });
  server.post(
    "/:customerGroupId/contacts/new/importcsv",
    {
      schema: {
        params: $customerGroupRef("byCustomerGroupIdParamsSchema"),
        consumes: ["multipart/form-data"],
      },
    },
    addNewCustomersfromCSVToGroupHandler,
  );
  server.get(
    "/:contactGroupId/contacts",
    {
      schema: {
        params: $customerGroupRef("byCustomerGroupIdParamsSchema"),
        querystring: $customerGroupRef("paginationQuery"),
      },
    },
    getCustomersByContactGroupIdHandler,
  );
}
