import { FastifyInstance } from "fastify";
import { $Uref } from "./unsplash.schema.js";
import { checkSession } from "../../utils/checkSession.js";
import {
  getUnsplashImageListHandler,
  triggerDownloadUnsplashImageHandler,
} from "./unsplash.controller.js";

export async function unsplashRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.get(
    "/photos",
    {
      schema: {
        params: $Uref("getUnsplashImageQueryStringSchema"),
      },
    },
    getUnsplashImageListHandler,
  );
  server.post(
    "/triggerDownload",
    {
      schema: {
        body: $Uref("triggerDownloadUnsplashImageSchema"),
      },
    },
    triggerDownloadUnsplashImageHandler,
  );
}
