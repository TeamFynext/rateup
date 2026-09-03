import dayjs from "dayjs";
import prisma from "../../utils/prisma.js";
import { FreePlanSubscriptionFeatures, getFreeSubscriptionFeatures } from "./subscription.data.js";
import { updateSubscriptionInput } from "./subscription.schema.js";
import { PaymentPlanType, Prisma } from "../../../generated/prisma/client.js";
import { createStats } from "../stats/stats.service.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { getNestedProperty } from "../../utils/misc/obj.utils.js";
import { GATEWAY_BILLED_PLAN } from "./planBilling.js";
import { log } from "../../utils/logger.js";
import merge from "lodash/merge.js";

/**
 * Whether a tier costs money — either it links a gateway product, or it carries a price.
 * Both are checked: a tier can be priced before its gateway plans are seeded.
 */
function isPaidPlan(plan: {
  paymentPlanId: string | null;
  monthlyPaymentPlanId: string | null;
  yearlyPaymentPlanId: string | null;
  stripeId: string | null;
  price: number | null;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
}) {
  return Boolean(
    plan.paymentPlanId ||
    plan.monthlyPaymentPlanId ||
    plan.yearlyPaymentPlanId ||
    plan.stripeId ||
    (plan.price ?? 0) > 0 ||
    (plan.monthlyPrice ?? 0) > 0 ||
    (plan.yearlyPrice ?? 0) > 0,
  );
}

export async function createFreePlanSubscription(
  orgId: string,
  pClient: typeof prisma | Prisma.TransactionClient = prisma,
  planId?: string,
  overrides?: Partial<SubscriptionFeatures>,
) {
  let rateupPlan;
  if (planId) {
    rateupPlan = await pClient.rateupPlan.findUnique({
      where: {
        id: planId,
      },
    });

    // `planId` arrives as a signup form field, so it is whatever the client sent, and the
    // tier ids are public (the pricing page reads them from an unauthenticated endpoint).
    // Honouring a paid tier here would hand out its features — for a hundred years, with
    // no payment — to anyone who names it. A paid plan may only ever be granted by a
    // gateway webhook, so ignore it and fall through to Free.
    if (rateupPlan && isPaidPlan(rateupPlan)) {
      log.warn(
        { orgId, planId, plan: rateupPlan.name },
        "Ignoring a paid plan requested at signup; falling back to the free plan",
      );
      rateupPlan = null;
    }
  }
  if (!planId || !rateupPlan) {
    // Check if the FREE PLAN plan exists  -- was earlier RATEUP TRIAL
    let rateupFreePlan = await pClient.rateupPlan.findFirst({
      where: {
        name: "FREE PLAN",
      },
    });

    let freePlanDescription = [
      "1 team \u00b7 1 user",
      "100 conversations / mo",
      "100 form submissions / mo",
      "WhatsApp \u00b7 Instagram \u00b7 Messenger inbox",
      "Automations, templates & chatbots",
      "Email support",
    ];

    if (!rateupFreePlan) {
      rateupFreePlan = await pClient.rateupPlan.create({
        data: {
          name: "FREE PLAN",
          displayName: "FREE PLAN",
          planType: PaymentPlanType.BASE,
          description: freePlanDescription,
          features: FreePlanSubscriptionFeatures,
        },
      });
    }

    rateupPlan = rateupFreePlan;
  }
  let finalFeatures: LegacySubscriptionFeatures;
  if (planId && rateupPlan) {
    // Paid/custom plan. RateupPlan.features is nullable; an empty blob migrates to the
    // safe defaults rather than nulling out the subscription's required column.
    finalFeatures = overrides
      ? merge({}, rateupPlan.features ?? {}, overrides)
      : (rateupPlan.features ?? {});
  } else {
    //Free plan
    finalFeatures = getFreeSubscriptionFeatures(overrides);
  }

  await pClient.subscription.create({
    data: {
      orgId,
      basePlanId: rateupPlan.id,
      features: finalFeatures,
      expiresAt: dayjs().add(100, "year").toDate(),
    },
  });
}

