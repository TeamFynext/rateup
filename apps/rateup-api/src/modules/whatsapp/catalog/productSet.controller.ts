import { FastifyReply, FastifyRequest } from "fastify";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import {
  syncProductSetsForCatalog,
  getProductSetsByCatalog,
  getProductSetById,
} from "./productSet.service.js";
import { getWaCatalog } from "./catalog.service.js";
import { getWaSettingsWithAccessTokenDecrypted } from "../settings/wa_settings.service.js";
import { ProductSetIdParam, SyncProductSetsSchema } from "./catalog.schema.js";

export async function syncProductSetsHandler(
  request: FastifyRequest<{ Body: SyncProductSetsSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { catalogId } = request.body;

    // Get catalog to find connected WhatsApp settings
    const catalog = await getWaCatalog(catalogId, orgId);
    if (!catalog || catalog.orgId !== orgId) {
      return reply.code(404).send({ error: "Catalog not found" });
    }

    // Get access token from connected WhatsApp settings. Any connected number will do:
    // the Meta access token is per-WABA, not per-number, so a catalog attached to
    // several numbers resolves to the same token whichever one is picked.
    const connectedPhone = catalog.connectedWaPhoneIds[0];
    if (!connectedPhone) {
      return reply.code(400).send({ error: "No WhatsApp account connected to this catalog" });
    }

    const waSettings = await prisma.whatsappSettings.findUnique({
      where: { phoneId: connectedPhone.whatsappSettingsPhoneId },
    });

    if (!waSettings) {
      return reply.code(404).send({ error: "WhatsApp settings not found" });
    }

    const { accessToken } = getWaSettingsWithAccessTokenDecrypted(waSettings);

    // Sync product sets
    const productSets = await syncProductSetsForCatalog(catalogId, orgId, accessToken);

    reply.code(200).send(productSets);
  } catch (error) {
    log.error(error);
    reply.code(500).send(error);
  }
}

export async function getProductSetsByCatalogHandler(
  request: FastifyRequest<{ Params: { catalogId: string } }>,
  reply: FastifyReply,
) {
  try {
    const { catalogId } = request.params;
    const productSets = await getProductSetsByCatalog(catalogId, request.user.orgId);
    reply.code(200).send(productSets);
  } catch (error) {
    log.error(error);
    reply.code(500).send(error);
  }
}

export async function getProductSetByIdHandler(
  request: FastifyRequest<{ Params: ProductSetIdParam }>,
  reply: FastifyReply,
) {
  try {
    const { productSetId } = request.params;
    const productSet = await getProductSetById(productSetId, request.user.orgId);
    // 404 rather than 200-with-null, so a set that does not exist and one belonging to
    // another org are indistinguishable, and the client can tell "no such set" from
    // "a set with no content".
    if (!productSet) {
      return reply.code(404).send({ error: "Product set not found" });
    }
    reply.code(200).send(productSet);
  } catch (error) {
    log.error(error);
    reply.code(500).send(error);
  }
}
