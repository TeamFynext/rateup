import { FastifyInstance } from "fastify";
import { $Uref } from "./unsplash.schema";
import { checkSession } from "../../utils/checkSession";
import { getUnsplashImageListHandler } from "./unsplash.controller";

export async function unsplashRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.get(
    "/photos",
    {
      schema: {
        params: $Uref("getUnsplashImageQueryStringSchema"),
      },
    },
    getUnsplashImageListHandler
  );
}
