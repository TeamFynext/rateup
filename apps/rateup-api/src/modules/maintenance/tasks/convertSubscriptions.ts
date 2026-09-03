import {
  getEnterpriseSubscriptionFeatures,
  getFreeSubscriptionFeatures,
  isUnlimitedAllowance,
  withContractedCaps,
} from "../../subscription/subscription.data.js";
import prisma from "../../../utils/prisma.js";
import type { TaskContext, TaskOutcome } from "../task.js";

/** The two-argument log the task bodies use, forwarded to the run's collector. */
type Log = (action: string, detail: string) => void;

/** The counts worth naming in the transcript, so a run reads as numbers rather than JSON. */
function allowances(features: unknown) {
  const shape = features as {
    whatsapp?: { conversation?: { count?: { max?: number } } };
    webSurvey?: { count?: { monthlyResponseLimit?: number } };
    team?: { count?: { max?: number } };
  } | null;
  return {
    conversations: shape?.whatsapp?.conversation?.count?.max,
    forms: shape?.webSurvey?.count?.monthlyResponseLimit,
    teams: shape?.team?.count?.max,
  };
}

/** The sentinel reads as "10000000 conversations" otherwise, which nobody can act on. */
const describeCount = (value: number | undefined) =>
  value === undefined ? "—" : isUnlimitedAllowance(value) ? "unlimited" : value.toLocaleString();

const describe = (a: ReturnType<typeof allowances>) =>
  `${describeCount(a.conversations)} conversations / ${describeCount(a.forms)} forms / ` +
  `${describeCount(a.teams)} teams`;

const same = (a: ReturnType<typeof allowances>, b: ReturnType<typeof allowances>) =>
  a.conversations === b.conversations && a.forms === b.forms && a.teams === b.teams;

/**
 * Moves every existing subscription onto the current catalog by the production rule:
 *
 *   Free stays Free, on today's Free numbers. Everything else becomes Enterprise, on the
 *   numbers it already has.
 *
 * Blunt on purpose. The alternative — mapping each org onto the cheapest new tier that
 * covers what it holds today — reprices live customers as a side effect of a data
 * migration, and gets it wrong for anyone on a legacy plan whose name no longer describes
 * what they actually have. Which tier each account really belongs on is then a
 * conversation, not a guess.
 *
 * **Enterprise here is not unlimited.** The tier's own figure is the unlimited sentinel,
 * but writing that would hand every converted org uncapped volume — a migration is no
 * place to give away what nobody agreed to sell. Each org keeps the counts it already
 * runs on, written as a contracted cap (see withContractedCaps), so what the customer can
 * do the day after the migration is exactly what they could do the day before. Only an
 * allowance the old blob did not carry at all falls back to the tier's sentinel, and the
 * transcript says so per org.
 *
 * **Free is rewritten to today's Free.** A legacy free account may have carried more than
 * today's Free allows, so this can take capability away — deliberately: a free tier that
 * still honours numbers the product no longer offers is a pricing hole, and the whole
 * point of the rule is that after it runs, "FREE PLAN" means one thing. Every org whose
 * numbers move is named in the transcript, so a dry run shows exactly who is affected.
 * Their `basePlanId` is re-pointed at the catalog's Free row as well, which matters only
 * where a database carries more than one row named "FREE PLAN": the duplicates stop being
 * referenced, so the plan-keyed paths all resolve to the same tier afterwards.
 *
 * **Only current fields survive.** Each blob is rebuilt from the preset rather than edited
 * in place, so keys the product retired (`menu`, `ticket`, and anything else a legacy row
 * still carries) are dropped instead of being migrated forward forever. The counts are the
 * only thing carried across from the old blob.
 *
 * A subscription with no plan at all is converted like any other: an unplanned row is
 * invisible to every plan-keyed path in the app (add-on eligibility, the expiry sweep,
 * `refresh-plan-features`, the admin plan joins), so leaving it alone leaves it broken.
 * They are counted separately in the transcript, so the run says how many arrived with no
 * plan.
 *
 * A live gateway subscription is **not** cancelled. An org moved to Enterprise that still
 * has one keeps being charged by Razorpay, which is the opposite of "invoiced on usage" —
 * so those are called out individually for someone to deal with deliberately.
 */
