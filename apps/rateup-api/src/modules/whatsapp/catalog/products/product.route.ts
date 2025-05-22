import { FastifyInstance } from "fastify";
import {
  createCatalogProductsBatchHandler,
  deleteCatalogProductsHandler,
  getCatalogProductsHandler,
  syncCatalogProductsHandler,
} from "./product.controller";
import { $wCp } from "./product.schema";

export async function waCatalogProductRoutes(server: FastifyInstance) {
  server.post(
    "/",
    { schema: { body: $wCp("catalogItemBatch") } },
    createCatalogProductsBatchHandler,
  );

  server.post(
    "/sync",
    {
      schema: {
        body: $wCp("catalogItemQueryFilter"),
      },
    },
    syncCatalogProductsHandler,
  );

  server.get("/", getCatalogProductsHandler);

  server.delete(
    "/",
    {
      schema: {
        body: $wCp("catalogProductIdsSchema"),
      },
    },
    deleteCatalogProductsHandler,
  );
}
