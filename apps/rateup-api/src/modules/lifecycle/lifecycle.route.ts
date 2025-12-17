import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import {
  createLifecycleHandler,
  deleteLifecycleByIdHandler,
  getLifecyclesHandler,
  getLifecyclesWithContatsCountHandler,
  reorderLabelsHandler,
  updateLifecycleHandler,
} from "./lifecycle.controller.js";
import { $LifecycleRef } from "./lifecycle.schema.js";

export async function lifecycleRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.get("/", getLifecyclesHandler);
  server.get("/contacts", getLifecyclesWithContatsCountHandler);
  server.post(
    "/",
    {
      schema: {
        body: $LifecycleRef("lifecycleBodySchema"),
      },
    },
    createLifecycleHandler,
  );
  server.put(
    "/reorder",
    {
      schema: {
        body: $LifecycleRef("lifecycleReorderSchema"),
      },
    },
    reorderLabelsHandler,
  );
  server.put(
    "/:lifecycleId",
    {
      schema: {
        body: $LifecycleRef("lifecycleBodySchema"),
        params: $LifecycleRef("lifecycleIdParamSchema"),
      },
    },
    updateLifecycleHandler,
  );
  server.delete(
    "/:lifecycleId",
    {
      schema: {
        params: $LifecycleRef("lifecycleIdParamSchema"),
      },
    },
    deleteLifecycleByIdHandler,
  );
}