export async function convertSubscriptions({
  apply,
  log: emit,
}: TaskContext): Promise<TaskOutcome> {
  const log: Log = (action, detail) => emit(`${action}: ${detail}`);

  const [enterprise, free] = await Promise.all([
    prisma.rateupPlan.findFirst({ where: { name: "ENTERPRISE PLAN" } }),
    prisma.rateupPlan.findFirst({ where: { name: "FREE PLAN" } }),
  ]);
  if (!enterprise) {
    throw new Error("No ENTERPRISE PLAN in the catalog. Seed the plan catalog first.");
  }
  if (!free) {
    throw new Error("No FREE PLAN in the catalog. Seed the plan catalog first.");
  }

  const subscriptions = await prisma.subscription.findMany({
    select: {
      orgId: true,
      basePlanId: true,
      subscriptionRef: true,
      features: true,
      basePlan: { select: { name: true } },
    },
  });

  const enterpriseFeatures = getEnterpriseSubscriptionFeatures();
  const freeFeatures = getFreeSubscriptionFeatures();

  let converted = 0;
  let freeRefreshed = 0;
  let normalised = 0;
  let unplanned = 0;
  const stillBilling: string[] = [];

  for (const subscription of subscriptions) {
    const planName = subscription.basePlan?.name;
    const current = allowances(subscription.features);

    // A null `basePlanId` and a plan row that somehow has no name are the same case: the
    // subscription does not name a tier, so there is nothing to match on below.
    const hasNoPlan = !subscription.basePlanId || !planName;

    if (planName === "FREE PLAN") {
      const next = allowances(freeFeatures);
      freeRefreshed++;
      log(
        "free",
        same(current, next)
          ? `${subscription.orgId} already on today's Free (${describe(next)})`
          : `${subscription.orgId} ${describe(current)} → ${describe(next)}`,
      );

      if (apply) {
        await prisma.subscription.update({
          where: { orgId: subscription.orgId },
          data: { features: freeFeatures as never, basePlanId: free.id },
        });
      }
      continue;
    }

    // Enterprise keeps the counts the org already has; only the shape is normalised, so a
    // legacy blob loses its retired keys without anyone's allowance moving.
    const features = withContractedCaps(enterpriseFeatures, subscription.features);
    const next = allowances(features);

    if (planName === "ENTERPRISE PLAN") {
      normalised++;
      log("normalised", `${subscription.orgId} stays on ${describe(next)}; legacy fields dropped`);
      if (apply) {
        await prisma.subscription.update({
          where: { orgId: subscription.orgId },
          data: { features: features as never },
        });
      }
      continue;
    }

    if (hasNoPlan) unplanned++;

    if (subscription.subscriptionRef?.startsWith("sub_")) {
      stillBilling.push(subscription.orgId);
      log(
        "still billing",
        `${subscription.orgId} — Razorpay ${subscription.subscriptionRef} is live and is NOT cancelled by this task`,
      );
    }

    log(
      subscription.orgId,
      `${hasNoPlan ? "no plan" : `"${planName}"`} -> Enterprise, keeping ${describe(next)}`,
    );
    converted++;

    if (!apply) continue;

    await prisma.subscription.update({
      where: { orgId: subscription.orgId },
      data: {
        basePlanId: enterprise.id,
        features: features as never,
        // Enterprise is sold and renewed by conversation, and the expiry sweep exempts it,
        // so a date here means nothing. A far-future one keeps `checkExpiry` from showing
        // a contracted account as expired mid-migration.
        expiresAt: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000),
        lastLimitAlertSentAt: null,
      },
    });
  }

  if (unplanned > 0) {
    log("no plan", `${unplanned} of the converted org(s) arrived with no plan at all`);
  }
  if (stillBilling.length > 0) {
    log(
      "action needed",
      `${stillBilling.length} converted org(s) still have a live Razorpay subscription — cancel them or they keep being charged`,
    );
  }

  return {
    summary:
      `${apply ? "Moved" : "Would move"} ${converted} org(s) to Enterprise on their existing ` +
      `counts; ${freeRefreshed} refreshed to today's Free; ${normalised} already on Enterprise ` +
      `normalised` +
      (stillBilling.length > 0 ? `; ${stillBilling.length} still billing via Razorpay.` : "."),
    details: { converted, freeRefreshed, normalised, unplanned, stillBilling },
  };
}
