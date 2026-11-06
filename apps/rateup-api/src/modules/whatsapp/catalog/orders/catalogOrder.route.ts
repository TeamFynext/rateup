import { FastifyInstance } from "fastify";
import { getWaCatalogOrdersHandler } from "./catalogOrder.controller.js";
import { orderPaginateSchema } from "./catalogOrder.schema.js";
import { catalogIdParams } from "../catalog.schema.js";

export async function waCatalogOrderRoutes(server: FastifyInstance) {
  server.get(
    "/:catalogId",
    {
      schema: {
        params: catalogIdParams,
        querystring: orderPaginateSchema,
      },
    },
    getWaCatalogOrdersHandler,
  );
}
