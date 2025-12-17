import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import {
  createLinktreeRouteOptions,
  deleteLinktreeByIdRouteOptions,
  getLinktreesRouteOptions,
  getLinktreeWithShortIdRouteOptions,
  getLinkTypeDropdownOptionsRouteOptions,
  getPublicLinktreeWithShortIdRouteOptions,
  updateLinktreeWithShortIdRouteOptions,
  updatePageVisitsOrLinkClicksOptions,
} from "./linktree.routeOptions.js";

export async function linkRoutes(server: FastifyInstance) {
  server.addHook("onRoute", (routeOptions) => {
    if (routeOptions.config && routeOptions.config["isPublic"] === true) {
      routeOptions.preHandler = [];
      return;
    } else {
      routeOptions.preHandler = [checkSession];
    }
  });

  server.get("/public/:shortUrlId", getPublicLinktreeWithShortIdRouteOptions);

  server.get("/:shortUrlId", getLinktreeWithShortIdRouteOptions);
  server.get("/", getLinktreesRouteOptions);
  server.post("/", createLinktreeRouteOptions);
  server.put("/", updateLinktreeWithShortIdRouteOptions);
  server.delete("/:id", deleteLinktreeByIdRouteOptions);

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
