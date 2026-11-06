import { FastifyReply, FastifyRequest } from "fastify";

import { log } from "../../utils/logger.js";
import { findTask, MAINTENANCE_TASKS } from "./maintenance.tasks.js";
import { runTask } from "./task.js";
import type { RunTaskInput, TaskIdParamInput } from "./maintenance.schema.js";

/** The catalog the admin panel renders. Deliberately excludes the runners themselves. */
export async function listMaintenanceTasksHandler(_request: FastifyRequest, reply: FastifyReply) {
  reply.send(
    MAINTENANCE_TASKS.map(({ id, title, description, destructive }) => ({
      id,
      title,
      description,
      destructive,
    })),
  );
}

export async function runMaintenanceTaskHandler(
  request: FastifyRequest<{ Params: TaskIdParamInput; Body: RunTaskInput }>,
  reply: FastifyReply,
) {
  const task = findTask(request.params.taskId);
  if (!task) {
    return reply.code(404).send({ message: `No maintenance task "${request.params.taskId}"` });
  }

  // Dry run unless the caller explicitly asks otherwise. Every task honours the flag, so
  // the default is the one that cannot do damage.
  const apply = request.body?.apply === true;

  try {
    const result = await runTask(task.run, apply);
    log.info({ taskId: task.id, apply, summary: result.summary }, "Maintenance task run");
    reply.send(result);
  } catch (error) {
    // The transcript up to the failure is the useful part, so report the message rather
    // than a bare 500 — a task that refuses (an unsafe delete, a price mismatch) explains
    // itself in the error it throws.
    log.error({ err: error, taskId: task.id, apply }, "Maintenance task failed");
    reply.code(422).send({
      message: error instanceof Error ? error.message : "The task failed",
    });
  }
}
