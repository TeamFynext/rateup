import { FastifyReply, FastifyRequest } from "fastify";
import {
  createLoyaltyProgram,
  deleteLoyaltyProgram,
  getLoyaltyProgramByOrg,
  updateLoyaltyProgram,
  resetProgramPoints,
} from "./program.service.js";
import { log } from "../../../utils/logger.js";
import {
  LoyaltyProgramInput,
  LoyaltyProgramUpdateInput,
  ProgramIdParam,
} from "./program.schema.js";

export async function createLoyaltyProgramHandler(
  request: FastifyRequest<{ Body: LoyaltyProgramInput }>,
  reply: FastifyReply,
) {
  try {
    const result = await createLoyaltyProgram(request.body, request.user.orgId);
    reply.code(201).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}

export async function getLoyaltyProgramHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const result = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!result) {
      return reply.code(200).send([]);
    }
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}

export async function updateLoyaltyProgramHandler(
  request: FastifyRequest<{
    Params: ProgramIdParam;
    Body: LoyaltyProgramUpdateInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const result = await updateLoyaltyProgram(request.params.programId, request.body);
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}

export async function deleteLoyaltyProgramHandler(
  request: FastifyRequest<{
    Params: ProgramIdParam;
    Querystring: { force?: boolean };
  }>,
  reply: FastifyReply,
) {
  try {
    const { force } = request.query;
    await deleteLoyaltyProgram(request.params.programId, force);
    reply.code(204).send();
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}

export async function resetProgramPointsHandler(
  request: FastifyRequest<{ Params: ProgramIdParam }>,
  reply: FastifyReply,
) {
  try {
    await resetProgramPoints(request.params.programId);
    reply.code(200).send({ message: "Points reset successfully" });
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}
