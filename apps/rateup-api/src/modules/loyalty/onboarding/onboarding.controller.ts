import { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import { log } from "../../../utils/logger.js";
import {
  basicsStepSchema,
  earningStepSchema,
  messagesStepSchema,
  rewardsStepSchema,
  tiersStepSchema,
  type StepParam,
} from "./onboarding.schema.js";
import {
  activateProgram,
  applyBasicsStep,
  applyEarningStep,
  applyMessagesStep,
  applyRewardsStep,
  applyTiersStep,
  getOnboardingPresets,
  getOnboardingState,
  OnboardingError,
} from "./onboarding.service.js";

/**
 * Three kinds of failure, three answers:
 *
 * - A `ZodError` is the caller's body failing its step schema (duplicate tier thresholds,
 *   no default earning rule). That is a 400 the user can fix, not a server fault — the
 *   step schemas are parsed inside the handler, so these do not go through Fastify's own
 *   validation error path.
 * - An `OnboardingError` is a guard refusing (no programme yet, nothing to activate).
 * - Anything else is a genuine 500.
 */
function fail(reply: FastifyReply, e: unknown) {
  if (e instanceof ZodError) {
    return reply.code(400).send({
      error: e.issues[0]?.message ?? "That step could not be saved",
      issues: e.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }
  if (e instanceof OnboardingError) {
    return reply.code(e.statusCode).send({ error: e.message });
  }
  log.error(e);
  return reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
}

export async function getPresetsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    reply.code(200).send(await getOnboardingPresets(request.user.orgId));
  } catch (e) {
    return fail(reply, e);
  }
}

export async function getStateHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    reply.code(200).send(await getOnboardingState(request.user.orgId));
  } catch (e) {
    return fail(reply, e);
  }
}

/**
 * One route for every step. The step id in the path selects which schema the body is
 * parsed against, so a body that does not match its step is a 400 rather than a set of
 * silently-dropped fields.
 */
export async function applyStepHandler(
  request: FastifyRequest<{ Params: StepParam; Body: unknown }>,
  reply: FastifyReply,
) {
  const { orgId } = request.user;
  const { step } = request.params;

  try {
    switch (step) {
      case "basics":
        return reply
          .code(200)
          .send(await applyBasicsStep(orgId, basicsStepSchema.parse(request.body)));
      case "earning":
        return reply
          .code(200)
          .send(await applyEarningStep(orgId, earningStepSchema.parse(request.body)));
      case "tiers":
        return reply
          .code(200)
          .send(await applyTiersStep(orgId, tiersStepSchema.parse(request.body)));
      case "rewards":
        return reply
          .code(200)
          .send(await applyRewardsStep(orgId, rewardsStepSchema.parse(request.body)));
      case "messages":
        return reply
          .code(200)
          .send(await applyMessagesStep(orgId, messagesStepSchema.parse(request.body)));
    }
  } catch (e) {
    return fail(reply, e);
  }
}

export async function activateHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    reply.code(200).send(await activateProgram(request.user.orgId));
  } catch (e) {
    return fail(reply, e);
  }
}
