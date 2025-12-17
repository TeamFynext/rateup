import { FastifyReply, FastifyRequest } from "fastify";
import {
  getUnsplashImageList,
  triggerDownloadUnsplashImage,
} from "./unsplash.service.js";
import {
  getUnsplashImageQueryString,
  triggerDownloadUnsplashBody,
} from "./unsplash.schema.js";

export async function getUnsplashImageListHandler(
  request: FastifyRequest<{ Querystring: getUnsplashImageQueryString }>,
  reply: FastifyReply,
) {
  try {
    const unsplashData = await getUnsplashImageList(request.query);
    reply.code(200).send(unsplashData);
  } catch (error) {
    reply.code(500).send(error);
  }
}

export async function triggerDownloadUnsplashImageHandler(
  request: FastifyRequest<{ Body: triggerDownloadUnsplashBody }>,
  reply: FastifyReply,
) {
  try {
    await triggerDownloadUnsplashImage(request.body);
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send(error);
  }
}
