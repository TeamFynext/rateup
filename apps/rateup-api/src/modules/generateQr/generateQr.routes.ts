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
    if (routeOptions.config && routeOptions.config["isPublic"] === true) {
      routeOptions.preHandler = [];
      return;
    } else {
      routeOptions.preHandler = [checkSession];
    }
  });

  // Public Routes
  server.get(
    "/public/:shortUrlId",
    getPublicGenerateQrRecordWithShortIdRouteOptions,
  );
  server.post(
    "/noOfScans/:shortUrlId",
    incrementGenerateQrNoOfScansRouteOptions,
  );

  // Private Routes
  server.post("/", createGenerateQrRecordRouteOptions);
  server.get("/:shortUrlId", getGenerateQrRecordWithShortIdRouteOptions);
  server.get("/", getAllGenerateQrRecordsRouteOptions);
  server.put("/", updateGenerateQrRecordWithShortIdRouteOptions);
  server.delete("/:shortUrlId", deleteGenerateQrRecordWithShortIdRouteOptions);
}

export default linkRoutes;
