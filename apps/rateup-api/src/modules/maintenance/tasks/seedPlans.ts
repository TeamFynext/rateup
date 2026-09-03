/**
 * Seeds the four-tier plan catalog: Razorpay plans (INR), Stripe products+prices
 * (USD), and the RateupPlan rows that tie them to the subscription feature presets.
 *
 *
 * Dry run is the default deliberately: this writes to live payment accounts, and a
 * gateway product cannot be deleted once a subscription has attached to it.
 *
 * Idempotent. Everything is looked up by its stable name first (RATEUP_<TIER>_<CADENCE>
 * for gateway products, the tier name for RateupPlan) and created only when absent, so
 * re-running after a partial failure resumes rather than duplicating.
 *
 * Pricing model: Rateup charges a flat tier price for the platform. Message delivery is
 * billed by Meta directly to the customer's own WABA, so these are plain fixed-amount
 * subscriptions — there are no metered/usage-based subscription items. The conversation
 * allowance in each tier's features is a plan limit, not a per-unit charge.
 */
// Must precede every other import: this is an entrypoint (same convention as
// src/index.ts and the worker entrypoints), and src/utils/payment/razorpay.ts
// constructs its Razorpay client at module scope, so the keys have to be in the
// environment before that module is evaluated.
import axios from "axios";
import { PaymentPlanType } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { CATALOG_TIERS, type TierSpec } from "../../subscription/catalog.js";
import type { TaskContext, TaskOutcome } from "../task.js";

/** The two-argument log the task bodies use, forwarded to the run's collector. */
type Log = (action: string, detail: string) => void;
import { RazorpayInstance } from "../../../utils/payment/razorpay.js";

const STRIPE_API = "https://api.stripe.com/v1";
/**
 * Skips Stripe product creation, seeding Razorpay + the RateupPlan rows only. INR is
 * the displayed default, so this is enough to stand the catalog up; use it when the
 * Stripe key's mode is unconfirmed, since a product created in a live account cannot
 * be deleted once a subscription attaches to it.
 */

/**
 * One Razorpay plan, in one currency.
 *
 * A Razorpay plan carries a single currency, so a tier sold in both rupees and dollars
 * needs a separate plan per currency and cadence — four in total. Amounts go to Razorpay
 * in minor units (paise, cents) and are stored here in major units, matching every other
 * price in the catalog.
 */
async function ensureRazorpayPlan(
  name: string,
  amount: number,
  currency: "INR" | "USD",
  period: "monthly" | "yearly",
  apply: boolean,
  log: Log,
) {
  const existing = await prisma.paymentPlans.findFirst({ where: { name } });
  if (existing) {
    if (existing.amount !== amount || existing.currency !== currency) {
      // Reusing a same-named plan at another price is how a tier ends up billing someone
      // else's amount; the restructure task learned this the hard way.
      throw new Error(
        `${name} already exists at ${existing.currency}${existing.amount}, not ${currency}${amount}.`,
      );
    }
    log("razorpay plan exists", name);
    return existing;
  }
  if (!apply) {
    log("would create razorpay plan", `${name} ${currency}${amount} ${period}`);
    return null;
  }

  const created: any = await RazorpayInstance.plans.create({
    period,
    interval: 1,
    item: { name, amount: amount * 100, currency },
  });
  log("created razorpay plan", `${name} (${created.id}, ${currency})`);

  return prisma.paymentPlans.create({
    data: {
      planId: created.id,
      amount,
      currency,
      name,
      createdAt: created.created_at,
      period,
      interval: 1,
    },
  });
}

