import { FastifyInstance } from "fastify";

import {
  activateHandler,
  applyStepHandler,
  getPresetsHandler,
  getStateHandler,
} from "./onboarding.controller.js";
import { stepParamSchema } from "./onboarding.schema.js";
import { declareAccess } from "../../../authz/registry.js";

export async function loyaltyOnboardingRoutes(server: FastifyInstance) {
  declareAccess(server, { write: "loyalty.manage" });
  server.get("/presets", getPresetsHandler);

  server.get("/state", getStateHandler);

  // The body schema depends on `:step`, so it is parsed in the handler rather than
  // declared here — a single `body` schema cannot express five different shapes.
  server.post("/steps/:step", { schema: { params: stepParamSchema } }, applyStepHandler);

  server.post("/activate", activateHandler);
}
