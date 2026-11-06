import { FastifyInstance } from "fastify";
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
import { declareAccess } from "../../authz/registry.js";

export async function lifecycleRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });
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
