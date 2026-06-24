import dayjs from "dayjs";
import prisma from "../../utils/prisma.js";
import { FreePlanSubscriptionFeatures, getFreeSubscriptionFeatures } from "./subscription.data.js";
import { updateSubscriptionInput } from "./subscription.schema.js";
import { PaymentPlanType } from "../../../generated/prisma/client.js";
import { createStats } from "../stats/stats.service.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { getNestedProperty } from "../../utils/misc/obj.utils.js";
import merge from "lodash/merge.js";

export async function createFreePlanSubscription(
  orgId: string,
  pClient = prisma,
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
  }
  if (!planId || !rateupPlan) {
    // Check if the FREE PLAN plan exists  -- was earlier RATEUP TRIAL
    let rateupFreePlan = await pClient.rateupPlan.findFirst({
      where: {
        name: "FREE PLAN",
      },
    });

    let freePlanDescription = [
      "1 Team & 1 User",
      "1 WhatsApp Automation",
      "1K Template Messages",
      "1K Automation Triggers",
      "Omnichannel inbox - WhatsApp + Instagram",
      "100 web surveys & 100000 responses",
      "WhatsApp Catalog",
      "AI Summary",
      "Reports & Analytics",
      "Basic CX analytics",
      "Website widget",
      "QR Code Generator",
      "Integration - Google Sheet+ MS Excel+ Shopify",
      "API Integration",
      "Customer issue escalation & Ticketing",
    ];

    if (!rateupFreePlan) {
      rateupFreePlan = await pClient.rateupPlan.create({
        data: {
          name: "FREE PLAN",
          displayName: "FREE PLAN",
          planType: PaymentPlanType.BASE,
          description: freePlanDescription,
          features: FreePlanSubscriptionFeatures as any,
        },
      });
    }

    rateupPlan = rateupFreePlan;
  }
  let finalFeatures;
  if (planId && rateupPlan) {
    // Paid/custom plan
    finalFeatures = overrides ? merge({}, rateupPlan.features, overrides) : rateupPlan.features;
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
  if (!subscription || typeof subscription.features !== "object") return false;
  console.log(getNestedProperty(subscription.features, featurePath));
  return getNestedProperty(subscription.features, featurePath).active;
}

export async function getMessageStatsByOrgId(orgId, filter) {
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
  const res = await prisma.$queryRawUnsafe(query, ...params);
  return res[0];
}
