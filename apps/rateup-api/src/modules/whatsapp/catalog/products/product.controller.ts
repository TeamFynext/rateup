import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../../utils/logger.js";
import {
  createCatalogProductsBatch,
  deleteCatalogProducts,
  getCatalogProducts,
  syncCatalogProducts,
  updateCatalogProducts,
} from "./product.service.js";
import {
  catalogItemBatchSchema,
  CatalogItemQueryFilter,
  catalogItemSchema,
  CatalogProductIdsSchema,
} from "./product.schema.js";
import { CatalogIdParam } from "../catalog.schema.js";
import { getWaCatalog } from "../catalog.service.js";

export async function createCatalogProductsBatchHandler(
  request: FastifyRequest<{
    Body: catalogItemBatchSchema;
    Params: CatalogIdParam;
  }>,
  reply: FastifyReply,
) {
  try {
    const { type } = request.body;
    const { catalogId } = request.params;
    const { orgId } = request.user;
    const catalogInfo = await getWaCatalog(catalogId);
    if (!catalogInfo) {
      return reply.code(404).send("No catalog found");
    }
    const res = await createCatalogProductsBatch(
      orgId,
      type,
      request.body[type],
      catalogId,
    );
    reply.code(200).send();
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function syncCatalogProductsHandler(
  request: FastifyRequest<{
    Body: CatalogItemQueryFilter;
    Params: CatalogIdParam;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { catalogId } = request.params;
    const res = await syncCatalogProducts(orgId, catalogId, request.body);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getCatalogProductsHandler(
  request: FastifyRequest<{ Params: CatalogIdParam }>,
  reply: FastifyReply,
) {
  try {
    const { catalogId } = request.params;
    const res = await getCatalogProducts(catalogId, request.query);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function deleteCatalogProductsHandler(
  request: FastifyRequest<{
    Body: CatalogProductIdsSchema;
    Params: CatalogIdParam;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { catalogId } = request.params;
    const res = await deleteCatalogProducts(
      orgId,
      catalogId,
      request.body.productIds,
    );
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateCatalogProductsHandler(
  request: FastifyRequest<{
    Body: catalogItemBatchSchema;
    Params: CatalogIdParam;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { type } = request.body;
    const { catalogId } = request.params;
    const res = await updateCatalogProducts(
      orgId,
      catalogId,
      request.body[type],
      type,
    );
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
