import { FastifyRequest, FastifyReply } from "fastify";
import { hasAccessToSurvey, hasAccessToTeam } from "../../utils/auth.js";
import { CreateSurveyInput } from "./survey.schema.js";
import { GetSurveyByIdParams } from "./survey.schema.js";
import {
  alertResponseLimitReached,
  checkResponseAllowance,
  FORM_CLOSED_REASON,
  orgForSurveyLink,
  RESPONSE_LIMIT_MESSAGE,
} from "./survey.limits.js";

export async function verifySurveyAccess(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
  }>,
  reply: FastifyReply,
) {
  const surveyId = request.params.id;
  const hasAccess = await hasAccessToSurvey(surveyId, request.userId);

  if (!hasAccess) {
    reply.code(403).send({ message: "You don't have access to this survey" });
  }
}

export async function verifySurveyCreateAccess(
  request: FastifyRequest<{
    Body: CreateSurveyInput;
  }>,
  reply: FastifyReply,
) {
  const teamIds = request.body.teamIds;

  for (let teamId of teamIds) {
    if (!(await hasAccessToTeam(teamId, request.userId))) {
      reply.code(403).send();
      return;
    }
  }
}

/**
 * Closes a public form once the org has spent its monthly response allowance.
 *
 * Runs on the form's own page load rather than only on submit, so a respondent is told
 * before filling anything in — but the submit route carries the same check
 * ({@link enforceResponseLimit}), because a page load is not what spends the allowance and
 * a form already open in a tab would otherwise sail past it.
 *
 * The message names no plan and no limit: the person reading it is a customer of the org,
 * not of Rateup, and "upgrade your plan" means nothing to them. The org's owner is told
 * by email instead.
 */
export async function verifySurveyMonthlyLimitRestriction(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
  }>,
  reply: FastifyReply,
) {
  const orgId = await orgForSurveyLink(request.params.id);
  // An unknown link is the handler's 404 to give, not this gate's.
  if (!orgId) return;

  const { withinLimit } = await checkResponseAllowance(orgId);
  if (withinLimit) return;

  await alertResponseLimitReached(orgId);
  return reply.code(403).send({
    message: RESPONSE_LIMIT_MESSAGE,
    reason: FORM_CLOSED_REASON,
    displayMessageInClient: true,
  });
}
