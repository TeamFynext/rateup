import { FastifyInstance } from "fastify";
import { waCatalogProductRoutes } from "./products/product.route.js";
import { checkSession } from "../../../utils/checkSession.js";
import {
  disconnectCatalogFromWabaHandler,
  getConnectedWaCatalogHandler,
  getWaCatalogByOrgHandler,
  getWaCatalogInfoHandler,
  syncCatalogsHandler,
  updateCatalogHandler,
} from "./catalog.controller.js";
import { waCatalogOrderRoutes } from "./orders/catalogOrder.route.js";
import {
  syncProductSetsHandler,
  getProductSetsByCatalogHandler,
  getProductSetByIdHandler,
} from "./productSet.controller.js";
import {
  catalogIdParams,
  catalogWhatsappSettingSchema,
  productSetIdParamSchema,
  syncProductSetsSchema,
  updateCatalogSchema,
} from "./catalog.schema.js";

export async function waCatalogRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.register(waCatalogProductRoutes, { prefix: "/products" });
  server.register(waCatalogOrderRoutes, { prefix: "/orders" });
  server.put(
    "/:catalogId",
    {
      schema: {
        params: catalogIdParams,
        body: updateCatalogSchema,
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
        body: catalogWhatsappSettingSchema,
      },
    },
    disconnectCatalogFromWabaHandler,
  );

  server.post(
    "/product-sets/sync",
    {
      schema: {
        body: syncProductSetsSchema,
      },
    },
    syncProductSetsHandler,
  );

  server.get(
    "/product-sets/catalog/:catalogId",
    getProductSetsByCatalogHandler,
  );

  server.get(
    "/product-sets/:productSetId",
    {
      schema: {
        params: productSetIdParamSchema,
      },
    },
    getProductSetByIdHandler,
  );
}
