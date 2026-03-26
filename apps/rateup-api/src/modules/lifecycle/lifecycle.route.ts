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
import {
  lifecycleBodySchema,
  lifecycleReorderSchema,
  lifecycleIdParamSchema,
} from "./lifecycle.schema.js";

export async function lifecycleRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.get("/", getLifecyclesHandler);
  server.get("/contacts", getLifecyclesWithContatsCountHandler);
  server.post(
    "/",
    {
      schema: {
        body: lifecycleBodySchema,
      },
    },
    createLifecycleHandler,
  );
  server.put(
    "/reorder",
    {
      schema: {
        body: lifecycleReorderSchema,
      },
    },
    reorderLabelsHandler,
  );
  server.put(
    "/:lifecycleId",
    {
      schema: {
        body: lifecycleBodySchema,
        params: lifecycleIdParamSchema,
      },
    },
    updateLifecycleHandler,
  );
  server.delete(
    "/:lifecycleId",
    {
      schema: {
        params: lifecycleIdParamSchema,
      },
    },
    deleteLifecycleByIdHandler,
  );
}
