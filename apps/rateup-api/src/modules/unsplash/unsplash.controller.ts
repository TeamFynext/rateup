import { FastifyReply, FastifyRequest } from "fastify";
import { getUnsplashImageList } from "./unsplash.service";
import { getUnsplashImageQueryString } from "./unsplash.schema";

export async function getUnsplashImageListHandler(
  request: FastifyRequest<{ Querystring: getUnsplashImageQueryString }>,
  reply: FastifyReply
) {
  try {
    const unsplashData = await getUnsplashImageList(request.query);
    reply.code(200).send(unsplashData);
  } catch (error) {
    reply.code(500).send(error);
  }
}
