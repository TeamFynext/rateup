import { FastifyInstance } from "fastify";

import { assertRootOrg } from "../../utils/auth.js";
import {
  listMaintenanceTasksHandler,
  runMaintenanceTaskHandler,
} from "./maintenance.controller.js";
import {
  runTaskSchema,
  taskIdParamSchema,
  type RunTaskInput,
  type TaskIdParamInput,
} from "./maintenance.schema.js";
import { declareAccess } from "../../authz/registry.js";

/**
 * Data migrations, behind the admin gate.
 *
 * The module this replaced registered its handlers as *public* routes: twenty-one
 * unauthenticated endpoints that rewrote plan features, retagged contacts and reseeded
 * pipelines. These require a session and root-org membership, like the rest of admin.
 */
export async function maintenanceRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });

  server.get("/tasks", { preHandler: [assertRootOrg] }, listMaintenanceTasksHandler);

  server.post<{ Params: TaskIdParamInput; Body: RunTaskInput }>(
    "/tasks/:taskId/run",
    {
      preHandler: [assertRootOrg],
      schema: { params: taskIdParamSchema, body: runTaskSchema },
    },
    runMaintenanceTaskHandler,
  );
}
