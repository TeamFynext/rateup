/**
 * Moves the catalog from the four-tier ladder (Free / Starter / Pro / Enterprise) to the
 * five-tier one (Free / Plus / Pro / Max / Enterprise).
 *
 *
 * The mapping, and why it is a rename rather than a rebuild:
 *
 *   STARTER PLAN  →  PLUS PLAN   (₹2,000/mo equivalent, 10,000 — unchanged)
 *   PRO PLAN      →  MAX PLAN    (₹9,000/mo equivalent, 100,000 — unchanged)
 *   (new)            PRO PLAN    (₹5,000/mo equivalent, 40,000)
 *
 * Renaming keeps the row's id, so every subscription and order that points at it follows
 * automatically and no customer's price or allowance moves. Creating fresh rows instead
 * would strand them on tiers that had quietly left the catalog.
 *
 * **The name `PRO PLAN` changes meaning.** It used to be the top paid tier at ₹9,000; it
 * is now the middle rung at ₹5,000. Nothing in the app gates on plan names — entitlements
 * come from the stored `features` blob and billing from the linked gateway plan — so the
 * rename is safe, but any external report or dashboard keyed on the string will now be
 * reading a different tier. That is the one thing to check before running this on
 * production.
 *
 * Idempotent: reruns detect the new shape and do nothing.
 */
import { PaymentPlanType } from "../../../../generated/prisma/client.js";
import { RazorpayInstance } from "../../../utils/payment/razorpay.js";
import prisma from "../../../utils/prisma.js";
import { CATALOG_TIERS, type TierSpec } from "../../subscription/catalog.js";
import type { TaskContext, TaskOutcome } from "../task.js";

/** The two-argument log the task bodies use, forwarded to the run's collector. */
type Log = (action: string, detail: string) => void;

/**
 * Names a dry run has decided to rename away. Under `--apply` the rename has already
 * happened by the time the tier is seeded; a dry run writes nothing, so it has to
 * remember the same fact or it reports a collision that would never occur.
 */
const renamedAway = new Set<string>();

/** The new middle rung. Prices follow the catalog convention: yearly is the headline,
 *  monthly is the annual monthly-equivalent x 1.20. */
/**
 * The new middle rung, taken from the one catalog definition so its copy and limits cannot
 * drift from what the seed and refresh tasks write. Prices follow the catalog convention:
 * yearly is the headline, monthly is the annual monthly-equivalent x 1.20.
 */
function requireTier(name: string): TierSpec {
  const tier = CATALOG_TIERS.find((entry) => entry.name === name);
  if (!tier) throw new Error(`${name} is missing from the catalog definition`);
  return tier;
}

const PRO = requireTier("PRO PLAN");

/**
 * Renames the local mirror of a gateway plan.
 *
 * These rows are matched by name when seeding, so the ₹108,000 plan has to stop being
 * called RATEUP_PRO_* before the new ₹60,000 Pro can take that name — otherwise the new
 * middle tier links the old top-tier plan and every Pro subscriber is billed ₹108,000.
 * Only the local `name` changes: `planId` still points at the same Razorpay plan, so live
 * subscriptions bill exactly as before.
 */
async function renameGatewayPlan(from: string, to: string, apply: boolean, log: Log) {
  const existing = await prisma.paymentPlans.findFirst({ where: { name: from } });
  if (!existing) {
    log("skip gateway rename", `no "${from}"`);
    return;
  }
  if (!apply) {
    renamedAway.add(from);
    log("would rename gateway plan", `${from} → ${to} (₹${existing.amount}, ${existing.planId})`);
    return;
  }
  await prisma.paymentPlans.update({ where: { id: existing.id }, data: { name: to } });
  log("renamed gateway plan", `${from} → ${to} (₹${existing.amount})`);
}

/** Renames a tier in place, keeping its id, gateway links, price and customers. */
async function rename(from: string, to: string, displayName: string, apply: boolean, log: Log) {
  const existing = await prisma.rateupPlan.findFirst({ where: { name: from } });
  if (!existing) {
    log("skip rename", `no "${from}" tier — already renamed, or a fresh database`);
    return;
  }
  if (!apply) {
    renamedAway.add(from);
    log("would rename", `${from} → ${to} (id ${existing.id}, customers keep their price)`);
    return;
  }
  await prisma.rateupPlan.update({
    where: { id: existing.id },
    data: { name: to, displayName },
  });
  log("renamed", `${from} → ${to} (id ${existing.id})`);
}

