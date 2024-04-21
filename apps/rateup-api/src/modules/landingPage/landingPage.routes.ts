import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession";
import {
  createLandingPageRouteOptions,
  deleteLandingPageByIdRouteOptions,
  getLandingPagesRouteOptions,
  getLandingPageWithShortIdRouteOptions,
  getLinkTypeDropdownOptionsRouteOptions,
  getPublicLandingPageWithShortIdRouteOptions,
  updateLandingPageWithShortIdRouteOptions,
  updatePageVisitsOrLinkClicksOptions,
} from "./landingPage.routeOptions";

export async function linkRoutes(server: FastifyInstance) {
  server.addHook("onRoute", (routeOptions) => {
    if (routeOptions.config && routeOptions.config["isPublic"] === true) {
      routeOptions.preHandler = [];
      return;
    } else {
      routeOptions.preHandler = [checkSession];
    }
  });

  server.get(
    "/public/:shortUrlId",
    getPublicLandingPageWithShortIdRouteOptions,
  );

  server.get("/:shortUrlId", getLandingPageWithShortIdRouteOptions);
  server.get("/", getLandingPagesRouteOptions);
  server.post("/", createLandingPageRouteOptions);
  server.put("/", updateLandingPageWithShortIdRouteOptions);
  server.delete("/:id", deleteLandingPageByIdRouteOptions);

  server.get(
    "/linkTypeDropdownOptions/:linkType",
    getLinkTypeDropdownOptionsRouteOptions,
  );

  server.patch(
    "/pageVisitsOrLinkClicks/:shortUrlId",
    updatePageVisitsOrLinkClicksOptions,
  );
}

export default linkRoutes;
