import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger.js";
import {
  CatalogIdParam,
  CatalogWhatsappSettingSchema,
  UpdateCatalogSchema,
  UpdateCatalogSettingsSchema,
  CreateAddressFlowSchema,
} from "./catalog.schema.js";
import {
  deleteWaCatalog,
  disconnectCatalogFromWaba,
  getConnectedWaCatalog,
  getWaCatalog,
  getWaCatalogsByOrg,
  syncConnectedCatalog,
  syncWaCatalogs,
  updateConnectWaCatalog,
  updateWaCatalog,
} from "./catalog.service.js";
import {
  getCatalogSettings,
  updateCatalogSettings,
  createAddressFlow,
} from "./catalogSettings.service.js";

export async function deleteCatalogHandler(
  request: FastifyRequest<{ Params: CatalogIdParam }>,
  reply: FastifyReply,
) {
  try {
    const { catalogId } = request.params;
    await deleteWaCatalog(catalogId);
    reply.code(200).send();
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

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

export async function syncConnectedCatalogHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const results = await syncConnectedCatalog(orgId);
    const allSynced = results.every((r) => r.synced);
    reply.code(allSynced ? 200 : 207).send(results);
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

// Catalog Settings

export async function getCatalogSettingsHandler(
  request: FastifyRequest<{ Params: CatalogIdParam }>,
  reply: FastifyReply,
) {
  try {
    const { catalogId } = request.params;
    const settings = await getCatalogSettings(catalogId);
    reply.code(200).send(settings);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: String(e) });
  }
}

export async function updateCatalogSettingsHandler(
  request: FastifyRequest<{
    Params: CatalogIdParam;
    Body: UpdateCatalogSettingsSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { catalogId } = request.params;
    const updated = await updateCatalogSettings(catalogId, request.body);
    reply.code(200).send(updated);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: String(e) });
  }
}

export async function createAddressFlowHandler(
  req: FastifyRequest<{
    Params: CatalogIdParam;
    Body: CreateAddressFlowSchema;
  }>,
  res: FastifyReply,
) {
  try {
    const { orgId, userId } = req.user;
    const { catalogId } = req.params;
    const { json, map } = req.body;
    await createAddressFlow(orgId, userId, catalogId, req, json, map);
    res.status(200).send();
  } catch (error) {
    res.status(400).send(error.message);
  }
}
