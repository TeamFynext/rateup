import { FastifyReply, FastifyRequest } from "fastify";
import {
  getUnsplashImageList,
  InvalidDownloadLocationError,
  triggerDownloadUnsplashImage,
} from "./unsplash.service.js";
import { getUnsplashImageQueryString, triggerDownloadUnsplashBody } from "./unsplash.schema.js";
import { log } from "../../../utils/logger.js";

export async function getUnsplashImageListHandler(
  request: FastifyRequest<{ Querystring: getUnsplashImageQueryString }>,
  reply: FastifyReply,
) {
  try {
    const unsplashData = await getUnsplashImageList(request.query);
    reply.code(200).send(unsplashData);
  } catch (err) {
    log.error({ err }, "Unsplash photo list failed");
    reply.code(502).send({ message: "Could not load images" });
  }
}

export async function triggerDownloadUnsplashImageHandler(
  request: FastifyRequest<{ Body: triggerDownloadUnsplashBody }>,
  reply: FastifyReply,
) {
  try {
    await triggerDownloadUnsplashImage(request.body);
    reply.code(204).send();
  } catch (err) {
    if (err instanceof InvalidDownloadLocationError) {
      return reply.code(400).send({ message: err.message });
    }
    log.error({ err }, "Unsplash download trigger failed");
    reply.code(502).send({ message: "Could not reach Unsplash" });
  }
}
