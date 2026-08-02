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
  LifecycleInUseError,
  getLifecycles,
  getLifeCyclesWithContactCount,
  reorderLabels,
  updateLifecycle,
} from "./lifecycle.service.js";

// Matches any thrown value carrying a Prisma-style `code`, deliberately duck-typed rather
// than narrowed via `instanceof PrismaClientKnownRequestError` — the original code checked
// `e.code` structurally, and callers/tests supply plain objects annotated with a `code`.
function hasErrorCode(e: unknown, code: string): e is { code: string } {
  return typeof e === "object" && e !== null && "code" in e && e.code === code;
}

export async function getLifecyclesHandler(request: FastifyRequest, reply: FastifyReply) {
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
    // 201 with the created row: this used to answer 200 with nothing, so a client
    // had to re-list to learn the new stage's id. See issues.txt 27.6.
    const res = await createLifecycle(orgId, request.body);
    reply.code(201).send(res);
  } catch (e) {
    // NOTE: the Lifecycle model declares no @@unique, so Prisma cannot raise P2002
    // for it and this branch is unreachable — two stages of the same name in the
    // same org are created without complaint. Adding the constraint is a schema
    // change against live data and is left for an explicit decision, so the branch
    // stays, ready for it. See issues.txt 27.5.
    if (hasErrorCode(e, "P2002")) {
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
    const { orgId } = request.user;
    // The session's org, not the path id alone: a stage id used to be enough to
    // rewrite any organisation's stage. See issues.txt 27.1.
    const res = await updateLifecycle(id, orgId, request.body);
    reply.code(200).send(res);
  } catch (e) {
    if (hasErrorCode(e, "P2025")) {
      return reply.code(404).send({ message: "Lifecycle not found" });
    }
    if (hasErrorCode(e, "P2002")) {
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
    const { orgId } = request.user;
    const res = await deleteLifecycleById(lifecycleId, orgId);
    reply.code(200).send(res);
  } catch (e) {
    // A stage still holding contacts is refused rather than silently NULLing their
    // lifecycleId, and a stage another org owns is indistinguishable from one that
    // does not exist. See issues.txt 27.2.
    if (e instanceof LifecycleInUseError) {
      return reply.code(409).send({ message: e.message });
    }
    if (hasErrorCode(e, "P2025")) {
      return reply.code(404).send({ message: "Lifecycle not found" });
    }
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
