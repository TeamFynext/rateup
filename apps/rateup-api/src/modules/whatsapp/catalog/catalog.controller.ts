import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger.js";
import {
  CatalogIdParam,
  CatalogWhatsappSettingSchema,
  UpdateCatalogSchema,
} from "./catalog.schema.js";
import {
  disconnectCatalogFromWaba,
  getConnectedWaCatalog,
  getWaCatalog,
  getWaCatalogsByOrg,
  syncWaCatalogs,
  updateConnectWaCatalog,
  updateWaCatalog,
} from "./catalog.service.js";
import { getWaSettings } from "../settings/wa_settings.service.js";
import { whatsappSettingsIdParamSchema } from "../settings/wa_settings.schema.js";

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
    const { wabaId, ...rest } = request.body;
    if (wabaId) {
      await updateConnectWaCatalog(wabaId, orgId, catalogId);
    }
    if (rest) {
      const catalog = await updateWaCatalog(catalogId, rest);
    }
    reply.code(200).send();
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
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const catalogs = await syncWaCatalogs(orgId);
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
  request: FastifyRequest<{ Params: { whatsappSettingsPhoneId: string } }>,
  reply: FastifyReply,
) {
  try {
    const catalog = await getConnectedWaCatalog(
      request.params.whatsappSettingsPhoneId,
    );
    reply.code(200).send(catalog);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function disconnectCatalogFromWabaHandler(
  request: FastifyRequest<{ Body: CatalogWhatsappSettingSchema }>,
  reply: FastifyReply,
) {
  try {
    const catalog = await disconnectCatalogFromWaba(request.body);
    reply.code(200).send(catalog);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
