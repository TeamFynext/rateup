import { FastifyInstance } from "fastify";
import {
  createCatalogProductsBatchHandler,
  createShopifyProductHandler,
  deleteCatalogProductsHandler,
  getCatalogProductsHandler,
  getShopifyAvailableProductsHandler,
  importShopifyProductsHandler,
  syncCatalogProductsHandler,
  syncShopifyProductsFromShopifyHandler,
  updateCatalogProductsHandler,
} from "./product.controller.js";
import { $wCp } from "./product.schema.js";
import { $WC } from "../catalog.schema.js";

export async function waCatalogProductRoutes(server: FastifyInstance) {
  server.post(
    "/:catalogId",
    {
      schema: {
        params: $WC("catalogIdParams"),
        body: $wCp("catalogItemBatch"),
      },
    },
    createCatalogProductsBatchHandler,
  );

  server.post(
    "/sync/:catalogId",
    {
      schema: {
        params: $WC("catalogIdParams"),
        body: $wCp("catalogItemQueryFilter"),
      },
    },
    syncCatalogProductsHandler,
  );

  server.get(
    "/:catalogId",
    { schema: { params: $WC("catalogIdParams") } },
    getCatalogProductsHandler,
  );

  server.delete(
    "/:catalogId",
    {
      schema: {
        params: $WC("catalogIdParams"),
        body: $wCp("catalogProductIdsSchema"),
      },
    },
    deleteCatalogProductsHandler,
  );

  server.put(
    "/:catalogId",
    {
      schema: {
        params: $WC("catalogIdParams"),
        body: $wCp("catalogItemBatch"),
      },
    },
    updateCatalogProductsHandler,
  );

  server.get(
    "/shopify-available/:catalogId",
    { schema: { params: $WC("catalogIdParams") } },
    getShopifyAvailableProductsHandler,
  );

  server.post(
    "/import-shopify/:catalogId",
    { schema: { params: $WC("catalogIdParams") } },
    importShopifyProductsHandler,
  );

  server.post(
    "/shopify-create/:catalogId",
    { schema: { params: $WC("catalogIdParams") } },
    createShopifyProductHandler,
  );

  server.post(
    "/shopify-sync/:catalogId",
    { schema: { params: $WC("catalogIdParams") } },
    syncShopifyProductsFromShopifyHandler,
  );
}
