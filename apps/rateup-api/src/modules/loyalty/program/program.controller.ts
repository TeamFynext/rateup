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
  DeleteProgramQuery,
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
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function getLoyaltyProgramHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const result = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!result) {
      // 404, not an empty ARRAY. An org with no program used to get `[]` from an
      // endpoint that otherwise answers an object, so every client had to handle
      // two shapes from one route to tell "no program" from "a program".
      // See issues.txt 20.39.
      return reply.code(404).send({ error: "Loyalty program not found" });
    }
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
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
    const result = await updateLoyaltyProgram(
      request.params.programId,
      request.body,
      request.user.orgId,
    );
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function deleteLoyaltyProgramHandler(
  request: FastifyRequest<{
    Params: ProgramIdParam;
    Querystring: DeleteProgramQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const { force } = request.query;
    await deleteLoyaltyProgram(request.params.programId, request.user.orgId, force);
    reply.code(204).send();
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function resetProgramPointsHandler(
  request: FastifyRequest<{ Params: ProgramIdParam }>,
  reply: FastifyReply,
) {
  try {
    // The actor is recorded on every reversing ledger row the reset writes.
    // See issues.txt 20.30.
    await resetProgramPoints(request.params.programId, request.user.orgId, request.user.id);
    reply.code(200).send({ message: "Points reset successfully" });
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}
