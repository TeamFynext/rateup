import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession";
import {
  createLifecycleHandler,
  deleteLifecycleByIdHandler,
  getLifecyclesHandler,
  reorderLabelsHandler,
  updateLifecycleHandler,
} from "./lifecycle.controller";
import { $LifecycleRef } from "./lifecycle.schema";

export async function lifecycleRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.get("/", getLifecyclesHandler);
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
    "/:labelId",
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