/**
 * How long past `expiresAt` an org keeps its plan before being dropped to Free.
 *
 * A renewal charges at `current_end`, which is the same instant as `expiresAt`, and the
 * webhook that records it lands a little after. Without slack a renewal processed a few
 * minutes late would downgrade the org and then immediately re-grant the plan.
 */
const EXPIRY_GRACE_HOURS = 24;

/**
 * Returns orgs whose paid period has run out to the Free plan.
 *
 * This is the single mechanism behind every way a subscription can end, because they all
 * converge on the same fact — the paid-through date has passed with no renewal:
 *
 *   - **Cancelled**: Razorpay stops renewing, but the org keeps what it paid for until
 *     `expiresAt`, which is what the cancel dialog promises.
 *   - **Halted**: the renewal charge failed after every retry, so `expiresAt` is already
 *     behind and the org is picked up on the next run.
 *   - **Completed / plain expiry**: the same, without a failure.
 *
 * Sales-led tiers are exempt — see {@link GATEWAY_BILLED_PLAN}.
 *
 * Being time-driven rather than webhook-driven also makes it self-healing: an org whose
 * `subscription.cancelled` never arrived is still downgraded on schedule.
 */
export async function downgradeExpiredSubscriptions() {
  const freePlan = await prisma.rateupPlan.findFirst({ where: { name: "FREE PLAN" } });
  if (!freePlan) {
    log.error("No FREE PLAN in the catalog; cannot downgrade expired subscriptions");
    return { downgraded: 0 };
  }

  const cutoff = dayjs().subtract(EXPIRY_GRACE_HOURS, "hour").toDate();
  const expired = await prisma.subscription.findMany({
    where: {
      expiresAt: { lt: cutoff },
      // Only plans a gateway bills on a schedule. Enterprise and bespoke `custom` tiers
      // are renewed by conversation, so a lapsed date there means an admin has not got
      // to it yet — not that the customer should lose what they contracted for.
      basePlan: GATEWAY_BILLED_PLAN,
      // Already on Free — nothing to take away, and its expiry is a century out anyway.
      NOT: { basePlanId: freePlan.id },
    },
    select: { orgId: true, expiresAt: true, basePlan: { select: { name: true } } },
  });

  if (!expired.length) return { downgraded: 0 };

  const freeFeatures = getFreeSubscriptionFeatures();
  let downgraded = 0;

  for (const subscription of expired) {
    try {
      await prisma.subscription.update({
        where: { orgId: subscription.orgId },
        data: {
          basePlanId: freePlan.id,
          features: freeFeatures,
          // Matches the expiry signup gives a free org: Free does not lapse.
          expiresAt: dayjs().add(100, "year").toDate(),
          // The org is on a different allowance now, so let the next limit alert fire.
          lastLimitAlertSentAt: null,
          // The gateway subscription is over; keeping the ref would let a stray webhook
          // or a plan-change attempt act on a subscription that no longer bills.
          subscriptionRef: null,
        },
      });
      downgraded++;
      log.info(
        {
          orgId: subscription.orgId,
          from: subscription.basePlan?.name,
          expiredAt: subscription.expiresAt,
        },
        "Downgraded an expired subscription to the free plan",
      );
    } catch (error) {
      // One org's failure must not strand the rest of the batch.
      log.error({ err: error, orgId: subscription.orgId }, "Could not downgrade an expired org");
    }
  }

  return { downgraded };
}