/** Razorpay plans are priced in paise, and a plan id is scoped to the account that made it. */
async function ensureGatewayPlan(
  name: string,
  amountInr: number,
  period: "monthly" | "yearly",
  apply: boolean,
  log: Log,
) {
  const existing = renamedAway.has(name)
    ? null
    : await prisma.paymentPlans.findFirst({ where: { name } });
  if (existing) {
    if (existing.amount !== amountInr) {
      // Reusing a same-named plan at a different price is how a tier ends up billing
      // someone else's amount. Refuse rather than link it.
      throw new Error(
        `${name} already exists at ₹${existing.amount}, not ₹${amountInr}. ` +
          "Rename or remove it before seeding this tier.",
      );
    }
    log("gateway plan exists", name);
    return existing;
  }
  if (!apply) {
    log("would create gateway plan", `${name} ₹${amountInr} ${period}`);
    return null;
  }

  const created = (await RazorpayInstance.plans.create({
    period,
    interval: 1,
    item: { name, amount: amountInr * 100, currency: "INR" },
  })) as { id: string; created_at: number };
  log("created gateway plan", `${name} (${created.id})`);

  return prisma.paymentPlans.create({
    data: {
      planId: created.id,
      amount: amountInr,
      currency: "INR",
      name,
      createdAt: created.created_at,
      period,
      interval: 1,
    },
  });
}

export async function restructureTiers({ apply, log: emit }: TaskContext): Promise<TaskOutcome> {
  const log = (action: string, detail: string) => emit(`${action}: ${detail}`);

  // Order matters throughout: the old Pro must vacate both its tier name and its gateway
  // plan names before the new middle rung can take them.
  await renameGatewayPlan("RATEUP_PRO_MONTHLY", "RATEUP_MAX_MONTHLY", apply, log);
  await renameGatewayPlan("RATEUP_PRO_YEARLY", "RATEUP_MAX_YEARLY", apply, log);
  await renameGatewayPlan("RATEUP_STARTER_MONTHLY", "RATEUP_PLUS_MONTHLY", apply, log);
  await renameGatewayPlan("RATEUP_STARTER_YEARLY", "RATEUP_PLUS_YEARLY", apply, log);

  await rename("PRO PLAN", "MAX PLAN", "Max", apply, log);
  await rename("STARTER PLAN", "PLUS PLAN", "Plus", apply, log);

  const monthly = await ensureGatewayPlan(
    "RATEUP_PRO_MONTHLY",
    PRO.inrMonthly,
    "monthly",
    apply,
    log,
  );
  const yearly = await ensureGatewayPlan("RATEUP_PRO_YEARLY", PRO.inrYearly, "yearly", apply, log);

  const existing = renamedAway.has(PRO.name)
    ? null
    : await prisma.rateupPlan.findFirst({ where: { name: PRO.name } });
  const data = {
    name: PRO.name,
    displayName: PRO.displayName,
    planType: PaymentPlanType.BASE,
    description: PRO.description,
    features: PRO.features as never,
    badge: PRO.badge,
    currency: "INR",
    price: PRO.inrYearly / 12,
    monthlyPrice: PRO.inrMonthly,
    yearlyPrice: PRO.inrYearly,
    monthlyPaymentPlanId: monthly?.id,
    yearlyPaymentPlanId: yearly?.id,
  };

  if (!apply) {
    log(existing ? "would update tier" : "would create tier", `${PRO.name} ₹${PRO.inrYearly}/yr`);
  } else if (existing) {
    await prisma.rateupPlan.update({ where: { id: existing.id }, data });
    log("updated tier", PRO.name);
  } else {
    await prisma.rateupPlan.create({ data });
    log("created tier", PRO.name);
  }

  const catalog = await prisma.rateupPlan.findMany({
    select: { name: true, displayName: true, yearlyPrice: true },
    orderBy: { yearlyPrice: "asc" },
  });
  for (const tier of catalog) {
    log(
      "catalog",
      `${tier.displayName ?? tier.name} — ${tier.name} ₹${tier.yearlyPrice ?? "—"}/yr`,
    );
  }

  return {
    summary: apply
      ? "Catalog restructured to Free / Plus / Pro / Max / Enterprise."
      : "Would restructure the catalog to Free / Plus / Pro / Max / Enterprise.",
    details: { tiers: catalog.map((tier) => tier.name) },
  };
}
