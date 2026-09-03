import { CATALOG_TIERS } from "../../subscription/catalog.js";
import {
  hasContractedCap,
  isUnlimitedAllowance,
  withContractedCaps,
} from "../../subscription/subscription.data.js";
import prisma from "../../../utils/prisma.js";
import type { TaskContext, TaskOutcome } from "../task.js";

/** The two-argument log the task bodies use, forwarded to the run's collector. */
type Log = (action: string, detail: string) => void;

/** The two metered allowances, pulled out so the transcript reads as numbers, not JSON. */
function allowances(features: unknown) {
  const shape = features as {
    whatsapp?: { conversation?: { count?: { max?: number } } };
    webSurvey?: { count?: { monthlyResponseLimit?: number } };
  } | null;
  return {
    conversations: shape?.whatsapp?.conversation?.count?.max,
    forms: shape?.webSurvey?.count?.monthlyResponseLimit,
  };
}

/** The sentinel reads as "10000000 conversations" otherwise, which nobody can act on. */
const describeCount = (value: number | undefined) =>
  value === undefined ? "—" : isUnlimitedAllowance(value) ? "unlimited" : value.toLocaleString();

const describeAllowances = (a: ReturnType<typeof allowances>) =>
  `${describeCount(a.conversations)} conversations / ${describeCount(a.forms)} forms`;

const sameAllowances = (a: ReturnType<typeof allowances>, b: ReturnType<typeof allowances>) =>
  a.conversations === b.conversations && a.forms === b.forms;

/**
 * Re-applies the catalog definition to each tier row and to every org on that tier.
 *
 * Two kinds of drift, both fixed here. Changing a limit in `subscription.data.ts` changes
 * it only for *future* grants — the tier row stores a features blob, and every
 * subscription stores its own copy taken when the plan was granted, so a customer keeps
 * whatever they were given until their next renewal writes a fresh one. And the card copy
 * (`description`) is stored per tier, so it goes stale the same way: after the four-tier
 * rename, Max still advertised "Everything in Starter" long after Starter was gone.
 *
 * **It replaces the whole blob**, so a per-org override an admin hand-tuned is lost —
 * with one exception. An Enterprise account that has a *contracted cap* (a real number
 * where the tier carries the unlimited sentinel) keeps that number: the ceiling was
 * agreed with that customer and lives on their subscription, so re-applying the catalog
 * over it would hand them unlimited volume back with nothing to say it had happened. Such
 * an org still takes the tier's gates and its uncapped counts; see withContractedCaps.
 *
 * The transcript names every org whose allowance moves, and by how much, so a dry run
 * shows exactly who is affected before anything is written.
 */
export async function refreshPlanFeatures({ apply, log: emit }: TaskContext): Promise<TaskOutcome> {
  const log: Log = (action, detail) => emit(`${action}: ${detail}`);

  let tiersUpdated = 0;
  let orgsUpdated = 0;

  for (const definition of CATALOG_TIERS) {
    const tier = await prisma.rateupPlan.findFirst({ where: { name: definition.name } });
    if (!tier) {
      log("skipped", `no "${definition.name}" in the catalog`);
      continue;
    }

    const next = definition.features;
    const nextAllowances = allowances(next);
    const tierAllowances = allowances(tier.features);

    if (sameAllowances(tierAllowances, nextAllowances)) {
      log("tier", `${definition.name} already current (${describeAllowances(nextAllowances)})`);
    } else {
      log(
        "tier",
        `${definition.name} ${describeAllowances(tierAllowances)} → ${describeAllowances(nextAllowances)}`,
      );
    }

    const nextUsd = definition.salesLed ? null : definition.usdYearly;
    if (tier.usdYearlyPrice !== nextUsd) {
      log("usd", `${definition.name} ${tier.usdYearlyPrice ?? "—"} → ${nextUsd ?? "—"} / year`);
    }

    // The card copy is stored per tier and drifts independently of the limits it quotes.
    const staleBullets = tier.description.filter(
      (bullet, index) => definition.description[index] !== bullet,
    );
    if (staleBullets.length > 0 || tier.description.length !== definition.description.length) {
      log("copy", `${definition.name} → ${definition.description.join(" · ")}`);
    }
    tiersUpdated++;

    const subscriptions = await prisma.subscription.findMany({
      where: { basePlanId: tier.id },
      select: { orgId: true, features: true },
    });

    // Orgs whose contracted cap has to survive the refresh, written one at a time; the
    // rest still go out in the single updateMany below.
    const contracted: { orgId: string; features: unknown }[] = [];

    for (const subscription of subscriptions) {
      const current = allowances(subscription.features);

      if (hasContractedCap(next, subscription.features)) {
        const kept = withContractedCaps(next, subscription.features);
        contracted.push({ orgId: subscription.orgId, features: kept });
        log(
          "kept",
          `${subscription.orgId} is contracted at ${describeAllowances(allowances(kept))} — ` +
            "left capped rather than reset to unlimited",
        );
      } else if (!sameAllowances(current, nextAllowances)) {
        log(
          "org",
          `${subscription.orgId} ${describeAllowances(current)} → ${describeAllowances(nextAllowances)}`,
        );
      }
      orgsUpdated++;
    }

    if (!apply) continue;

    await prisma.rateupPlan.update({
      where: { id: tier.id },
      data: {
        features: next as never,
        description: definition.description,
        displayName: definition.displayName,
        badge: definition.badge ?? null,
        // Sales-led tiers carry no list price in either currency.
        usdMonthlyPrice: definition.salesLed ? null : definition.usdMonthly,
        usdYearlyPrice: definition.salesLed ? null : definition.usdYearly,
      },
    });
    await prisma.subscription.updateMany({
      where: {
        basePlanId: tier.id,
        orgId: { notIn: contracted.map((row) => row.orgId) },
      },
      data: { features: next as never },
    });
    for (const row of contracted) {
      await prisma.subscription.update({
        where: { orgId: row.orgId },
        data: { features: row.features as never },
      });
    }
  }

  return {
    summary:
      `${apply ? "Refreshed" : "Would refresh"} ${tiersUpdated} tier(s) ` +
      `and ${orgsUpdated} subscription(s) to the current presets.`,
    details: { tiers: tiersUpdated, subscriptions: orgsUpdated },
  };
}
