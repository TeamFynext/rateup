import { FastifyRequest } from "fastify/types/request.js";
import {
  ByWaAutomatedReplyIdParams,
  CloneAutomatedReplyBody,
  CreateAutomatedReplySchema,
  InitiateAutomatedReplyBody,
} from "./wa_automatedReply.schema.js";
import { FastifyReply } from "fastify";
import {
  createAutomatedReply,
  cloneAutomatedReply,
  deleteAutomatedReply,
  getAutomatedRepliesByOrgId,
  getAutomatedRepliesMessagId,
  getAutomatedReplyById,
  updateAutomatedReply,
  verifyAutomationTriggerLimit,
} from "./wa_automatedReply.service.js";
import { ByTeamIdParams } from "../../team/team.schema.js";
import { log } from "../../../utils/logger.js";
import { handleAutomatedReply } from "../whatsappSurvey/wasurvey.controller.js";
import connection from "../../../utils/redisConnection.js";

// Matches any thrown value carrying a Prisma-style `code`, deliberately duck-typed rather
// than narrowed via `instanceof PrismaClientKnownRequestError` — the original code checked
// `error.code` structurally, and callers/tests supply plain objects annotated with a `code`.
function hasErrorCode(e: unknown, code: string): e is { code: string } {
  return typeof e === "object" && e !== null && "code" in e && e.code === code;
}

export async function getAutomatedRepliesMessagIdHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const automatedReplies = await getAutomatedRepliesMessagId(req.params.id, req.user.orgId);
    reply.send(automatedReplies);
  } catch (error) {
    log.error({ err: error }, "Error reading automated reply messages");
    reply.code(500).send(error instanceof Error ? error.message : "error reading messages");
  }
}

export async function getAllAutomatedRepliesByOrgIdHandler(
  req: FastifyRequest<{ Params: ByTeamIdParams }>,
  reply: FastifyReply,
) {
  try {
    const automatedReplies = await getAutomatedRepliesByOrgId(req.user.orgId);
    reply.send(automatedReplies);
  } catch (error) {
    log.error({ err: error }, "Error listing automated replies");
    reply.code(500).send(error instanceof Error ? error.message : "error listing automatedReplies");
  }
}
export async function getAutomatedRepliesByIdHandler(
  req: FastifyRequest<{ Params: ByWaAutomatedReplyIdParams }>,
  reply: FastifyReply,
) {
  try {
    const automatedReply = await getAutomatedReplyById(
      req.params.waAutomatedReplyId,
      req.user.orgId,
    );
    if (!automatedReply) {
      return reply.code(404).send("Automated reply not found");
    }
    reply.send(automatedReply);
  } catch (error) {
    log.error({ err: error }, "Error reading automated reply");
    reply.code(500).send(error instanceof Error ? error.message : "error reading automatedReply");
  }
}

export async function createAutomatedReplyHandler(
  req: FastifyRequest<{ Body: CreateAutomatedReplySchema }>,
  reply: FastifyReply,
) {
  try {
    const automatedReply = await createAutomatedReply(req.body, req.user.orgId);
    reply.code(201).send(automatedReply);
  } catch (error) {
    if (hasErrorCode(error, "P2002")) {
      reply.code(409).send("Some specified keywords already exist for this organization.");
    } else {
      log.error({ err: error }, "Error creating automated reply");
      reply
        .code(500)
        .send(error instanceof Error ? error.message : "error in creating automatedReply");
    }
  }
}

export async function cloneAutomatedReplyHandler(
  req: FastifyRequest<{
    Params: ByWaAutomatedReplyIdParams;
    Body: CloneAutomatedReplyBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const automatedReply = await cloneAutomatedReply(
      req.params.waAutomatedReplyId,
      req.user.orgId,
      req.body?.name,
    );
    reply.code(201).send(automatedReply);
  } catch (error) {
    if (error instanceof Error && error.message === "Automated reply not found") {
      reply.code(404).send(error.message);
    } else {
      log.error({ err: error }, "Error cloning automated reply");
      reply
        .code(500)
        .send(error instanceof Error ? error.message : "error in cloning automatedReply");
    }
  }
}

export async function updateAutomatedReplyHandler(
  req: FastifyRequest<{
    Params: ByWaAutomatedReplyIdParams;
    Body: CreateAutomatedReplySchema;
  }>,
  reply: FastifyReply,
) {
  try {
    await updateAutomatedReply(req.params.waAutomatedReplyId, req.body, req.user.orgId);
    reply.code(204).send();
  } catch (error) {
    if (hasErrorCode(error, "P2002")) {
      reply.code(409).send("Some specified keywords already exist for this organization.");
    } else if (error instanceof Error && error.message === "Automated reply not found") {
      reply.code(404).send(error.message);
    } else {
      log.error({ err: error }, "Error updating automated reply");
      reply
        .code(500)
        .send(error instanceof Error ? error.message : "error in updating automatedReply");
    }
  }
}

export async function deleteAutomatedReplyHandler(
  req: FastifyRequest<{ Params: ByWaAutomatedReplyIdParams }>,
  reply: FastifyReply,
) {
  const automationId = req.params.waAutomatedReplyId;
  try {
    const automatedReply = await deleteAutomatedReply(automationId, req.user.orgId);
    const keys = await connection.keys(`round_robin_index:*:${automationId}:*`);
    if (keys.length) {
      await connection.del(...keys);
    }
    reply.send(automatedReply);
  } catch (error) {
    if (error instanceof Error && error.message === "Automated reply not found") {
      reply.code(404).send(error.message);
    } else {
      log.error({ err: error }, "Error deleting automated reply");
      reply
        .code(500)
        .send(error instanceof Error ? error.message : "error in deleting automatedReply");
    }
  }
}

export async function initiateAutomatedReplyByIdHandler(
  req: FastifyRequest<{
    Params: ByWaAutomatedReplyIdParams;
    Body: InitiateAutomatedReplyBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const { phone } = req.body;
    const automatedReply = await handleAutomatedReply(
      req.user.orgId,
      null,
      null,
      phone,
      null,
      req.params.waAutomatedReplyId,
    );
    reply.code(200).send(automatedReply);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function verifyAutomationTriggerLimitHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    if (!(await verifyAutomationTriggerLimit(orgId))) {
      return reply.code(403).send("Automation Trigger is inactive or limit reached");
    }
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
