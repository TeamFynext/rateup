import type { FastifyRequest } from "fastify";
import dayjs from "dayjs";

import { getSubscription } from "../../../modules/subscription/subscription.service.js";
import { getNestedProperty } from "../../../utils/misc/obj.utils.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";
import { getLoyaltyProgramByOrg } from "../../../modules/loyalty/program/program.service.js";
import { ExternalApiError } from "../errors.js";

/**
 * The checks `/api/loyalty` applies that the partner API used to skip entirely — an API
 * key reached loyalty writes with no subscription check at all, on any plan.
 *
 * Written out here rather than reusing `getVerifySubscriptionHandler` because that helper
 * sends its own `{message, reason, missingFeatures}` body, which would put a second error
 * shape back into a surface whose whole point is having one.
 *
 * Note what is deliberately *absent*: `requireFeature(TeamFeature.loyalty)`. It returns
 * early for `SUPER_ADMIN`, and `verifyApiAccessTokenHook` stamps exactly that role on every
 * key-authenticated request, so mounting it here would be a no-op that merely looked like a
 * check. Team features are per-user; an API key belongs to the org.
 */

const isWrite = (method: string) => !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());

export async function requireLoyaltySubscription(request: FastifyRequest) {
  const subscription = await getSubscription(request.user.orgId);

  if (!subscription) {
    throw new ExternalApiError(
      403,
      "subscription_required",
      "This organisation has no active subscription",
    );
  }

  // Expiry stops writes but not reads, matching the dashboard: a lapsed shop can still
  // read its own balances back.
  if (isWrite(request.method) && dayjs(subscription.expiresAt).isBefore(dayjs())) {
    throw new ExternalApiError(403, "subscription_expired", "This subscription has expired");
  }

  const feature = getNestedProperty<subscriptionActiveField>(
    subscription.features,
    SubscriptionFeaturePathName.WhatsappLoyalty,
  );
  if (!feature?.active) {
    throw new ExternalApiError(
      403,
      "subscription_required",
      "Loyalty is not included in this subscription",
      { missingFeatures: [SubscriptionFeaturePathName.WhatsappLoyalty] },
    );
  }
}

export interface ExternalProgram {
  id: string;
  status: string;
  defaultCountryCode: string;
  currencyName: string;
  currencySymbol: string;
  signupBonus: number;
  tiersEnabled: boolean;
  tierQualificationWindowMonths: number | null;
  businessName: string | null;
}

/**
 * The org's programme.
 *
 * Writes additionally require it to be live — a draft programme has rules nobody has
 * finished writing, and points awarded against it are hard to unpick. Reads stay open so an
 * integration can be built and tested before launch day.
 */
export async function loadProgram(
  request: FastifyRequest,
  { forWrite = false }: { forWrite?: boolean } = {},
): Promise<ExternalProgram> {
  const program = await getLoyaltyProgramByOrg(request.user.orgId);
  if (!program) {
    throw new ExternalApiError(404, "program_not_found", "No loyalty programme for this org");
  }
  if (forWrite && program.status !== "active") {
    throw new ExternalApiError(
      422,
      "program_not_active",
      `The loyalty programme is ${program.status}, so it cannot be written to`,
      { status: program.status },
    );
  }
  return program as unknown as ExternalProgram;
}