/** Stripe amounts are in cents. */
async function ensureStripeProduct(
  name: string,
  amountUsd: number,
  interval: "month" | "year",
  apply: boolean,
  log: Log,
) {
  const existing = await prisma.stripeProducts.findFirst({ where: { name } });
  if (existing) {
    log("stripe product exists", name);
    return existing;
  }
  if (!apply) {
    log("would create stripe product", `${name} $${amountUsd} /${interval}`);
    return null;
  }

  const auth = { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` };
  const product = (
    await axios.post(`${STRIPE_API}/products`, new URLSearchParams({ name }), { headers: auth })
  ).data;
  const price = (
    await axios.post(
      `${STRIPE_API}/prices`,
      new URLSearchParams({
        product: product.id,
        currency: "usd",
        unit_amount: String(amountUsd * 100),
        "recurring[interval]": interval,
      }),
      { headers: auth },
    )
  ).data;
  log("created stripe product", `${name} (${product.id} / ${price.id})`);

  return prisma.stripeProducts.create({
    data: {
      name,
      createdAt: product.created,
      active: product.active,
      liveMode: product.livemode,
      productId: product.id,
      priceId: price.id,
      currency: "usd",
      amount: amountUsd,
      interval,
      intervalCount: 1,
      type: "recurring",
    },
  });
}

/** The RateupPlan columns that point at a gateway plan, one per cadence/currency. */
const LINK_SLOTS = [
  "monthlyPaymentPlanId",
  "yearlyPaymentPlanId",
  "usdMonthlyPaymentPlanId",
  "usdYearlyPaymentPlanId",
] as const;

type LinkSlot = (typeof LINK_SLOTS)[number];

/**
 * Frees a gateway plan row that another tier is still holding.
 *
 * Every link column is unique, so a row can sit in exactly one tier's slot. Seeding
 * matches those rows by name and the name carries the price, so the tier whose name
 * matches is the rightful owner — but a tier rename moves the name without moving the
 * links. That is how a Max tier ended up owning RATEUP_PRO_USD_MONTHLY: restructureTiers
 * renames PRO PLAN to MAX PLAN and rewrites the INR plan names, but the USD columns
 * postdate it and are left pointing where they were. Seeding Pro then collides on
 * `usdMonthlyPaymentPlanId`. Clear the stale link rather than fail: the losing tier is
 * advertising someone else's price until it is.
 */
async function detachStaleLinks(
  links: Partial<Record<LinkSlot, string | undefined>>,
  keepTierId: string | undefined,
  apply: boolean,
  log: Log,
) {
  for (const slot of LINK_SLOTS) {
    const planId = links[slot];
    if (!planId) continue;
    const holders = await prisma.rateupPlan.findMany({
      where: { [slot]: planId, ...(keepTierId ? { id: { not: keepTierId } } : {}) },
      select: { id: true, name: true },
    });
    for (const holder of holders) {
      if (!apply) {
        log("would detach gateway plan", `${slot} from ${holder.name} (${holder.id})`);
        continue;
      }
      await prisma.rateupPlan.update({ where: { id: holder.id }, data: { [slot]: null } });
      log("detached gateway plan", `${slot} from ${holder.name} (${holder.id})`);
    }
  }
}

/**
 * The one tier row for a catalog name.
 *
 * Duplicates are not a case to pick a winner for: a tier is a sellable product, both
 * copies show on the pricing page, and only one of them can hold the gateway links. A
 * rename onto a name that already existed is how they appear. Report and stop — which
 * row to keep depends on what still points at it.
 */
async function findTier(name: string) {
  const rows = await prisma.rateupPlan.findMany({ where: { name }, orderBy: { createdAt: "asc" } });
  if (rows.length > 1) {
    throw new Error(
      `${rows.length} RateupPlan rows are named "${name}" (${rows.map((row) => row.id).join(", ")}). ` +
        "Delete the stale one before seeding; a duplicate tier is sold twice and can only hold one set of gateway plans.",
    );
  }
  return rows[0] ?? null;
}

async function seedTier(tier: TierSpec, apply: boolean, skipStripe: boolean, log: Log) {
  log("tier", tier.displayName);

  let monthlyPlanId: string | undefined;
  let yearlyPlanId: string | undefined;
  let usdMonthlyPlanId: string | undefined;
  let usdYearlyPlanId: string | undefined;
  let stripeId: string | undefined;

  if (!tier.salesLed) {
    const slug = tier.displayName.toUpperCase();
    const monthly = await ensureRazorpayPlan(
      `RATEUP_${slug}_MONTHLY`,
      tier.inrMonthly,
      "INR",
      "monthly",
      apply,
      log,
    );
    const yearly = await ensureRazorpayPlan(
      `RATEUP_${slug}_YEARLY`,
      tier.inrYearly,
      "INR",
      "yearly",
      apply,
      log,
    );
    const usdMonthly = await ensureRazorpayPlan(
      `RATEUP_${slug}_USD_MONTHLY`,
      tier.usdMonthly,
      "USD",
      "monthly",
      apply,
      log,
    );
    const usdYearly = await ensureRazorpayPlan(
      `RATEUP_${slug}_USD_YEARLY`,
      tier.usdYearly,
      "USD",
      "yearly",
      apply,
      log,
    );
    // Annual is the headline cadence, so the Stripe product linked to the plan row is
    // the yearly one; the monthly Stripe price is created for parity.
    let stripeYearly = null;
    if (skipStripe) {
      log("skipping stripe", `${slug} (--skip-stripe)`);
    } else {
      await ensureStripeProduct(`RATEUP_${slug}_MONTHLY`, tier.usdMonthly, "month", apply, log);
      stripeYearly = await ensureStripeProduct(
        `RATEUP_${slug}_YEARLY`,
        tier.usdYearly,
        "year",
        apply,
        log,
      );
    }
    monthlyPlanId = monthly?.id;
    yearlyPlanId = yearly?.id;
    usdMonthlyPlanId = usdMonthly?.id;
    usdYearlyPlanId = usdYearly?.id;
    stripeId = stripeYearly?.id;
  }

  const existing = await findTier(tier.name);
  await detachStaleLinks(
    {
      monthlyPaymentPlanId: monthlyPlanId,
      yearlyPaymentPlanId: yearlyPlanId,
      usdMonthlyPaymentPlanId: usdMonthlyPlanId,
      usdYearlyPaymentPlanId: usdYearlyPlanId,
    },
    existing?.id,
    apply,
    log,
  );
  const data = {
    name: tier.name,
    displayName: tier.displayName,
    planType: PaymentPlanType.BASE,
    description: tier.description,
    features: tier.features as never,
    badge: tier.badge,
    // Stored in INR: it is the displayed default currency.
    currency: tier.salesLed ? null : "INR",
    price: tier.salesLed ? null : tier.inrYearly / 12,
    monthlyPrice: tier.salesLed ? null : tier.inrMonthly,
    yearlyPrice: tier.salesLed ? null : tier.inrYearly,
    usdMonthlyPrice: tier.salesLed ? null : tier.usdMonthly,
    usdYearlyPrice: tier.salesLed ? null : tier.usdYearly,
    monthlyPaymentPlanId: monthlyPlanId,
    yearlyPaymentPlanId: yearlyPlanId,
    usdMonthlyPaymentPlanId: usdMonthlyPlanId,
    usdYearlyPaymentPlanId: usdYearlyPlanId,
    stripeId,
  };

  if (!apply) {
    log(existing ? "would update RateupPlan" : "would create RateupPlan", tier.name);
    return;
  }

  if (existing) {
    await prisma.rateupPlan.update({ where: { id: existing.id }, data });
    log("updated RateupPlan", tier.name);
  } else {
    await prisma.rateupPlan.create({ data });
    log("created RateupPlan", tier.name);
  }
}

export async function seedPlans(
  { apply, log: emit }: TaskContext,
  { skipStripe = true }: { skipStripe?: boolean } = {},
): Promise<TaskOutcome> {
  const log: Log = (action, detail) => emit(`${action}: ${detail}`);
  for (const tier of CATALOG_TIERS) {
    await seedTier(tier, apply, skipStripe, log);
  }

  return {
    summary: `${apply ? "Seeded" : "Would seed"} ${CATALOG_TIERS.length} tier(s) into the catalog.`,
    details: { tiers: CATALOG_TIERS.map((tier) => tier.name) },
  };
}
