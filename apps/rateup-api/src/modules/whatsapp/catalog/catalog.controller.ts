import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger";
import { CatalogIdParam } from "./catalog.schema";
import { connectWaCatalog, getWaCatalog } from "./catalog.service";
import { getWaSettings } from "../settings/wa_settings.service";
import { callWhatsappApi } from "../wa_axios";
import { es } from "@faker-js/faker";

export async function connectCatalogHandler(
  request: FastifyRequest<{ Params: CatalogIdParam }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { catalogId } = request.params;
    const { accessToken } = await getWaSettings(orgId);
    if (!accessToken) {
      return reply.code(400).send("Connect whatsapp in settings");
    }
    const res = await callWhatsappApi(
      `/${catalogId}?fields=vertical&access_token=${accessToken}`,
      "GET",
    );
    if (!res.data || !res.data.vertical) {
      return reply.code(400).send("Not able to access catalog");
    }
    const catalog = await connectWaCatalog(catalogId, orgId, res.data.vertical);
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
    const { orgId } = request.user;
    const catalog = await getWaCatalog(orgId);
    reply.code(200).send(catalog);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
