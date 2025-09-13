import { FastifyInstance } from "fastify";
import { waCatalogProductRoutes } from "./products/product.route";
import { checkSession } from "../../../utils/checkSession";
import {
  disconnectCatalogFromWabaHandler,
  getConnectedWaCatalogHandler,
  getWaCatalogByOrgHandler,
  getWaCatalogInfoHandler,
  syncCatalogsHandler,
  updateCatalogHandler,
} from "./catalog.controller";
import { $WC } from "./catalog.schema";
import { waCatalogOrderRoutes } from "./orders/catalogOrder.route";

export async function waCatalogRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.register(waCatalogProductRoutes, { prefix: "/products" });
  server.register(waCatalogOrderRoutes, { prefix: "/orders" });
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

  server.post("/sync", syncCatalogsHandler);

  server.get("/:catalogId", getWaCatalogInfoHandler);
  server.get("/", getWaCatalogByOrgHandler);
  server.get(
    "/connected/:whatsappSettingsPhoneId",
    getConnectedWaCatalogHandler,
  );
  server.delete(
    "/disconnect",
    {
      schema: {
        body: $WC("catalogWhatsappSettingSchema"),
      },
    },
    disconnectCatalogFromWabaHandler,
  );
}
