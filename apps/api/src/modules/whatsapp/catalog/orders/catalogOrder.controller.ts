import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../../utils/logger.js";
import { CatalogIdParam } from "../catalog.schema.js";
import { getWaCatalogOrders } from "./catalogOrder.service.js";

export async function getWaCatalogOrdersHandler(
  request: FastifyRequest<{
    Params: CatalogIdParam;
    Querystring: { page?: number; limit?: number; storeType?: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { catalogId } = request.params;
    // Zero-based, matching the service's `skip = page * limit` and the dashboard, whose
    // pager holds pageIndex from 0 and renders it as "Page {pageIndex + 1}". The default
    // used to be 1, which the service turned into skip: 50 — so a caller meaning "the
    // first page" was silently shown records 51-100.
    const { page = 0, limit = 50, storeType } = request.query;
    const res = await getWaCatalogOrders(catalogId, request.user.orgId, {
      page,
      limit,
      storeType,
    });
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
