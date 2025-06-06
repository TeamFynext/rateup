import { FastifyInstance } from "fastify";
import {
  createCatalogProductsBatchHandler,
  deleteCatalogProductsHandler,
  getCatalogProductsHandler,
  syncCatalogProductsHandler,
  updateCatalogProductsHandler,
} from "./product.controller";
import { $wCp } from "./product.schema";
import { $WC } from "../catalog.schema";

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
