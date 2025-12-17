import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger.js";
import {
  LifecycleBodySchema,
  LifecycleIdParamSchema,
  LifecycleReorderSchema,
} from "./lifecycle.schema.js";
import {
  createLifecycle,
  deleteLifecycleById,
  getLifecycles,
  getLifeCyclesWithContactCount,
  reorderLabels,
  updateLifecycle,
} from "./lifecycle.service.js";

export async function getLifecyclesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await getLifecycles(orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error getting lifecycle " });
  }
}

export async function getLifecyclesWithContatsCountHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await getLifeCyclesWithContactCount(orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error getting lifecycle " });
  }
}

export async function createLifecycleHandler(
  request: FastifyRequest<{
    Body: LifecycleBodySchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await createLifecycle(orgId, request.body);
    reply.code(200).send(res);
  } catch (e) {
    if (e.code === "P2002") {
      return reply.code(409).send({ message: "Lifecycle already exists" });
    }
    log.error(e);
    reply.code(500).send({ message: "Error creating lifecycle" });
  }
}

export async function updateLifecycleHandler(
  request: FastifyRequest<{
    Body: LifecycleBodySchema;
    Params: { lifecycleId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const id = request.params.lifecycleId;
    const res = await updateLifecycle(id, request.body);
    reply.code(200).send(res);
  } catch (e) {
    if (e.code === "P2002") {
      return reply.code(409).send({ message: "Lifecycle already exists" });
    }
    log.error(e);
    reply.code(500).send({ message: "Error updating lifecycle " });
  }
}

export async function deleteLifecycleByIdHandler(
  request: FastifyRequest<{ Params: LifecycleIdParamSchema }>,
  reply: FastifyReply,
) {
  try {
    const { lifecycleId } = request.params;
    const res = await deleteLifecycleById(lifecycleId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error deleting lifecycle" });
  }
}

export async function reorderLabelsHandler(
  request: FastifyRequest<{
    Body: LifecycleReorderSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await reorderLabels(orgId, request.body);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error reordering labels" });
  }
}
