import prisma from "../../../utils/prisma.js";
import { currentPeriodStart, periodKey } from "../../subscription/billingPeriod.js";
import { CATALOG_TIERS, type TierSpec } from "../../subscription/catalog.js";
import { isUnlimitedAllowance } from "../../subscription/subscription.data.js";
import type { TaskContext, TaskOutcome } from "../task.js";

type Blob = Record<string, any>;

function tierByName(name: string | null | undefined): TierSpec | undefined {
  return CATALOG_TIERS.find((tier) => tier.name === name);
}

/**
 * The catalog tier an off-catalog plan is closest to, by the conversation allowance it had:
 * the smallest tier that allowed at least as many. Anything above Max stays uncapped.
 */
function tierForLegacyConversations(max: number | undefined): TierSpec {
  const byName = (name: string) => CATALOG_TIERS.find((tier) => tier.name === name)!;
  if (max === undefined || isUnlimitedAllowance(max)) return byName("ENTERPRISE PLAN");
  if (max <= 100) return byName("FREE PLAN");
  if (max <= 5_000) return byName("PLUS PLAN");
  if (max <= 20_000) return byName("PRO PLAN");
  if (max <= 50_000) return byName("MAX PLAN");
  return byName("ENTERPRISE PLAN");
}

/**
 * The stored blob moved onto the new meters. Only the keys the repricing changed are
 * written — the two meters, seats and teams, and the Meta Business Agent gate — so staff
 * overrides on anything else survive.
 */
function migrateFeatures(stored: Blob, tier: TierSpec): Blob {
  const next: Blob = structuredClone(stored ?? {});
  const tierFeatures = tier.features as unknown as Blob;
  next.whatsapp = { ...next.whatsapp };
  delete next.whatsapp.conversation;
  next.whatsapp.activeContacts = structuredClone(tierFeatures.whatsapp.activeContacts);
  next.whatsapp.campaignCredits = structuredClone(tierFeatures.whatsapp.campaignCredits);
  next.team = structuredClone(tierFeatures.team);
  next.ai = { ...next.ai, active: tierFeatures.ai.active };
  return next;
}

/**
 * Moves every org onto active-contact pricing and backfills this month, so the switch is
 * immediate rather than starting each org at zero.
 *
 * 1. Rewrites `Subscription.features`: the conversation allowance goes, the active-contact
 *    and campaign-credit allowances of the org's tier come in. An Enterprise org with a
 *    contracted conversation cap is listed, not converted — staff set its new caps.
 * 2. Backfills `ActiveContact` for the current month from the metered conversation windows:
 *    a contact counts when it wrote in, or got a message that was not a campaign send.
 * 3. Recounts the month's counters from those rows and from campaign messages sent.
 *
 * Run `seed-plans` and `seed-addons` first, so the tier rows carry the new catalog.
 * Idempotent: the backfill skips rows that exist, and the counters are recounted.
 */
