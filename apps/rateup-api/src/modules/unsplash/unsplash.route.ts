import { FastifyInstance } from "fastify";
import { $Uref } from "./unsplash.schema";
import { checkSession } from "../../utils/checkSession";
import {
  getUnsplashImageListHandler,
  triggerDownloadUnsplashImageHandler,
} from "./unsplash.controller";

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
