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
  DeleteTierQuery,
  LoyaltyTierInput,
  LoyaltyTierUpdateInput,
  TierIdParam,
} from "./tier.schema.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";

// deleteLoyaltyTier throws plain Errors annotated with an extra `code` (and, for
// TIER_HAS_CUSTOMERS, a `customerCount`) field rather than dedicated Error subclasses —
// this guard narrows an unknown catch value to that shape without a cast.
function hasErrorCode(
  e: unknown,
  code: string,
): e is Error & { code: string; customerCount?: number } {
  return e instanceof Error && "code" in e && e.code === code;
}

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
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function getLoyaltyTiersHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      // if no program, return empty array to avoid 404s on frontend which expects an array in (all data get case)
      return reply.code(200).send([]);
    }
    const result = await getLoyaltyTiers(program.id);
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
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
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
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
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") {
      return reply.code(400).send({ error: "Tier with this priority name already exists" });
    }
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function deleteLoyaltyTierHandler(
  request: FastifyRequest<{
    Params: TierIdParam;
    Querystring: DeleteTierQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const downgradeCustomers =
      request.query?.downgradeCustomers === true || request.query?.downgradeCustomers === "true";

    await deleteLoyaltyTier(request.params.tierId, {
      downgradeCustomers,
    });
    reply.code(204).send();
  } catch (e) {
    log.error(e);

    if (hasErrorCode(e, "TIER_HAS_CUSTOMERS")) {
      return reply.code(409).send({
        error: e.message,
        code: e.code,
        customerCount: e.customerCount,
        requiresDowngrade: true,
      });
    }

    if (hasErrorCode(e, "TIER_DOWNGRADE_TARGET_NOT_FOUND")) {
      return reply.code(400).send({
        error: e.message,
        code: e.code,
      });
    }

    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}
