/**
 * Moves the stored gateway plans onto the catalog's current prices.
 *
 *
 * `seedPlans` cannot do this. It looks a gateway plan up by its stable name and, finding
 * one, either throws because the amount no longer matches (Razorpay) or reuses the old
 * object without a word (Stripe) — deliberately, since reusing a same-named plan at
 * another price is how a tier ends up billing someone else's amount. So a repricing needs
 * a task that knows the amount is *supposed* to have moved.
 *
 * Neither gateway lets a plan's amount be edited: a Razorpay plan is immutable, and a
 * Stripe price is immutable once created. Both therefore need a fresh object. This creates
 * one and rewrites `planId` / `priceId` on the existing row, keeping the row id — the same
 * trick relinkRazorpayPlans uses, and what leaves the RateupPlan links intact so no tier
 * has to be re-pointed afterwards.
 *
 * **Existing subscribers are grandfathered, and that is not a choice this makes.** A live
 * subscription at either gateway references the plan or price id captured when it was
 * created, and that object still exists. Rewriting the stored id changes what the *next*
 * checkout uses; everyone already billing keeps their old amount until they change plan.
 * When a repricing moves a tier down, that leaves some customers above list price — moving
 * them is a business decision, made elsewhere.
 *
 * Idempotent: a row already at the catalog amount is skipped, so a re-run after a partial
 * failure resumes. Run this *before* `seed-plans`, which then finds matching amounts and
 * writes the new prices onto the tier rows without tripping its own guard.
 */
import axios from "axios";
import prisma from "../../../utils/prisma.js";
import { RazorpayInstance } from "../../../utils/payment/razorpay.js";
import { CATALOG_TIERS, type TierSpec } from "../../subscription/catalog.js";
import type { TaskContext, TaskOutcome } from "../task.js";

/** The two-argument log the task bodies use, forwarded to the run's collector. */
type Log = (action: string, detail: string) => void;

const STRIPE_API = "https://api.stripe.com/v1";
/** Razorpay rate-limits bursts; the same gap relinkRazorpayPlans uses keeps us under it. */
const THROTTLE_MS = 400;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The four Razorpay plans a tier is sold through — one per currency and cadence. */
function razorpayCadences(tier: TierSpec) {
  const slug = tier.displayName.toUpperCase();
  return [
    { name: `RATEUP_${slug}_MONTHLY`, amount: tier.inrMonthly, currency: "INR" as const },
    { name: `RATEUP_${slug}_YEARLY`, amount: tier.inrYearly, currency: "INR" as const },
    { name: `RATEUP_${slug}_USD_MONTHLY`, amount: tier.usdMonthly, currency: "USD" as const },
    { name: `RATEUP_${slug}_USD_YEARLY`, amount: tier.usdYearly, currency: "USD" as const },
  ];
}

/**
 * Re-creates one Razorpay plan at the catalog amount and repoints the stored row.
 *
 * Period and interval come off the stored row rather than being re-derived, so a row that
 * was set up by hand keeps whatever cadence it actually has.
 */
async function repriceRazorpayPlan(
  name: string,
  amount: number,
  currency: "INR" | "USD",
  apply: boolean,
  log: Log,
): Promise<boolean> {
  const existing = await prisma.paymentPlans.findFirst({ where: { name } });
  if (!existing) {
    // Nothing to reprice — seedPlans creates it at the current amount.
    log("absent", `${name} (seed-plans will create it at ${currency}${amount})`);
    return false;
  }
  if (existing.amount === amount && existing.currency === currency) {
    log("current", `${name} ${currency}${amount}`);
    return false;
  }
  if (existing.currency !== currency) {
    // A currency swap is not a repricing; it would silently start charging rupees as
    // dollars. Whatever produced this row needs looking at by hand.
    throw new Error(
      `${name} is stored in ${existing.currency}, not ${currency}. Refusing to reprice across currencies.`,
    );
  }

  const move = `${currency}${existing.amount} → ${currency}${amount}`;
  if (!apply) {
    log("would reprice razorpay plan", `${name} ${move}`);
    return true;
  }

  await sleep(THROTTLE_MS);
  const created: any = await RazorpayInstance.plans.create({
    period: existing.period as "monthly" | "yearly",
    interval: existing.interval,
    item: { name, amount: amount * 100, currency },
  });
  await prisma.paymentPlans.update({
    where: { id: existing.id },
    data: { planId: created.id, amount, createdAt: created.created_at },
  });
  log("repriced razorpay plan", `${name} ${move} (${existing.planId} → ${created.id})`);
  return true;
}

/**
 * Attaches a new Stripe price to the tier's existing product and repoints the stored row.
 *
 * The product is reused — it is the thing customers see named on an invoice, and its
 * price is a separate object precisely so it can be replaced. The old price is left
 * active, since subscriptions already on it reference it directly.
 */
async function repriceStripeProduct(
  name: string,
  amountUsd: number,
  interval: "month" | "year",
  apply: boolean,
  log: Log,
): Promise<boolean> {
  const existing = await prisma.stripeProducts.findFirst({ where: { name } });
  if (!existing) {
    log("absent", `${name} (no stripe product to reprice)`);
    return false;
  }
  if (existing.amount === amountUsd) {
    log("current", `${name} $${amountUsd}`);
    return false;
  }

  const move = `$${existing.amount} → $${amountUsd}`;
  if (!apply) {
    log("would reprice stripe product", `${name} ${move}`);
    return true;
  }

  const auth = { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` };
  const price = (
    await axios.post(
      `${STRIPE_API}/prices`,
      new URLSearchParams({
        product: existing.productId,
        currency: "usd",
        unit_amount: String(amountUsd * 100),
        "recurring[interval]": interval,
      }),
      { headers: auth },
    )
  ).data;
  await prisma.stripeProducts.update({
    where: { id: existing.id },
    data: { priceId: price.id, amount: amountUsd, interval, intervalCount: 1 },
  });
  log("repriced stripe product", `${name} ${move} (${existing.priceId} → ${price.id})`);
  return true;
}

export async function repriceCatalogPlans(
  { apply, log: emit }: TaskContext,
  { skipStripe = true }: { skipStripe?: boolean } = {},
): Promise<TaskOutcome> {
  const log: Log = (action, detail) => emit(`${action}: ${detail}`);

  let razorpay = 0;
  let stripe = 0;

  for (const tier of CATALOG_TIERS) {
    // Sales-led tiers carry no list price, so there is nothing to reprice.
    if (tier.salesLed) continue;
    log("tier", tier.displayName);

    for (const { name, amount, currency } of razorpayCadences(tier)) {
      if (await repriceRazorpayPlan(name, amount, currency, apply, log)) razorpay++;
    }

    const slug = tier.displayName.toUpperCase();
    if (skipStripe) {
      log("skipping stripe", `${slug} (--skip-stripe)`);
      continue;
    }
    if (
      await repriceStripeProduct(`RATEUP_${slug}_MONTHLY`, tier.usdMonthly, "month", apply, log)
    ) {
      stripe++;
    }
    if (await repriceStripeProduct(`RATEUP_${slug}_YEARLY`, tier.usdYearly, "year", apply, log)) {
      stripe++;
    }
  }

  const total = razorpay + stripe;
  return {
    summary: apply
      ? `Repriced ${total} gateway plan(s) — ${razorpay} Razorpay, ${stripe} Stripe.`
      : `${total} gateway plan(s) need repricing — ${razorpay} Razorpay, ${stripe} Stripe.`,
    details: { razorpay, stripe },
  };
}