export async function getSubscription(orgId: string) {
  let sub = (await prisma.subscription.findFirst({
    where: {
      orgId,
    },
    select: {
      orgId: true,
      features: true,
      renewedAt: true,
      expiresAt: true,
      createdAt: true,
      basePlan: {
        select: {
          id: true,
          name: true,
          paymentPlan: {
            select: {
              period: true,
              amount: true,
              currency: true,
            },
          },
          // The four-tier catalog links its Razorpay plans through the cadence-specific
          // relations and leaves the legacy `paymentPlan` null, so a client reading only
          // that one renders no price or billing cycle for anyone on Starter or Pro.
          monthlyPaymentPlan: {
            select: {
              period: true,
              amount: true,
              currency: true,
            },
          },
          yearlyPaymentPlan: {
            select: {
              period: true,
              amount: true,
              currency: true,
            },
          },
          // A tier links a separate Razorpay plan per currency, and an org that checked
          // out in dollars is subscribed to one of these. Omitting them left the client
          // with only the rupee plans to price the subscription from, so a $600/year
          // subscriber was shown ₹48,000/year.
          usdMonthlyPaymentPlan: {
            select: {
              period: true,
              amount: true,
              currency: true,
            },
          },
          usdYearlyPaymentPlan: {
            select: {
              period: true,
              amount: true,
              currency: true,
            },
          },
          stripeProduct: {
            select: {
              interval: true,
              amount: true,
            },
          },
          paymentPlanId: true,
          displayName: true,
        },
      },
      subscriptionRef: true,
      isAnnualMessageLimit: true,
    },
  })) as unknown as Subscription;

  //check if usageStats record exists & update
  if (orgId) await createStats(orgId);
  if (sub) {
    const order = await prisma.order.findFirst({
      where: {
        subscriptionId: sub.subscriptionRef,
      },
      select: {
        shopifyPlanId: true,
      },
    });
    return { ...sub, shopifyPlanId: order?.shopifyPlanId };
  }
  return null;
}

export async function getAllSubscriptions() {
  return await prisma.subscription.findMany({
    include: {
      org: {
        select: {
          name: true,
          id: true,
        },
      },
      basePlan: {
        select: {
          id: true,
          name: true,
          paymentPlanId: true,
        },
      },
    },
    // Subscription has no name of its own, so fall back to newest first.
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function updateSubscription(orgId: string, updatedData: updateSubscriptionInput) {
  return await prisma.subscription.update({
    where: {
      orgId,
    },
    data: {
      ...updatedData,
      lastLimitAlertSentAt: null,
      isAnnualMessageLimit: updatedData?.basePlanId?.length
        ? false
        : updatedData.isAnnualMessageLimit,
    },
  });
}

export async function deleteSubscriptions(orgIds: Array<string>) {
  return await prisma.subscription.deleteMany({
    where: {
      orgId: {
        in: orgIds,
      },
    },
  });
}

export async function hasFeature(orgId: string, featurePath: SubscriptionFeaturePathName) {
  const subscription = await prisma.subscription.findUnique({
    where: {
      orgId: orgId,
    },
  });
  if (
    !subscription ||
    subscription.features === null ||
    typeof subscription.features !== "object"
  ) {
    return false;
  }
  const feature = getNestedProperty<{ active?: boolean }>(subscription.features, featurePath);
  return feature?.active ?? false;
}

export async function getMessageStatsByOrgId(orgId: string, filter: { dateRange?: string }) {
  const { dateRange } = filter;
  const filterArray = [
    `c."orgId" = $1::uuid AND (wm."messageBody"::jsonb)->>'exchangeProcess' = 'send'
        AND (wm."messageBody"::jsonb)->'send'->>'type' = 'template'`,
  ];
  const params = [orgId];
  let paramIndex = 2;
  if (dateRange?.length) {
    const [startDate, endDate] = dateRange?.split(",") || [];
    if (startDate) {
      params.push(dayjs(startDate).startOf("day").toISOString());
      filterArray.push(`wm."waCreatedAt"::DATE >= $${paramIndex++}`);
    }
    if (endDate) {
      params.push(dayjs(endDate).endOf("day").toISOString());
      filterArray.push(`wm."waCreatedAt"::DATE <= $${paramIndex++}`);
    }
  }
  const query = `SELECT COUNT(wm."waCreatedAt")::INTEGER FROM "WaMessage" wm
   JOIN "Contact" c ON wm."contactId" = c.id
   WHERE ${filterArray.join(" AND ")};`;
  const res = await prisma.$queryRawUnsafe<{ count: number }[]>(query, ...params);
  return res[0];
}
