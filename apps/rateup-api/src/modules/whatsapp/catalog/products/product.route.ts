import { FastifyInstance } from "fastify";
import {
  createCatalogProductsBatchHandler,
  deleteCatalogProductsHandler,
  getCatalogProductsHandler,
  syncCatalogProductsHandler,
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
}
