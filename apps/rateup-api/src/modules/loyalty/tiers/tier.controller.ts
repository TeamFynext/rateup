import { FastifyReply, FastifyRequest } from "fastify";
import {
  createLoyaltyTier,
  deleteLoyaltyTier,
  getLoyaltyTierById,
  getLoyaltyTiers,
  updateLoyaltyTier,
} from "./tier.service.js";
import { log } from "../../../utils/logger.js";
import {
  LoyaltyTierInput,
  LoyaltyTierUpdateInput,
  TierIdParam,
} from "./tier.schema.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";

export async function createLoyaltyTierHandler(
  request: FastifyRequest<{ Body: LoyaltyTierInput }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }
    const result = await createLoyaltyTier(request.body, program.id);
    reply.code(201).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}

export async function getLoyaltyTiersHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }
    const result = await getLoyaltyTiers(program.id);
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}

export async function getLoyaltyTierByIdHandler(
  request: FastifyRequest<{ Params: TierIdParam }>,
  reply: FastifyReply,
) {
  try {
    const result = await getLoyaltyTierById(request.params.tierId);
    if (!result) {
      return reply.code(404).send({ error: "Tier not found" });
    }
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}

export async function updateLoyaltyTierHandler(
  request: FastifyRequest<{
    Params: TierIdParam;
    Body: LoyaltyTierUpdateInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const result = await updateLoyaltyTier(request.params.tierId, request.body);
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}

export async function deleteLoyaltyTierHandler(
  request: FastifyRequest<{ Params: TierIdParam }>,
  reply: FastifyReply,
) {
  try {
    await deleteLoyaltyTier(request.params.tierId);
    reply.code(204).send();
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}
