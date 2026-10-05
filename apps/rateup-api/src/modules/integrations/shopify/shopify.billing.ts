import prisma from "../../../utils/prisma.js";
import shopify from "./shopify.config.js";
import { getActiveShopifySession } from "./shopify.session.js";
import { notificationQueue } from "../../../workers/bullmq/queues/index.js";
import { log } from "../../../utils/logger.js";
import {
  PaymentSource,
  ShopifyPlanMap,
  shopifyRecurringChargeStatus,
  shopifyRecurringChargeSubscriptionStatusMap,
} from "./shopify.util.js";
import {
  OrderStatus,
  Org,
  PaymentStatus,
  RateupPlan,
  SubscriptionStatus,
} from "../../../../generated/prisma/client.js";
import { getSubscription } from "../../subscription/subscription.service.js";
import dayjs from "dayjs";
import { createEmailBodySubscriptionActivated } from "../../../utils/email/payments/subscriptionActivated.js";
import { getShopifyIntegrationByShop } from "./shopify.credential.js";

export interface ShopifyAppSubscriptionWebhookPayload {
  name?: string;
  app_subscription?: {
    name?: string;
    admin_graphql_api_id?: string;
    status?: shopifyRecurringChargeStatus;
  };
}

interface ShopifyShopDetails {
  name?: string;
  email?: string;
  phone?: string;
}

export async function handleSubscriptionUpdateFromShopify(
  shop: string,
  payload: ShopifyAppSubscriptionWebhookPayload,
) {
  if (!shopify) throw new Error("Shopify integration is not configured");
  const integration = await getShopifyIntegrationByShop(shop);
  const subscription = await getSubscription(integration.orgId);
  if (!subscription) {
    throw new Error(`No subscription found for orgId ${integration.orgId}`);
  }
  let rateupPlan;
  if (payload?.app_subscription?.name === "FREE PLAN") {
    rateupPlan = await prisma.rateupPlan.findFirst({
      where: {
        name: "FREE PLAN",
      },
    });
  } else {
    rateupPlan = await prisma.rateupPlan.findFirst({
      where: {
        displayName: payload?.app_subscription?.name,
        name: {
          contains: "WhatsApp",
        },
      },
    });
  }

  const currentPlanInRateup = subscription.basePlan.displayName;
  const chargeId = payload.app_subscription?.admin_graphql_api_id ?? "";

  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(integration),
  });
  const recurringCharge = await getRecurringCharge(chargeId, integration);

  let haltSubscription = false;

  const shopResponse = await client.request<{
    shop: { name?: string; email?: string; shopAddress?: { phone?: string | null } };
  }>(`query { shop { name, email, shopAddress { phone } } } `);
  if (!shopResponse.data) throw new Error("Shopify shop query returned no data");
  const { shopAddress, ...shopFields } = shopResponse.data.shop;
  const shopDetails: ShopifyShopDetails = {
    ...shopFields,
    phone: shopAddress?.phone ?? undefined,
  };

  switch (payload.app_subscription?.status) {
    case shopifyRecurringChargeStatus.pending:
      if (!rateupPlan) throw new Error("RateupPlan not found for pending Shopify subscription");
      await prisma.order.create({
        data: {
          name: payload?.app_subscription?.name ?? "Unknown Shopify Plan",
          createdById: integration.org.ownerId,
          orgId: integration.orgId,
          subscriptionId: chargeId,
          rateupPlanId: rateupPlan.id,
          subscriptionStatus: SubscriptionStatus.pending,
          shopifyPlanId: Object.values(ShopifyPlanMap)
            .find((plan) => plan.name === payload?.app_subscription?.name)
            ?.id?.toString(),
        },
      });
      break;
    case shopifyRecurringChargeStatus.declined:
      haltSubscription = true;
      break;
    case shopifyRecurringChargeStatus.active:
      if (!recurringCharge) {
        throw new Error(`Recurring charge ${chargeId} not found on Shopify`);
      }
      if (!rateupPlan) throw new Error("RateupPlan not found for active Shopify subscription");
      // BUG (fixed): this call was missing `await` — the switch fell through to
      // `break` immediately, so any error thrown while activating the
      // subscription (DB writes, email send) became an unhandled promise
      // rejection instead of surfacing to this function's caller.
      await activateSubscriptionThroughShopify(
        recurringCharge,
        integration,
        chargeId,
        rateupPlan,
        shopDetails,
      );
      break;
    case shopifyRecurringChargeStatus.cancelled:
      if (currentPlanInRateup === payload?.app_subscription.name) {
        const order = await prisma.order.findUnique({
          where: {
            subscriptionId: chargeId,
          },
        });
        if (order) {
          const _subscriptionStatus = await prisma.order.update({
            data: {
              subscriptionStatus: SubscriptionStatus.cancelled,
              subscriptionEndedAt: new Date(),
            },
            where: {
              subscriptionId: chargeId,
            },
          });
        }
      }
      break;
    case shopifyRecurringChargeStatus.expired:
      haltSubscription = true;
      break;
    case shopifyRecurringChargeStatus.frozen:
      await prisma.order.update({
        where: {
          subscriptionId: chargeId,
        },
        data: {
          subscriptionStatus: SubscriptionStatus.pending,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        },
      });
      break;
    default:
      if (!rateupPlan) throw new Error("RateupPlan not found for Shopify subscription update");
      await prisma.order.create({
        data: {
          name: payload?.name ?? "Unknown Shopify Plan",
          createdById: integration.org.ownerId,
          orgId: integration.orgId,
          subscriptionId: chargeId,
          rateupPlanId: rateupPlan.id,
          subscriptionStatus: SubscriptionStatus.none,
          shopifyPlanId: Object.values(ShopifyPlanMap)
            .find((plan) => plan.name === payload?.app_subscription?.name)
            ?.id?.toString(),
        },
      });
      break;
  }

  if (haltSubscription) {
    const _order = await prisma.order.update({
      where: {
        subscriptionId: chargeId,
      },
      data: {
        subscriptionStatus: SubscriptionStatus.halted,
        status: OrderStatus.FAILED,
        paymentStatus: PaymentStatus.FAILED,
      },
    });
  }
}

