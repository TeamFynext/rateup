import { FastifyRequest, FastifyReply } from "fastify";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";
import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import prisma from "../../../utils/prisma.js";
import { Role } from "../../../../generated/prisma/client.js";
import { getConversationAllowance } from "../../subscription/addons.js";

export async function getWhatsappSurveyVerifySubscriptionHandler(
  request: FastifyRequest<{
    Params: { orgId: string };
  }>,
  reply: FastifyReply,
) {
  // Public flow routes are org-scoped by path, not by session; the subscription gate
  // below reads only `orgId`, so the role is filled with the least-privileged one.
  request.user = { orgId: request.params.orgId, role: Role.MEMBER };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// `Subscription.features` is an untyped Json column, so the WhatsApp conversation
// cap is read out of it defensively; anything missing/malformed reads as "no cap".
function readWhatsappConversationMax(features: unknown): number | undefined {
  if (!isRecord(features)) return undefined;
  const whatsapp = features[SubscriptionFeaturePathName.Whatsapp];
  if (!isRecord(whatsapp)) return undefined;
  const conversation = whatsapp.conversation;
  if (!isRecord(conversation)) return undefined;
  const count = conversation.count;
  if (!isRecord(count)) return undefined;
  return typeof count.max === "number" ? count.max : undefined;
}

export async function checkConversationLimitAvailable(orgId: string) {
  const usage = await prisma.usageStats.findUnique({
    where: {
      orgId: orgId,
    },
  });

  const subscription = await prisma.subscription.findUnique({
    where: {
      orgId: orgId,
    },
  });

  // No usage row or no subscription to compare against - nothing to enforce, so treat
  // the org as within its limit rather than crashing on the missing data.
  if (!usage || !subscription) {
    return true;
  }

  // The allowance includes any conversation packs the org has bought. Reading the plan's
  // number alone would refuse sends from a customer who has paid for the headroom.
  const { effectiveMax: max } = await getConversationAllowance(orgId);
  // An uncapped plan is not measured at all. Enterprise is invoiced on the usage it
  // actually runs, so its allowance is a sentinel rather than a ceiling — comparing
  // against it would eventually refuse a send for a customer who has no limit.
  if (max === undefined) {
    return true;
  }

  // Enforced against the METERED counters (self-derived 24h conversation windows),
  // not the inbox-ticket counters. An inbox ticket only closes when a human or an
  // automation closes it, so it was never a bounded unit to price against; the
  // metered window always expires. monthly/annualConversationsCount remain for inbox
  // analytics. Function name and signature are unchanged so the ~35 send call sites
  // and assertWithinConversationLimit pick this up without edits.
  return !(subscription.isAnnualMessageLimit
    ? usage.annualMeteredConversationsCount >= max * 12
    : usage.monthlyMeteredConversationsCount >= max);
}
