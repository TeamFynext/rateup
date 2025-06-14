import { FastifyInstance } from "fastify";
import { getWaCatalogOrdersHandler } from "./catalogOrder.controller";
import { $WC } from "../catalog.schema";
import { $WCOrder } from "./catalogOrder.schema";

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