async function activateSubscriptionThroughShopify(
  recurringCharge: ShopifyRecurringCharge,
  integration: ShopifyIntegration & { org: Org },
  chargeId: string,
  rateupPlan: RateupPlan,
  shopDetails: ShopifyShopDetails,
) {
  const data = {
    name: recurringCharge.name,
    createdById: integration.org.ownerId,
    orgId: integration.orgId,
    rateupPlanId: rateupPlan.id,
    subscriptionStatus: shopifyRecurringChargeSubscriptionStatusMap[recurringCharge.status],
    subscriptionChargeAt: recurringCharge.currentPeriodEnd
      ? new Date(recurringCharge.currentPeriodEnd)
      : null,
    shopifyPlanId: Object.values(ShopifyPlanMap)
      .find((plan) => plan.name === recurringCharge.name)
      ?.id?.toString(),
  };
  const order = await prisma.order.upsert({
    where: {
      subscriptionId: chargeId,
    },
    create: {
      ...data,
      subscriptionId: chargeId,
    },
    update: data,
  });
  if (recurringCharge.name !== "FREE PLAN") {
    const _payment = await prisma.payments.create({
      data: {
        payId: chargeId,
        amount: Number(recurringCharge?.lineItems[0].plan.pricingDetails.price.amount),
        currency: recurringCharge?.lineItems[0].plan.pricingDetails.price.currencyCode,
        method: PaymentSource.Shopify,
        description: "Subscription activated through shopify",
        customer_email: shopDetails.email || "",
        customer_phone: shopDetails.phone || "",
        rateupOrderId: order.id,
        createdAt: Math.floor(new Date(recurringCharge.createdAt).getTime() / 1000),
      },
    });
  }
  const expiresAt = dayjs(recurringCharge.createdAt).add(29, "days").toDate();
  const _updatedSubscription = await prisma.subscription.update({
    where: { orgId: integration?.orgId },
    data: {
      basePlanId: rateupPlan?.id,
      // RateupPlan.features is nullable but Subscription.features is not; an empty blob
      // migrates to the safe defaults (see migrateFeaturesToCurrentSchema).
      features: rateupPlan.features ?? {},
      renewedAt: new Date(),
      expiresAt,
      subscriptionRef: chargeId,
      lastLimitAlertSentAt: null,
    },
  });

  const updatedOrder = await prisma.order.update({
    where: {
      id: order.id,
    },
    data: {
      status: OrderStatus.COMPLETE,
      paymentStatus: recurringCharge.name === "FREE PLAN" ? undefined : PaymentStatus.SUCCESS,
    },
  });

  if (updatedOrder) {
    log.info("sending email..");
    const user = await prisma.user.findUnique({
      where: {
        id: integration.org.ownerId,
      },
    });
    if (!user) throw new Error(`User not found for ownerId ${integration.org.ownerId}`);

    const msg = {
      to: user.email,
      subject: "Rateup Subscription Activated - Rateup.app",
      text: `Your subscription from shopify for the Rateup ${recurringCharge.name} has activated`,
      html: await createEmailBodySubscriptionActivated(
        rateupPlan.displayName ?? rateupPlan.name,
        expiresAt,
      ),
    };
    try {
      await notificationQueue.add("notification", {
        emailData: msg,
      });
    } catch (error) {
      console.error(error);
      throw new Error("Email sending failed. E:" + error);
    }
  }
}

interface ShopifyRecurringCharge {
  id: string;
  name: string;
  status: shopifyRecurringChargeStatus;
  createdAt: string;
  currentPeriodEnd: string | null;
  lineItems: {
    plan: {
      pricingDetails: {
        interval?: string;
        price: { amount: string; currencyCode: string };
      };
    };
  }[];
}

export async function getRecurringCharge(
  chargeId: string,
  // Only the session is read below — `org` was an over-tight
  // requirement inherited from one particular caller
  // (`getShopifyIntegrationByShop`); `getShopifyInfo`'s callers don't have it.
  integration: ShopifyIntegration | null,
): Promise<ShopifyRecurringCharge | null> {
  if (!integration) return null;
  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(integration),
  });
  const appSubscriptions = await client.request<{ node: ShopifyRecurringCharge | null }>(
    `query GetRecurringApplicationCharges($id: ID!) {
  node(id: $id) {
        ...on AppSubscription {
      createdAt
      currentPeriodEnd
      id
      name
      status
          lineItems {
            plan {
              pricingDetails {
                ...on AppRecurringPricing {
              interval
                  price {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  }
} `,
    { variables: { id: chargeId } },
  );
  return appSubscriptions.data?.node ?? null;
}
