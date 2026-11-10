import type { FastifyRequest } from "fastify";
import dayjs from "dayjs";

import { getSubscription } from "../../../modules/settings/subscription/subscription.service.js";
import { getNestedProperty } from "../../../utils/misc/obj.utils.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";
import { ExternalApiError } from "../../shared/errors.js";

/**
 * The plan gate `/api/campaigns` mounts as `getVerifySubscriptionHandler([WhatsappCampaign])`,
 * which the partner routes used to skip: an API key could create and send campaigns on a
 * plan without campaigns at all.
 *
 * Written out rather than reusing that helper because it replies with its own body; see
 * loyalty/guards.ts for the same reasoning. Same rules as the dashboard: no subscription or
 * no campaign feature refuses everything; an expired one refuses writes only.
 */

const isWrite = (method: string) => !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());

export async function requireCampaignSubscription(request: FastifyRequest) {
  const subscription = await getSubscription(request.user.orgId);

  if (!subscription) {
    throw new ExternalApiError(
      403,
      "subscription_required",
      "This organisation has no active subscription",
    );
  }

  if (isWrite(request.method) && dayjs(subscription.expiresAt).isBefore(dayjs())) {
    throw new ExternalApiError(403, "subscription_expired", "This subscription has expired");
  }

  const feature = getNestedProperty<subscriptionActiveField>(
    subscription.features,
    SubscriptionFeaturePathName.WhatsappCampaign,
  );
  if (!feature?.active) {
    throw new ExternalApiError(
      403,
      "subscription_required",
      "WhatsApp campaigns are not included in this subscription",
      { missingFeatures: [SubscriptionFeaturePathName.WhatsappCampaign] },
    );
  }
}
