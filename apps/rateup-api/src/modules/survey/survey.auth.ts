import { FastifyRequest, FastifyReply } from "fastify";
import { surveyInScope } from "../../authz/resourceScope.js";
import { inScope } from "../../authz/scope.js";
import { GetSurveyByIdParams } from "./survey.schema.js";
import prisma from "../../utils/prisma.js";
import { getSurveyIdOfVariable } from "./survey.service.js";
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
  const hasAccess = request.actor ? await surveyInScope(surveyId, request.actor) : false;

  if (!hasAccess) {
    reply.code(403).send({ message: "You don't have access to this survey" });
  }
}

/** True when every id names a team of `orgId`. */
export async function teamsBelongToOrg(teamIds: readonly string[], orgId: string) {
  const unique = [...new Set(teamIds)];
  if (unique.length === 0) return true;
  const owned = await prisma.team.count({ where: { id: { in: unique }, orgId } });
  return owned === unique.length;
}

/**
 * Guards every write that maps a survey onto teams (create with `teamIds`, clone with
 * `teamIds`, update with `teams`): each team must be the caller's org's and inside the
 * actor's team scope. Without the org check any uuid planted the survey in another org's
 * team, under that org's branding and usage counters.
 */
export async function verifySurveyTeamIds<R extends FastifyRequest>(
  request: R,
  reply: FastifyReply,
) {
  const actor = request.actor;
  if (!actor) return reply.code(403).send();
  const body = request.body as { teamIds?: string[]; teams?: string[] } | undefined;
  const teamIds = body?.teamIds ?? body?.teams ?? [];
  if (!teamIds.every((teamId) => inScope(actor, teamId))) {
    return reply.code(403).send({ message: "This team is outside your access.", reason: "scope" });
  }
  if (!(await teamsBelongToOrg(teamIds, actor.orgId))) {
    return reply.code(403).send({ message: "Unknown team.", reason: "scope" });
  }
}

/**
 * PUT/DELETE `/survey-variables/:id` name a variable, not a survey: resolve the variable's
 * survey and run the survey access check on that.
 */
export async function verifySurveyVariableAccess(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const surveyId = await getSurveyIdOfVariable(request.params.id);
  const hasAccess =
    surveyId && request.actor ? await surveyInScope(surveyId, request.actor) : false;
  if (!hasAccess) {
    return reply.code(403).send({ message: "You don't have access to this survey" });
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
