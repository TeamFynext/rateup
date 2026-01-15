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
    const catalog = await getWaCatalog(catalogId);
    if (!catalog || catalog.orgId !== orgId) {
      return reply.code(404).send({ error: "Catalog not found" });
    }

    // Get access token from connected WhatsApp settings
    const connectedPhone = catalog.connectedWaPhoneIds[0];
    if (!connectedPhone) {
      return reply
        .code(400)
        .send({ error: "No WhatsApp account connected to this catalog" });
    }

    const waSettings = await prisma.whatsappSettings.findUnique({
      where: { phoneId: connectedPhone.whatsappSettingsPhoneId },
    });

    if (!waSettings) {
      return reply.code(404).send({ error: "WhatsApp settings not found" });
    }

    const { accessToken } = getWaSettingsWithAccessTokenDecrypted(
      waSettings as any,
    );

    // Sync product sets
    const productSets = await syncProductSetsForCatalog(
      catalogId,
      orgId,
      accessToken,
    );

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
    const productSets = await getProductSetsByCatalog(catalogId);
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
    const productSet = await getProductSetById(productSetId);
    reply.code(200).send(productSet);
  } catch (error) {
    log.error(error);
    reply.code(500).send(error);
  }
}
