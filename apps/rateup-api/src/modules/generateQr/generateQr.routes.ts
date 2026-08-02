import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import {
  createGenerateQrRecordRouteOptions,
  deleteGenerateQrRecordWithShortIdRouteOptions,
  getAllGenerateQrRecordsRouteOptions,
  getGenerateQrRecordWithShortIdRouteOptions,
  getPublicGenerateQrRecordWithShortIdRouteOptions,
  incrementGenerateQrNoOfScansRouteOptions,
  updateGenerateQrRecordWithShortIdRouteOptions,
} from "./generateQr.routeOptions.js";

export async function linkRoutes(server: FastifyInstance) {
  server.addHook("onRoute", (routeOptions) => {
    // Both branches used to ASSIGN, discarding whatever the route declared for
    // itself. No route relied on that yet, which is exactly the danger: a role
    // check written into deleteGenerateQrRecordWithShortIdRouteOptions would
    // have been overwritten here and the route would have stayed open to every
    // member, with no error and nothing in the route table to show it — and a
    // public route could not carry the rate limiter 44.2 needs. Appending keeps
    // the hook's guarantee while letting a route add to it.
    // See issues.txt 44.5.
    const declared = Array.isArray(routeOptions.preHandler)
      ? routeOptions.preHandler
      : routeOptions.preHandler
        ? [routeOptions.preHandler]
        : [];

    routeOptions.preHandler =
      routeOptions.config?.["isPublic"] === true ? declared : [checkSession, ...declared];
  });

  // Public Routes
  server.get("/public/:shortUrlId", getPublicGenerateQrRecordWithShortIdRouteOptions);
  server.post("/noOfScans/:shortUrlId", incrementGenerateQrNoOfScansRouteOptions);

  // Private Routes
  server.post("/", createGenerateQrRecordRouteOptions);
  server.get("/:shortUrlId", getGenerateQrRecordWithShortIdRouteOptions);
  server.get("/", getAllGenerateQrRecordsRouteOptions);
  server.put("/", updateGenerateQrRecordWithShortIdRouteOptions);
  server.delete("/:shortUrlId", deleteGenerateQrRecordWithShortIdRouteOptions);
}

export default linkRoutes;
