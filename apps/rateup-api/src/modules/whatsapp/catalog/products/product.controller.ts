import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../../utils/logger";
import {
  createCatalogProductsBatch,
  deleteCatalogProducts,
  getCatalogProducts,
  syncCatalogProducts,
} from "./product.service";
import {
  catalogItemBatchSchema,
  CatalogItemQueryFilter,
  catalogItemSchema,
  CatalogProductIdsSchema,
} from "./product.schema";
import { getWaCatalog } from "../catalog.service";

export async function createCatalogProductsBatchHandler(
  request: FastifyRequest<{ Body: catalogItemBatchSchema }>,
  reply: FastifyReply,
) {
  try {
    const { type } = request.body;
    const { orgId } = request.user;
    const catalogInfo = await getCatalogProducts(orgId);
    if (!catalogInfo) {
      return reply.code(404).send("No catalog found");
    }
    const res = await createCatalogProductsBatch(
      orgId,
      type,
      request.body[type],
      catalogInfo,
    );
    reply.code(200).send();
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function syncCatalogProductsHandler(
  request: FastifyRequest<{ Body: CatalogItemQueryFilter }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await syncCatalogProducts(orgId, request.body);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getCatalogProductsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await getCatalogProducts(orgId, request.query);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function deleteCatalogProductsHandler(
  request: FastifyRequest<{ Body: CatalogProductIdsSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    console.log("here----------");
    const res = await deleteCatalogProducts(orgId, request.body.produtIds);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
