import { FastifyRequest, FastifyReply } from "fastify";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";
import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import { Role } from "../../../../generated/prisma/client.js";
import { buildActor } from "../../../authz/actor.js";
import { checkPlanLimit } from "../../subscription/planLimits.js";

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

// Thrown by outbound send paths when an org has hit its conversation limit.
// Mapped to a 403 with an upgrade message by the WhatsApp route error handler.
export class ConversationLimitError extends Error {
  statusCode = 403;
  constructor(message = "Conversation limit reached. Upgrade your plan to send more messages.") {
    super(message);
    this.name = "ConversationLimitError";
  }
}

// Guards an OUTBOUND send: throws ConversationLimitError when the org is over its
// conversation allowance. Never call this on the inbound path — receiving customer
// messages and creating/counting conversations must never be blocked.
export async function assertWithinConversationLimit(orgId: string) {
  const withinLimit = await checkConversationLimitAvailable(orgId);
  if (!withinLimit) {
    throw new ConversationLimitError();
  }
}

export async function checkConversationLimitAvailable(orgId: string) {
  // The `conversations` row in PLAN_LIMITS carries every rule this gate used to spell out
  // itself: packs are included (reading the plan's number alone refuses sends from a
  // customer who paid for the headroom), an uncapped plan is not measured at all, an
  // annual allowance is twelve months of the monthly one, and missing bookkeeping reads as
  // "within limit" rather than refusing a send over data the customer cannot fix.
  //
  // Shared with the campaign preflight so a customer cannot be warned about a shortfall
  // that never arrives, or told they have room and then refused. Enforced against the
  // METERED counters (self-derived 24h conversation windows), not the inbox-ticket
  // counters: an inbox ticket only closes when a human or an automation closes it, so it
  // was never a bounded unit to price against, while the metered window always expires.
  // Name and signature are unchanged, so the ~35 send call sites pick this up untouched.
  return !(await checkPlanLimit(orgId, "conversations")).exceeded;
}
