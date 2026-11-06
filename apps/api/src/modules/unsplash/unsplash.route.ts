import { FastifyInstance } from "fastify";
import {
  getUnsplashImageListHandler,
  triggerDownloadUnsplashImageHandler,
} from "./unsplash.controller.js";
import {
  getUnsplashImageQueryStringSchema,
  triggerDownloadUnsplashImageSchema,
} from "./unsplash.schema.js";
import { declareAccess } from "../../authz/registry.js";

export async function unsplashRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });
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