export async function migrateActiveContactPricing({
  apply,
  log,
}: TaskContext): Promise<TaskOutcome> {
  const period = currentPeriodStart();
  const subscriptions = await prisma.subscription.findMany({
    select: { orgId: true, features: true, basePlan: { select: { name: true } } },
  });

  let migrated = 0;
  const contracted: string[] = [];
  const offCatalog: string[] = [];

  for (const subscription of subscriptions) {
    const stored = (subscription.features ?? {}) as Blob;
    const legacyMax = stored.whatsapp?.conversation?.count?.max as number | undefined;
    let tier = tierByName(subscription.basePlan?.name);

    if (tier?.name === "ENTERPRISE PLAN" && legacyMax && !isUnlimitedAllowance(legacyMax)) {
      contracted.push(subscription.orgId);
      log(
        `contracted cap left for staff: org ${subscription.orgId} had ${legacyMax} conversations`,
      );
    }
    if (!tier) {
      tier = tierForLegacyConversations(legacyMax);
      offCatalog.push(subscription.orgId);
      log(
        `off-catalog plan "${subscription.basePlan?.name ?? "none"}" on org ${subscription.orgId}: ` +
          `${legacyMax ?? "no"} conversations → ${tier.displayName} allowances`,
      );
    }

    const next = migrateFeatures(stored, tier);
    if (JSON.stringify(next) === JSON.stringify(stored)) continue;
    migrated++;
    if (apply) {
      await prisma.subscription.update({
        where: { orgId: subscription.orgId },
        data: { features: next as LegacySubscriptionFeatures },
      });
    }
  }
  log(`${apply ? "rewrote" : "would rewrite"} features on ${migrated} subscription(s)`);

  const activeContactSource = `
    FROM "MeteredConversation" mc
    WHERE mc."lastMessageAt" >= $1::date
      AND mc."contactId" IS NOT NULL
      AND (
        mc."inboundCount" > 0
        OR EXISTS (
          SELECT 1 FROM "WaMessage" w
          WHERE w."meteredConversationId" = mc."id"
            AND NOT EXISTS (
              SELECT 1 FROM "WaMessageCampaginParticipantMap" m WHERE m."waMessageId" = w."id"
            )
        )
      )`;

  let contactsBackfilled = 0;
  if (apply) {
    contactsBackfilled = await prisma.$executeRawUnsafe(
      `INSERT INTO "ActiveContact" (
         "orgId", "periodStart", "contactKey", "contactId", "platform", "customerId",
         "firstActiveAt", "reason"
       )
       SELECT DISTINCT ON (mc."orgId", mc."contactId")
         mc."orgId", $1::date, mc."contactId"::text, mc."contactId", mc."platform",
         CASE WHEN mc."platform" = 'WHATSAPP'
           THEN COALESCE(NULLIF(regexp_replace(mc."customerId", '\\D', '', 'g'), ''), mc."customerId")
           ELSE mc."customerId" END,
         mc."openedAt",
         (CASE WHEN mc."inboundCount" > 0 THEN 'INBOUND' ELSE 'OUTBOUND' END)::"ActiveContactReason"
       ${activeContactSource}
       ORDER BY mc."orgId", mc."contactId", mc."openedAt"
       ON CONFLICT ("orgId", "periodStart", "contactKey") DO NOTHING`,
      periodKey(period),
    );

    await prisma.$executeRawUnsafe(
      `INSERT INTO "UsageStats" ("orgId", "updatedAt", "activeContactsCount", "activeContactsPeriodStart")
       SELECT "orgId", now(), COUNT(*)::int, $1::date FROM "ActiveContact"
       WHERE "periodStart" = $1::date GROUP BY "orgId"
       ON CONFLICT ("orgId") DO UPDATE SET
         "activeContactsCount" = EXCLUDED."activeContactsCount",
         "activeContactsPeriodStart" = EXCLUDED."activeContactsPeriodStart",
         "updatedAt" = now()`,
      periodKey(period),
    );

    await prisma.$executeRawUnsafe(
      `INSERT INTO "UsageStats" ("orgId", "updatedAt", "campaignCreditsUsed", "campaignCreditsPeriodStart")
       SELECT c."orgId", now(), COUNT(*)::int, $1::date
       FROM "WaMessageCampaginParticipantMap" m
       JOIN "WaMessage" w ON w."id" = m."waMessageId"
       JOIN "Contact" c ON c."id" = w."contactId"
       WHERE w."createdAt" >= $1::date
       GROUP BY c."orgId"
       ON CONFLICT ("orgId") DO UPDATE SET
         "campaignCreditsUsed" = EXCLUDED."campaignCreditsUsed",
         "campaignCreditsPeriodStart" = EXCLUDED."campaignCreditsPeriodStart",
         "updatedAt" = now()`,
      periodKey(period),
    );
  } else {
    const [row] = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT COUNT(*)::int AS count FROM (
         SELECT DISTINCT mc."orgId", mc."contactId" ${activeContactSource}
       ) t`,
      periodKey(period),
    );
    contactsBackfilled = Number(row?.count ?? 0);
  }
  log(
    `${apply ? "backfilled" : "would backfill"} ${contactsBackfilled} active contact(s) for ` +
      period.toISOString().slice(0, 10),
  );

  return {
    summary:
      `${apply ? "Moved" : "Would move"} ${migrated} subscription(s) to active-contact pricing ` +
      `and backfilled ${contactsBackfilled} active contact(s). ` +
      `${contracted.length} contracted Enterprise org(s) need caps set by hand.`,
    details: { migrated, contactsBackfilled, contracted, offCatalog },
  };
}

/**
 * Moves every live gateway subscription onto its tier's new price from its next cycle,
 * keeping currency and cadence. Run after `seed-plans` has linked the tiers to the new
 * gateway plans. Shopify charges cannot be repriced without the merchant approving them,
 * so those orgs are listed. A failure is logged and the run carries on; a re-run skips
 * subscriptions already on the new price.
 */
export async function repriceSubscriptions({ apply, log }: TaskContext): Promise<TaskOutcome> {
  const { repriceRazorpaySubscription } = await import("../../payment/payment.service.js");
  const { repriceStripeSubscription } = await import("../../payment/stripe/stripe.service.js");

  const subscriptions = await prisma.subscription.findMany({
    where: { subscriptionRef: { not: null }, basePlan: { planType: "BASE" } },
    select: {
      orgId: true,
      subscriptionRef: true,
      basePlan: { select: { id: true, name: true, displayName: true } },
    },
  });

  const moved: string[] = [];
  const unchanged: string[] = [];
  const failed: Array<{ orgId: string; error: string }> = [];
  const shopify: string[] = [];

  for (const subscription of subscriptions) {
    const ref = subscription.subscriptionRef!;
    const tier = tierByName(subscription.basePlan?.name);
    if (!tier || tier.salesLed || !subscription.basePlan) continue;

    const order = await prisma.order.findFirst({
      where: { OR: [{ subscriptionId: ref }, { shopifyPlanId: ref }] },
      select: { planId: true, priceId: true, shopifyPlanId: true },
    });

    try {
      if (order?.shopifyPlanId) {
        shopify.push(subscription.orgId);
        log(`shopify org ${subscription.orgId}: keeps its price until it approves a new charge`);
        continue;
      }

      if (order?.priceId) {
        const current = await prisma.stripeProducts.findFirst({
          where: { priceId: order.priceId },
        });
        const cadence = current?.interval === "year" ? "YEARLY" : "MONTHLY";
        const target = await prisma.stripeProducts.findFirst({
          where: { name: `RATEUP_${tier.displayName.toUpperCase()}_${cadence}` },
        });
        if (!target) throw new Error(`no Stripe price for ${tier.displayName} ${cadence}`);
        if (target.priceId === order.priceId) {
          unchanged.push(subscription.orgId);
          continue;
        }
        if (apply) await repriceStripeSubscription(ref, target.priceId);
        moved.push(subscription.orgId);
        log(`${apply ? "moved" : "would move"} stripe ${ref} → ${target.priceId}`);
        continue;
      }

      if (!apply) {
        moved.push(subscription.orgId);
        log(`would move razorpay ${ref} (${tier.displayName}) at cycle end`);
        continue;
      }
      const result = await repriceRazorpaySubscription(ref, subscription.basePlan.id);
      if (result.changed) {
        moved.push(subscription.orgId);
        log(`moved razorpay ${ref}: ${result.from ?? "?"} → ${result.planId} at cycle end`);
      } else {
        unchanged.push(subscription.orgId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failed.push({ orgId: subscription.orgId, error: message });
      log(`failed org ${subscription.orgId} (${ref}): ${message}`);
    }
  }

  return {
    summary:
      `${apply ? "Moved" : "Would move"} ${moved.length} subscription(s) to new prices from ` +
      `their next cycle; ${unchanged.length} already there, ${failed.length} failed, ` +
      `${shopify.length} on Shopify need re-approval.`,
    details: { moved, unchanged, failed, shopify },
  };
}
