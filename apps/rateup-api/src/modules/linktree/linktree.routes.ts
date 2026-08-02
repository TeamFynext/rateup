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
    // Both branches used to ASSIGN, discarding whatever the route declared for
    // itself. No route relied on that yet, which is exactly the danger: a role
    // check written into deleteLinktreeByIdRouteOptions would have been
    // overwritten here and the route would have stayed open to every member,
    // with no error and nothing in the route table to show it — and a public
    // route could not carry the rate limiter 45.3 needs.
    // See issues.txt 45.7.
    const declared = Array.isArray(routeOptions.preHandler)
      ? routeOptions.preHandler
      : routeOptions.preHandler
        ? [routeOptions.preHandler]
        : [];

    routeOptions.preHandler =
      routeOptions.config?.["isPublic"] === true ? declared : [checkSession, ...declared];
  });

  server.get("/public/:shortUrlId", getPublicLinktreeWithShortIdRouteOptions);

  server.get("/:shortUrlId", getLinktreeWithShortIdRouteOptions);
  server.get("/", getLinktreesRouteOptions);
  server.post("/", createLinktreeRouteOptions);
  server.put("/", updateLinktreeWithShortIdRouteOptions);
  server.delete("/:id", deleteLinktreeByIdRouteOptions);

  server.get("/linkTypeDropdownOptions/:linkType", getLinkTypeDropdownOptionsRouteOptions);

  server.patch("/pageVisitsOrLinkClicks/:shortUrlId", updatePageVisitsOrLinkClicksOptions);
}

export default linkRoutes;
