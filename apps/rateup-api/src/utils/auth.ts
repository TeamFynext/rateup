import prisma from "./prisma.js";
import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "./logger.js";
import { getSubscription } from "../modules/subscription/subscription.service.js";
import { SubscriptionFeaturePathName } from "../types/enums.js";
import dayjs from "dayjs";
import { getNestedProperty } from "./misc/obj.utils.js";

// Reads are still allowed once a subscription lapses; anything that changes data is not.
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isWrite(method: string) {
  return WRITE_METHODS.has(method);
}

/**
 * Why a 403 was sent, so the client can say the right thing.
 *
 * A plan gate and a permission gate are both 403s but they are opposite problems: one
 * is fixed by upgrading, the other by asking an admin. The client used to have only the
 * status code, so it showed "Access Denied — contact your super admin" to customers
 * whose only fault was being on the Free plan. Send the reason and let it choose.
 */
export type AccessDenialReason = "subscription" | "subscription_expired" | "team" | "unknown";

export function getVerifySubscriptionHandler(featurePathNames: Array<SubscriptionFeaturePathName>) {
  return async function verifySubscription(request: FastifyRequest, reply: FastifyReply) {
    try {
      const subscription = await getSubscription(request.user.orgId);

      if (!subscription) {
        // Refuse, matching getVerifySubscriptionForPublicHandler. This used to create a
        // free-plan subscription expiring in 100 years, which handed unlimited access to
        // any org that reached an authenticated route without a Subscription row.
        log.error({ user: request.user }, "No subscription found\nrequest.user => %o");
        reply.code(403).send({
          message: "No active subscription",
          reason: "subscription" satisfies AccessDenialReason,
          displayMessageInClient: true,
        });
        return;
      }
      if (dayjs(subscription.expiresAt).isBefore(dayjs()) && isWrite(request.method)) {
        log.error(
          { subscription, user: request.user },

          "Subscription expired\n%o\nrequest.user => %o",
        );
        reply.code(403).send({
          message: "Subscription expired",
          reason: "subscription_expired" satisfies AccessDenialReason,
          displayMessageInClient: true,
        });
        return;
      }

      const missingFeatures = featurePathNames.filter(
        (feature) =>
          !getNestedProperty<subscriptionActiveField>(subscription.features, feature)?.active,
      );
      if (missingFeatures.length > 0) {
        log.debug(
          { missingFeatures, orgId: request.user?.orgId },
          "Request blocked: subscription missing features",
        );
        reply.code(403).send({
          message: "This feature is not included in your subscription",
          reason: "subscription" satisfies AccessDenialReason,
          // Which gates were closed, so the client can name the feature it is offering.
          missingFeatures,
        });
        return;
      }
      request.subscription = subscription;
    } catch (err) {
      log.error({ err, orgId: request.user?.orgId }, "Error verifying subscription");
      reply.code(403).send({ message: "Error while verifying subscription" });
    }
  };
}

export function isRootOrg(request: FastifyRequest): boolean {
  return Boolean(request.user?.orgId) && request.user.orgId === process.env.ROOT_ORG;
}

export function assertRootOrg(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!isRootOrg(request)) {
    reply.code(403).send({ message: "Not authorized" });
    // Return rather than falling through to done(), which would have carried a
    // refused request on through the handler chain.
    return;
  }
  done();
}

export function getVerifySubscriptionForPublicHandler(
  featurePathNames: Array<SubscriptionFeaturePathName>,
) {
  return async function verifySubscription(
    request: FastifyRequest<{ Body: { orgId: string } & object }>,
    reply: FastifyReply,
  ) {
    try {
      const subscription = await getSubscription(request.body.orgId);

      if (!subscription) {
        log.trace("No subscription found");
        reply.code(403).send({
          message: "Unauthorized",
          displayMessageInClient: true,
        });
        return;
      }
      if (dayjs(subscription.expiresAt).isBefore(dayjs()) && isWrite(request.method)) {
        log.error(
          { subscription, orgId: request.body.orgId },
          "Subscription expired\n%o\nrequest.body => %o",
        );
        reply.code(403).send({
          message: "Subscription expired",
          reason: "subscription_expired" satisfies AccessDenialReason,
          displayMessageInClient: true,
        });
        return;
      }
      const missingFeatures = featurePathNames.filter(
        (feature) =>
          !getNestedProperty<subscriptionActiveField>(subscription.features, feature)?.active,
      );
      if (missingFeatures.length > 0) {
        log.error(
          { missingFeatures, orgId: request.body.orgId },
          "Subscription missing features\n%o\nrequest.body => %o",
        );
        reply.code(403).send({
          message: "This feature is not included in your subscription",
          reason: "subscription" satisfies AccessDenialReason,
          // Which gates were closed, so the client can name the feature it is offering.
          missingFeatures,
        });
        return;
      }
      request.subscription = subscription;
    } catch (err) {
      log.error(err);
      reply.code(403).send({ message: "Error while verifying subscription" });
    }
  };
}

export async function verifySubscription(
  orgId: string,
  featurePathNames: Array<SubscriptionFeaturePathName>,
) {
  const subscription = await getSubscription(orgId);

  if (!subscription) {
    log.trace("No subscription found");
    return false;
  }
  if (dayjs(subscription.expiresAt).isBefore(dayjs())) {
    log.error({ subscription, orgId }, "Subscription expired");
    return false;
  }
  const missingFeatures = featurePathNames.filter(
    (feature) =>
      !getNestedProperty<subscriptionActiveField>(subscription.features, feature)?.active,
  );
  if (missingFeatures.length > 0) {
    log.error({ missingFeatures, orgId }, "Subscription missing features");
    return false;
  }
  return subscription;
}
