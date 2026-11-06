import { FastifyInstance } from "fastify";
import {
  createCatalogProductsBatchHandler,
  createShopifyProductHandler,
  deleteCatalogProductsHandler,
  getCatalogProductsHandler,
  getShopifyAvailableProductsHandler,
  getWooAvailableProductsHandler,
  importShopifyProductsHandler,
  importWooProductsHandler,
  syncCatalogProductsHandler,
  syncShopifyProductsFromShopifyHandler,
  updateCatalogProductsHandler,
} from "./product.controller.js";
import {
  catalogItemBatch,
  catalogItemQueryFilter,
  catalogProductIdsSchema,
} from "./product.schema.js";
import { catalogIdParams } from "../catalog.schema.js";

export async function waCatalogProductRoutes(server: FastifyInstance) {
  server.post(
    "/:catalogId",
    {
      schema: {
        params: catalogIdParams,
        body: catalogItemBatch,
      },
    },
    createCatalogProductsBatchHandler,
  );

  server.post(
    "/sync/:catalogId",
    {
      schema: {
        params: catalogIdParams,
        body: catalogItemQueryFilter,
      },
    },
    syncCatalogProductsHandler,
  );

  server.get("/:catalogId", { schema: { params: catalogIdParams } }, getCatalogProductsHandler);

  server.delete(
    "/:catalogId",
    {
      schema: {
        params: catalogIdParams,
        body: catalogProductIdsSchema,
      },
    },
    deleteCatalogProductsHandler,
  );

  server.put(
    "/:catalogId",
    {
      schema: {
        params: catalogIdParams,
        body: catalogItemBatch,
      },
    },
    updateCatalogProductsHandler,
  );

  server.get(
    "/shopify-available/:catalogId",
    { schema: { params: catalogIdParams } },
    getShopifyAvailableProductsHandler,
  );

  server.post(
    "/import-shopify/:catalogId",
    { schema: { params: catalogIdParams } },
    importShopifyProductsHandler,
  );

  server.post(
    "/shopify-create/:catalogId",
    { schema: { params: catalogIdParams } },
    createShopifyProductHandler,
  );

  server.get(
    "/woocommerce-available/:catalogId",
    { schema: { params: catalogIdParams } },
    getWooAvailableProductsHandler,
  );

  server.post(
    "/import-woocommerce/:catalogId",
    { schema: { params: catalogIdParams } },
    importWooProductsHandler,
  );

  server.post(
    "/shopify-sync/:catalogId",
    { schema: { params: catalogIdParams } },
    syncShopifyProductsFromShopifyHandler,
  );
}
