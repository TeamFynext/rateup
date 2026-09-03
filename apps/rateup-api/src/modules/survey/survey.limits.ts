import { FastifyReply, FastifyRequest } from "fastify";

import prisma from "../../utils/prisma.js";
import { ResponsePlatform } from "../../../generated/prisma/client.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { checkPlanLimit } from "../subscription/planLimits.js";
import { sendUsageLimitMailAlert } from "../../utils/email/payments/usageLimitAlert.js";

/**
 * Where the web-form allowance lives in a stored features blob.
 *
 * There is only one: how many responses the org may take in a month. How many forms it
 * builds is not metered — a form that nobody answers costs nothing to keep, and capping
 * the count only pushed customers into reusing one form for several purposes.
 */
export const MONTHLY_RESPONSE_PATH = `${SubscriptionFeaturePathName.WebSurvey}.count.monthlyResponseLimit`;

export interface ResponseAllowance {
  /** False when this submission would go past the plan's monthly number. */
  withinLimit: boolean;
  /** The ceiling, or undefined when the plan is not metered on responses. */
  max?: number;
  used: number;
}

/**
 * Whether the org has room for another form response this month.
 *
 * Read against `monthlySurveyResponses`, the counter `updateMonthlyStat("survey", …)`
 * increments on every non-WhatsApp submission and the monthly sweep resets — the same
 * number the dashboard meter shows, so the banner and the refusal cannot disagree.
 *
 * An org with no subscription or no usage row is treated as within its limit rather than
 * refused: the respondent filling in a form is not the person who could fix either, and
 * a public form going dark over missing bookkeeping is the worse failure.
 */
export async function checkResponseAllowance(orgId: string): Promise<ResponseAllowance> {
  const [status, usage] = await Promise.all([
    checkPlanLimit(orgId, "formResponses"),
    // Whether the org is metered at all is the registry's call; whether there is a usage
    // row to measure is this gate's, and a missing one means the form stays open.
    prisma.usageStats.findUnique({ where: { orgId }, select: { orgId: true } }),
  ]);

  if (!status.metered || !usage) {
    return { withinLimit: true, max: status.max, used: status.used };
  }

  return { withinLimit: !status.exceeded, max: status.max, used: status.used };
}

/** The refusal shown to a respondent, and to the submit gate behind them. */
export const RESPONSE_LIMIT_MESSAGE =
  "This form is not accepting responses right now. Please contact the organisation.";

/**
 * Machine-readable cause, alongside the sentence.
 *
 * The public form is served to whoever holds the link, so a 403 there could be several
 * things; the client has to tell "closed for the month" from a transient failure to know
 * whether retrying is pointless. It matches `AccessDenialReason` in utils/auth.ts, which
 * the dashboard already reads the same way. Without it the frontend would be matching on
 * the message text, and the copy could never be changed.
 */
export const FORM_CLOSED_REASON = "form_closed";

/**
 * Tells the org's owner they have run out, at most once a week.
 *
 * Fired from the respondent's request, which is the only signal there is — nothing else
 * runs when a form is refused. `sendUsageLimitMailAlert` carries the weekly guard, so a
 * form that keeps being loaded after the limit does not keep mailing.
 */
export async function alertResponseLimitReached(orgId: string) {
  try {
    await sendUsageLimitMailAlert(orgId);
  } catch {
    // Best-effort: a mail failure must not turn into a 500 for the respondent.
  }
}

/** The org behind a public form link. `id` is a surveyTeamMap id, or an 8-char short id. */
export async function orgForSurveyLink(id: string): Promise<string | undefined> {
  const surveyTeamMap = await prisma.surveyTeamMap.findUnique({
    // id.length === 8 means it is shortUrlId — the same rule getPublicSurveyById uses.
    where: id.length === 8 ? { shortUrlId: id } : { id },
    select: { team: { select: { orgId: true } } },
  });
  return surveyTeamMap?.team?.orgId;
}

/**
 * Refuses a submission the org has no monthly allowance left for.
 *
 * The authoritative half of the pair: the page-load gate is a courtesy that stops someone
 * filling in a form that cannot be filed, while this is what actually holds the line — a
 * form opened before the limit was reached, a resubmitted tab, or a POST made directly
 * all arrive here.
 *
 * WhatsApp submissions are exempt: they are metered as conversations, and refusing them
 * here would take the same usage off an org twice.
 */
export async function enforceResponseLimit(
  request: FastifyRequest<{
    Body: { surveyTeamMapId?: string; platform?: string };
  }>,
  reply: FastifyReply,
) {
  if (request.body?.platform === ResponsePlatform.WHATSAPP) return;

  const surveyTeamMapId = request.body?.surveyTeamMapId;
  if (!surveyTeamMapId) return;

  const orgId = await orgForSurveyLink(surveyTeamMapId);
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
