import { FastifyInstance } from "fastify";
import { getFlowsFromWa } from "./flow.service";
import { checkSession } from "../../../utils/checkSession";
import { $waFlow } from "./flow.schema";
import {
  getFlowJsonHandler,
  getFlowsHandler,
  getUnsyncedFlowsHandler,
  importFlowsHandler,
} from "./flow.controller";
import { log } from "../../../utils/logger";

export async function flowRoutes(server: FastifyInstance) {
  server.addHook("onError", (req, res, err, done) => {
    log.error(err);
    done();
  });
  server.addHook("preHandler", checkSession);
  // TODO: add subscription

  server.get(
    "/",
    {
      schema: {
        querystring: $waFlow("sourceQuery"),
      },
    },
    getFlowsHandler,
  );
  server.get(
    "/:waFlowId/json",
    {
      schema: {
        params: $waFlow("byWaFlowIdParams"),
      },
    },
    getFlowJsonHandler,
  );

  server.get("/unsynced", getUnsyncedFlowsHandler);

  server.post(
    "/import",
    {
      schema: {
        body: $waFlow("importFlowsBody"),
      },
    },
    importFlowsHandler,
  );
}
