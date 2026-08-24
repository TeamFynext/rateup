import { FastifyInstance } from "fastify";
import { waCatalogProductRoutes } from "./products/product.route.js";
import { checkSession } from "../../../utils/checkSession.js";
import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";
import {
  deleteCatalogHandler,
  disconnectCatalogFromWabaHandler,
  getConnectedWaCatalogHandler,
  getWaCatalogByOrgHandler,
  getWaCatalogInfoHandler,
  syncCatalogsHandler,
  syncConnectedCatalogHandler,
  updateCatalogHandler,
  getCatalogSettingsHandler,
  updateCatalogSettingsHandler,
  createAddressFlowHandler,
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
  updateCatalogSettingsSchema,
  createAddressFlowSchema,
} from "./catalog.schema.js";

export async function waCatalogRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  // Catalog + Shopify sync is a Starter-and-above capability. This route tree was
  // previously ungated at the subscription level.
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.WhatsappCatalog]),
  );
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
  server.post("/sync-connected", syncConnectedCatalogHandler);

  server.get("/", getWaCatalogByOrgHandler);
  server.get("/connected/:whatsappSettingsPhoneId", getConnectedWaCatalogHandler);
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

  server.get("/product-sets/catalog/:catalogId", getProductSetsByCatalogHandler);

  server.get(
    "/product-sets/:productSetId",
    {
      schema: {
        params: productSetIdParamSchema,
      },
    },
    getProductSetByIdHandler,
  );

  // Catalog settings
  server.get(
    "/:catalogId/settings",
    { schema: { params: catalogIdParams } },
    getCatalogSettingsHandler,
  );

  server.put(
    "/:catalogId/settings",
    {
      schema: {
        params: catalogIdParams,
        body: updateCatalogSettingsSchema,
      },
    },
    updateCatalogSettingsHandler,
  );

  server.post(
    "/:catalogId/create-address-flow",
    { schema: { params: catalogIdParams, body: createAddressFlowSchema } },
    createAddressFlowHandler,
  );

  // Keep /:catalogId last so it doesn't swallow /settings and /create-address-flow
  server.get("/:catalogId", getWaCatalogInfoHandler);
  server.delete("/:catalogId", { schema: { params: catalogIdParams } }, deleteCatalogHandler);
}
