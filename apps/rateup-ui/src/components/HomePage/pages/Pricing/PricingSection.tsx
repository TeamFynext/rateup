import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

import type { RateupPaymentPlan } from "@/backend/payment/payment.api";
import { currencyLabel } from "@/components/menu/util/currencyData.ts";
import { BookDemoLink } from "@/components/RateupHomePage/helper/BookDemoLink";

import PlanCardNew from "./Card/PlanCardNew.tsx";
import { ComparisonTable } from "./ComparisonTable.tsx";
import { ConversationCreditsDrawer } from "./ConversationCreditsDrawer.tsx";
import { Faq } from "./FAQ.tsx";
import { MetaBillingPanel } from "./MetaBillingPanel.tsx";
import {
  type BillingPeriod,
  buildTiers,
  detectPricingCurrency,
  formatCount,
  type PricingTier,
  tierRank,
  resolveConversationPack,
  selectGatewayPlan,
} from "./pricing.data.ts";
import { PricingCta } from "./PricingCta.tsx";
import { useRouteAndCartStore } from "./store/RouteAndCartStore.ts";

/**
 * Column counts for the compact (dialog) grid, keyed by how many tiers are actually on
 * offer. Written out rather than interpolated because Tailwind only ships classes it can
 * see as literals. Capped at four: a Free user sees three upgrades, an Enterprise user
 * none, and anything wider than four columns is not a layout this dialog has.
 */
