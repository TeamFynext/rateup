import { FastifyInstance } from "fastify";
import { waCatalogProductRoutes } from "./products/product.route";
import { checkSession } from "../../../utils/checkSession";
import {
  getWaCatalogByOrgHandler,
  getWaCatalogInfoHandler,
  syncCatalogsHandler,
  updateCatalogHandler,
} from "./catalog.controller";
import { $WC } from "./catalog.schema";

export async function waCatalogRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.register(waCatalogProductRoutes, { prefix: "/products" });
  server.put(
    "/:catalogId",
    {
      schema: {
        params: $WC("catalogIdParams"),
        body: $WC("updateCatalogSchema"),
      },
    },
    updateCatalogHandler,
  );

  server.post(
    "/:businessId",
    {
      schema: {
        params: $WC("businessIdParams"),
      },
    },
    syncCatalogsHandler,
  );

  server.get("/:catalogId", getWaCatalogInfoHandler);
  server.get("/", getWaCatalogByOrgHandler);
}
