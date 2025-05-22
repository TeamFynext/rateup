import { FastifyInstance } from "fastify";
import { waCatalogProductRoutes } from "./products/product.route";
import { checkSession } from "../../../utils/checkSession";
import {
  connectCatalogHandler,
  getWaCatalogInfoHandler,
} from "./catalog.controller";
import { $WC } from "./catalog.schema";

export async function waCatalogRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.register(waCatalogProductRoutes, { prefix: "/products" });
  server.post(
    "/:catalogId",
    {
      schema: {
        params: $WC("catalogIdParams"),
      },
    },
    connectCatalogHandler,
  );

  server.get("/", getWaCatalogInfoHandler);
}