const COMPACT_GRID_COLS: Record<number, string> = {
  1: "grid-cols-1 max-w-sm mx-auto",
  2: "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

const toggleClass = (active: boolean) =>
  `flex h-8 cursor-pointer items-center gap-2 rounded-full border-none px-[18px] text-sm font-medium transition-colors duration-150 ${
    active
      ? "bg-primary text-primary-foreground"
      : "bg-transparent text-muted-foreground hover:text-foreground"
  }`;

/**
 * "page" is the full marketing page: hero, cards, comparison matrix, commerce.
 * "compact" is just the toggles and the cards, for the in-app upgrade dialog — the
 * hero and matrix are marketing framing that a signed-in customer choosing an upgrade
 * does not need, and the matrix does not fit a dialog.
 */
type PricingVariant = "page" | "compact";

const PricingSection = ({
  onPlanSelect = null,
  plans,
  variant = "page",
  currentPlanName,
}: {
  onPlanSelect?: (() => void) | null;
  plans: RateupPaymentPlan[];
  variant?: PricingVariant;
  /**
   * `RateupPlan.name` the org is on today. When given, only strictly higher tiers are
   * offered — the current plan and anything below it are not upgrades, and a downgrade
   * is not something this dialog can carry out.
   */
  currentPlanName?: string;
}) => {
  const compact = variant === "compact";
  const navigate = useNavigate();

  const [period, setPeriod] = useState<BillingPeriod>("yearly");
  // Fixed by the visitor's timezone: India is priced in INR, everywhere else in USD.
  // Resolved once — the zone cannot change under a mounted page.
  const currency = useMemo(() => detectPricingCurrency(), []);

  /** Cards, matrix and checkout links all come off the plans endpoint. */
  const tiers = useMemo(() => buildTiers(plans), [plans]);
  // Null when the catalog is not selling a top-up, which is what hides the calculator:
  // the page should never offer to price something that cannot be bought.
  const conversationPack = useMemo(() => resolveConversationPack(plans), [plans]);

  // The matrix still compares every tier; only the cards are narrowed to upgrades.
  // Set `currentPlanName` ONLY for a subscription that is actually billing: it hides
  // every tier at or below that plan, which strands anyone whose plan has ended and who
  // wants to come back on the same tier or a cheaper one.
  const currentRank = tierRank(currentPlanName);
  const offeredTiers = useMemo(() => {
    // In-app, Free is not something you can buy — selecting it routes to signup, which is
    // nonsense for someone already signed in — so it never belongs in the dialog.
    const purchasable = compact ? tiers.filter((tier) => !tier.free) : tiers;
    return currentRank < 0
      ? purchasable
      : purchasable.filter((tier) => tierRank(tier.planName) > currentRank);
  }, [tiers, currentRank, compact]);
  const onHighestTier = currentRank >= 0 && offeredTiers.length === 0;

  const { updateRouteAndCart } = useRouteAndCartStore();

  function handleTierSelection(tier: PricingTier) {
    if (onPlanSelect) onPlanSelect();

    if (tier.free) {
      navigate({ to: "/signup" });
      return;
    }
    // Sales-led tiers open the demo modal instead of routing to a checkout that has no
    // gateway product behind it, so there is nothing to do here.
    if (tier.salesLed) return;

    const plan = tier.raw;
    const gatewayPlan = selectGatewayPlan(tier, period, currency);

    if (!gatewayPlan) return;

    const route = "/dashboard/settings/billing";
    const cartData = {
      id: plan.id,
      amount: gatewayPlan.amount,
      currency: gatewayPlan.currency,
      currencySymbol:
        currencyLabel.find((c) => c.label === gatewayPlan.currency)?.symbol ??
        (currency === "INR" ? "₹" : "$"),
      description: plan.description,
      period: gatewayPlan.period ?? period,
      planId: gatewayPlan.planId,
      name: plan?.displayName,
      gateway: "RAZORPAY",
      priceId: "",
    };
    updateRouteAndCart(route, cartData);

    localStorage.setItem("subscriptionRoutAndCart", JSON.stringify({ route, cartData }));

    navigate({ to: route });
  }

  const cards = compact ? offeredTiers : offeredTiers.filter((tier) => !tier.salesLed);
  // On the page the sales-led tier is its own strip below the cards: it has no price to
  // compare and its own call to action, so a fifth column of "Custom" only narrows the
  // four that a visitor is actually choosing between. The dialog keeps it as a card.
  const enterprise = compact ? undefined : offeredTiers.find((tier) => tier.salesLed);

  return (
    <div className={compact ? "text-foreground" : "bg-background text-foreground"}>
      <section className={compact ? "mx-auto max-w-[1240px]" : "mx-auto max-w-[1240px] px-8 pt-20"}>
        <div className="flex flex-col items-center gap-4 text-center" hidden={compact}>
          <span className="text-[11.5px] font-semibold uppercase tracking-widest text-ru-blue-500">
            Pricing
          </span>
          <h1 className="font-display m-0 max-w-[20ch] text-[32px] font-bold leading-[1.06] tracking-[-0.03em] text-foreground md:text-[48px]">
            Choose What You Need
          </h1>
          <p className="m-0 max-w-[56ch] text-lg leading-[1.6] text-muted-foreground">
            Every plan includes the WhatsApp Business API, the omnichannel inbox, loyalty and
            surveys. Start on the Free plan, upgrade when your volume does.
          </p>
        </div>

        <div
          className={`flex flex-wrap items-center justify-center gap-3 ${compact ? "mt-0" : "mt-8 mb-10"}`}
          hidden={onHighestTier}
        >
          <div className="inline-flex items-center gap-[3px] rounded-full bg-white p-[3px] shadow-[inset_0_0_0_1px_rgba(27,32,39,0.1),0_1px_2px_rgba(0,0,0,0.05)]">
            <button
              type="button"
              onClick={() => setPeriod("yearly")}
              className={toggleClass(period === "yearly")}
            >
              Annual
              <span className="rounded-4xl border border-amber-200 bg-amber-50 px-[7px] py-0.5 text-[11px] font-semibold text-amber-700">
                Save 20%
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPeriod("monthly")}
              className={toggleClass(period === "monthly")}
            >
              Monthly
            </button>
          </div>
        </div>

        <motion.div
          className={
            // The dialog is near full-width for its viewport, so the compact variant can
            // reach four columns a breakpoint earlier than the page, where the grid sits
            // inside a 1240px container with the rest of the layout around it.
            compact
              ? `mt-6 grid items-stretch gap-4 ${
                  COMPACT_GRID_COLS[Math.min(cards.length, 4)] ?? COMPACT_GRID_COLS[4]
                }`
              : "grid items-stretch gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
          }
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {cards.map((tier) => (
            <PlanCardNew
              key={tier.id}
              tier={tier}
              period={period}
              currency={currency}
              // In-app, "Upgrade to Pro" names the destination, which the marketing
              // page's generic "Choose plan" does not.
              ctaLabel={compact && !tier.salesLed ? `Upgrade to ${tier.name}` : undefined}
              onButtonClick={() => handleTierSelection(tier)}
            />
          ))}
        </motion.div>

        {onHighestTier && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-[inset_0_0_0_1px_rgba(27,32,39,0.1),0_1px_2px_rgba(0,0,0,0.05)]">
            <h3 className="font-display text-lg font-bold text-foreground">
              You&apos;re on our highest plan.
            </h3>
            <p className="mx-auto mt-2 max-w-[420px] text-sm text-muted-foreground">
              Need more teams, seats or conversations than Enterprise includes? Talk to us and
              we&apos;ll size a contract around it.
            </p>
          </div>
        )}

        {/* Sits directly under the cards rather than in the FAQ: "what if I go over?" is
            the question the allowance on every card provokes, and the drawer prices the
            headroom at the visitor's currency and whichever cadence is selected. */}
        {!compact && conversationPack && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-muted p-[18px_24px] shadow-[inset_0_0_0_1px_rgba(27,32,39,0.1)]">
            <p className="m-0 flex-1 basis-[380px] text-sm leading-[1.55] text-muted-foreground">
              Past your plan&apos;s conversation limit? Add{" "}
              {formatCount(conversationPack.conversations)}-conversation credit packs — charged
              once, never renewing.
            </p>
            <ConversationCreditsDrawer
              tiers={tiers}
              pack={conversationPack}
              currency={currency}
              period={period}
            />
          </div>
        )}

        {enterprise && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-white p-6 shadow-[inset_0_0_0_1px_rgba(27,32,39,0.1),0_1px_2px_rgba(0,0,0,0.05)]">
            <div className="flex-1 basis-[320px]">
              <span className="text-[11.5px] font-semibold uppercase tracking-widest text-ru-n-400">
                {enterprise.name}
              </span>
              <h3 className="font-display mt-1.5 mb-2 text-[22px] font-bold leading-[1.25] tracking-[-0.018em] text-foreground">
                Volume pricing and a dedicated account manager.
              </h3>
              <p className="m-0 text-sm leading-[1.55] text-muted-foreground">
                For teams past the Max plan&apos;s limits or running multiple WhatsApp numbers
                across brands.
              </p>
            </div>
            <ul className="m-0 flex flex-1 basis-[320px] list-none flex-wrap gap-x-7 gap-y-2 p-0">
              {enterprise.features.map((feature) => (
                <li
                  key={feature}
                  className="flex gap-[9px] text-sm leading-[1.5] text-secondary-foreground"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-[3px] shrink-0 text-ru-green-600"
                    aria-hidden
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <BookDemoLink>
              <span className="inline-flex h-10 cursor-pointer items-center whitespace-nowrap rounded-lg bg-primary px-[22px] text-sm font-medium text-primary-foreground transition-[filter,transform] duration-150 hover:brightness-[0.92] active:translate-y-px">
                Contact Sales
              </span>
            </BookDemoLink>
          </div>
        )}

        <p
          className="mt-4 max-w-[80ch] text-[13px] leading-[1.45] text-ru-n-400"
          hidden={onHighestTier || compact}
        >
          Prices exclude applicable taxes. A conversation is one 24-hour window with a customer on
          any connected channel. WhatsApp conversation charges are billed separately by Meta to your
          own Meta Business account and are never marked up by RateUp.
        </p>
      </section>

      {!compact && (
        <>
          <MetaBillingPanel />
          <ComparisonTable tiers={tiers} />
          <Faq plans={plans} />
          <PricingCta />
        </>
      )}
    </div>
  );
};

export default PricingSection;
