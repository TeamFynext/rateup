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
    const { page = 1, limit = 50, storeType } = request.query;
    const res = await getWaCatalogOrders(catalogId, { page, limit, storeType });
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
