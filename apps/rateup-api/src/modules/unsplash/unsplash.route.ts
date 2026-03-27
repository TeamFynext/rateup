import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import {
  getUnsplashImageListHandler,
  triggerDownloadUnsplashImageHandler,
} from "./unsplash.controller.js";
import {
  getUnsplashImageQueryStringSchema,
  triggerDownloadUnsplashImageSchema,
} from "./unsplash.schema.js";

export async function unsplashRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.get(
    "/photos",
    {
      schema: {
        querystring: getUnsplashImageQueryStringSchema,
      },
    },
    getUnsplashImageListHandler,
  );
  server.post(
    "/triggerDownload",
    {
      schema: {
        body: triggerDownloadUnsplashImageSchema,
      },
    },
    triggerDownloadUnsplashImageHandler,
  );
}
