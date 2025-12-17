import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import {
  createLandingPageRouteOptions,
  deleteLandingPageByIdRouteOptions,
  getLandingPagesRouteOptions,
  getLandingPageWithShortIdRouteOptions,
  getPublicLandingPageWithShortIdRouteOptions,
  updateLandingPageWithShortIdRouteOptions,
  updatePageVisitsWithShortIdRouteOptions,
} from "./landingPage.routeOptions.js";

export async function linkRoutes(server: FastifyInstance) {
  server.addHook("onRoute", (routeOptions) => {
    if (routeOptions.config && routeOptions.config["isPublic"] === true) {
      routeOptions.preHandler = [];
      return;
    } else {
      routeOptions.preHandler = [checkSession];
    }
  });

  // public routes
  server.get(
    "/public/:shortUrlId",
    getPublicLandingPageWithShortIdRouteOptions,
  );
  server.patch(
    "/pageVisits/:shortUrlId",
    updatePageVisitsWithShortIdRouteOptions,
  );

  // private routes
  server.get("/:shortUrlId", getLandingPageWithShortIdRouteOptions);
  server.get("/", getLandingPagesRouteOptions);
  server.post("/", createLandingPageRouteOptions);
  server.put("/", updateLandingPageWithShortIdRouteOptions);
  server.delete("/:id", deleteLandingPageByIdRouteOptions);
}

export default linkRoutes;
