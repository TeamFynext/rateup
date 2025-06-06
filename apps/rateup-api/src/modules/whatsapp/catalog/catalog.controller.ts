import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger";
import {
  BusinessIdParams,
  CatalogIdParam,
  UpdateCatalogSchema,
} from "./catalog.schema";
import {
  getConnectedWaCatalog,
  getWaCatalog,
  getWaCatalogsByOrg,
  syncWaCatalogs,
  updateWaCatalog,
} from "./catalog.service";
import { getWaSettings } from "../settings/wa_settings.service";

export async function updateCatalogHandler(
  request: FastifyRequest<{
    Params: CatalogIdParam;
    Body: UpdateCatalogSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { catalogId } = request.params;
    const waSettings = await getWaSettings(orgId);
    if (!waSettings) {
      return reply.code(400).send("Connect whatsapp in settings");
    }
    const { isWhatsappConnected } = request.body;
    if (isWhatsappConnected) {
      const connectedCatalog = await getConnectedWaCatalog(orgId);
      if (connectedCatalog && connectedCatalog.catalogId !== catalogId) {
        return reply
          .code(400)
          .send(
            "Another catalog connected to whatsapp. Disabled other and reenable it",
          );
      }
    }
    const catalog = await updateWaCatalog(catalogId, request.body);
    reply.code(200).send(catalog);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getWaCatalogInfoHandler(
  request: FastifyRequest<{ Params: CatalogIdParam }>,
  reply: FastifyReply,
) {
  try {
    const { catalogId } = request.params;
    const catalog = await getWaCatalog(catalogId);
    reply.code(200).send(catalog);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function syncCatalogsHandler(
  request: FastifyRequest<{ Params: BusinessIdParams }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { businessId } = request.params;
    const waSettings = await getWaSettings(orgId);
    if (!waSettings) {
      return reply.code(400).send("Connect whatsapp in settings");
    }
    const catalogs = await syncWaCatalogs(orgId, waSettings, businessId);
    reply.code(200).send(catalogs);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getWaCatalogByOrgHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const catalogs = await getWaCatalogsByOrg(orgId);
    reply.code(200).send(catalogs);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getConnectedWaCatalogHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const catalog = await getConnectedWaCatalog(request.user.orgId);
    reply.code(200).send(catalog);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
