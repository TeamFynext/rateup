import { FastifyReply, FastifyRequest } from "fastify";
import {
  createLoyaltyEarningRule,
  deleteLoyaltyEarningRule,
  getActiveLoyaltyEarningRules,
  getLoyaltyEarningRuleById,
  getLoyaltyEarningRules,
  updateLoyaltyEarningRule,
} from "./earningRule.service.js";
import { log } from "../../../utils/logger.js";
import {
  LoyaltyEarningRuleInput,
  LoyaltyEarningRuleUpdateInput,
  RuleIdParam,
} from "./earningRule.schema.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";

/** Prisma's "no row matched" — here, an id outside the caller's programme. */
function isRecordNotFound(e: unknown) {
  return typeof e === "object" && e !== null && "code" in e && e.code === "P2025";
}

export async function createLoyaltyEarningRuleHandler(
  request: FastifyRequest<{ Body: LoyaltyEarningRuleInput }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }
    const result = await createLoyaltyEarningRule(request.body, program.id);
    reply.code(201).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function getLoyaltyEarningRulesHandler(
  request: FastifyRequest<{ Querystring: { active?: string } }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);

    if (!program) {
      // return reply.code(404).send({ error: "Loyalty program not found" });
      return reply.code(200).send([]); // Return empty array if no program found
    }

    const result =
      request.query.active === "true"
        ? await getActiveLoyaltyEarningRules(program.id)
        : await getLoyaltyEarningRules(program.id);

    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function getLoyaltyEarningRuleByIdHandler(
  request: FastifyRequest<{ Params: RuleIdParam }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    const result = program
      ? await getLoyaltyEarningRuleById(request.params.ruleId, program.id)
      : null;
    if (!result) {
      return reply.code(404).send({ error: "Earning rule not found" });
    }
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function updateLoyaltyEarningRuleHandler(
  request: FastifyRequest<{
    Params: RuleIdParam;
    Body: LoyaltyEarningRuleUpdateInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Earning rule not found" });
    }
    const result = await updateLoyaltyEarningRule(request.params.ruleId, program.id, request.body);
    reply.code(200).send(result);
  } catch (e) {
    if (isRecordNotFound(e)) {
      return reply.code(404).send({ error: "Earning rule not found" });
    }
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function deleteLoyaltyEarningRuleHandler(
  request: FastifyRequest<{ Params: RuleIdParam }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Earning rule not found" });
    }
    await deleteLoyaltyEarningRule(request.params.ruleId, program.id);
    reply.code(204).send();
  } catch (e) {
    if (isRecordNotFound(e)) {
      return reply.code(404).send({ error: "Earning rule not found" });
    }
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}
