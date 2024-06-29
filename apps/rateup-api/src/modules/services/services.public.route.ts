//THIS is for CRON JOB services
//Github work flow triggers

import { FastifyInstance } from "fastify";
import { testServiceRoute, updateSurveyPublish } from "./services.controller";

export async function servicePublicRoutes(server: FastifyInstance) {
  server.get("/", testServiceRoute);

  server.get("/surveyJob", updateSurveyPublish);
}
