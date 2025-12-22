import { FastifyInstance } from "fastify";
import { getWaCatalogOrdersHandler } from "./catalogOrder.controller.js";
import { $WC } from "../catalog.schema.js";
import { $WCOrder } from "./catalogOrder.schema.js";

export async function waCatalogOrderRoutes(server: FastifyInstance) {
  server.get(
    "/:catalogId",
    {
      schema: {
        params: $WC("catalogIdParams"),
        querystring: $WCOrder("orderPaginateSchema"),
      },
    },
    getWaCatalogOrdersHandler,
  );
}
