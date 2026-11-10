import { FastifyRequest, FastifyReply } from "fastify";
import { SubscriptionFeaturePathName } from "../../../../types/enums.js";
import { getVerifySubscriptionHandler } from "../../../../utils/auth.js";
import { Role } from "../../../../generated/prisma/client.js";
import { buildActor } from "../../../../authz/actor.js";
import {
  canMessageContact,
  type Recipient,
} from "../../../settings/subscription/activeContacts.js";
import { consumeCampaignCredit } from "../../../settings/subscription/campaignCredits.js";
import {
  isOrgSuspended,
  ORG_SUSPENDED_CODE,
  ORG_SUSPENDED_MESSAGE,
} from "../../../settings/org/orgSuspension.js";

export async function getWhatsappSurveyVerifySubscriptionHandler(
  request: FastifyRequest<{
    Params: { orgId: string };
  }>,
  reply: FastifyReply,
) {
  // Public flow routes are org-scoped by path, not by session; the subscription gate
  // below reads only `orgId`, so the role is filled with the least-privileged one.
  request.user = { orgId: request.params.orgId, role: Role.MEMBER };
  request.principal = { kind: "publicFlow", orgId: request.params.orgId };
  request.actor = buildActor(request.principal);
  await getVerifySubscriptionHandler([SubscriptionFeaturePathName.Whatsapp])(request, reply);
}

export const ACTIVE_CONTACT_LIMIT_MESSAGE =
  "You've reached this month's active contacts, so new contacts can't be messaged. " +
  "Contacts you've already talked to this month can still be reached. Upgrade or add a " +
  "contact pack to message new contacts.";

// Thrown by outbound send paths when the recipient would be a new active contact past the
// org's allowance. Mapped to a 403 by the WhatsApp route error handler.
export class ActiveContactLimitError extends Error {
  statusCode = 403;
  code = "ACTIVE_CONTACT_LIMIT_REACHED";
  constructor(message = ACTIVE_CONTACT_LIMIT_MESSAGE) {
    super(message);
    this.name = "ActiveContactLimitError";
  }
}

// Thrown by the campaign send path when no campaign credit is left to spend.
export class CampaignCreditsExhaustedError extends Error {
  statusCode = 403;
  code = "CAMPAIGN_CREDITS_EXHAUSTED";
  constructor(
    message = "You've used this month's campaign credits. Upgrade or add a credit pack to keep sending.",
  ) {
    super(message);
    this.name = "CampaignCreditsExhaustedError";
  }
}

// Thrown when RateUp staff have suspended the account (src/modules/platform/staff). Separate from
// the limit error because it is a different problem with a different answer: nothing the
// customer can buy fixes it.
export class OrgSuspendedError extends Error {
  statusCode = 403;
  code = ORG_SUSPENDED_CODE;
  constructor(message = ORG_SUSPENDED_MESSAGE) {
    super(message);
    this.name = "OrgSuspendedError";
  }
}

// Guards an OUTBOUND, non-broadcast send: throws when the org is suspended, or when the
// recipient would be a new active contact past the allowance. Never call this on the
// inbound path — customer messages are always received and counted.
//
// Suspension is checked here as well as at the session and API-key gates, because a send
// can also come from a queue or a cron job, where no request was ever authorised.
export async function assertCanMessageContact(orgId: string, recipient?: Recipient) {
  if (await isOrgSuspended(orgId)) {
    throw new OrgSuspendedError();
  }
  if (!(await canMessageContact(orgId, recipient))) {
    throw new ActiveContactLimitError();
  }
}

// Guards a campaign send: suspension first, then spends one credit for this attempt.
export async function assertCampaignCredit(orgId: string) {
  if (await isOrgSuspended(orgId)) {
    throw new OrgSuspendedError();
  }
  if (!(await consumeCampaignCredit(orgId))) {
    throw new CampaignCreditsExhaustedError();
  }
}
