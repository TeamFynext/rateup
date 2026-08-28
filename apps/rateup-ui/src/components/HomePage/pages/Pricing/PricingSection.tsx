import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

import type { RateupPaymentPlan } from "@/backend/payment/payment.api";
import { useSendMailPlanSelectDetails } from "@/backend/payment/payment.query";
import { currencyLabel } from "@/components/menu/util/currencyData.ts";
import { useCheckSession } from "@/hooks/checkSession.tsx";

import PlanCardNew from "./Card/PlanCardNew.tsx";
import { CommerceHighlights } from "./CommerceHighlights.tsx";
import { ComparisonTable } from "./ComparisonTable.tsx";
import { ConversationCreditsDrawer } from "./ConversationCreditsDrawer.tsx";
import {
  type BillingPeriod,
  buildTiers,
  type PricingCurrency,
  type PricingTier,
  tierRank,
  resolveConversationPack,
  selectGatewayPlan,
} from "./pricing.data.ts";
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
  `cursor-pointer rounded-full border-none px-[18px] py-[9px] text-[13px] font-bold transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
    active ? "bg-[#1C518E] text-white" : "bg-transparent text-[#666864] hover:text-[#2E302E]"
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
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [period, setPeriod] = useState<BillingPeriod>("yearly");
  // Seeded from the visitor's timezone as before, but now switchable: the catalog
  // carries INR and USD products and a visitor abroad may still want to see INR.
  const [currency, setCurrency] = useState<PricingCurrency>(
    timeZone === "Asia/Calcutta" ? "INR" : "USD",
  );

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
  const sendMail = useSendMailPlanSelectDetails();
  const session = useCheckSession();

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

    const userInfo = localStorage.getItem("userInfo");
    if (session && userInfo) {
      const data = JSON.parse(userInfo);
      sendMail.mutate({
        email: data.data.email,
        name: data.data.userName,
        orgName: data.data.orgName,
        planName: plan.name,
        planId: plan.id,
      });
    }

    navigate({ to: route });
  }

  return (
    <div className={compact ? "text-[#2E302E]" : "bg-[#FAFAF7] text-[#2E302E]"}>
      <section className={compact ? "mx-auto max-w-[1240px]" : "mx-auto max-w-[1240px] px-8 pt-20"}>
        <div className="text-center" hidden={compact}>
          <div className="mb-3.5 text-xs font-bold uppercase tracking-[0.14em] text-[#1C518E]">
            Pricing
          </div>
          <h1 className="font-nunito mx-auto my-0 max-w-[780px] text-[40px] font-black leading-[1.03] tracking-[-0.025em] text-[#0A0B0A] md:text-[64px]">
            Start free. Scale when your conversations do.
          </h1>
          <p className="mx-auto mt-5 max-w-[600px] text-lg leading-relaxed text-[#4A4C49]">
            Every plan includes the WhatsApp Business API, the omnichannel inbox, automations and
            web surveys. You only pay for volume, seats and the advanced modules.
          </p>
        </div>

        <div
          className={`flex flex-wrap items-center justify-center gap-3.5 ${compact ? "mt-0" : "mt-9"}`}
          hidden={onHighestTier}
        >
          <div className="flex rounded-full border border-[#ECECEA] bg-white p-1 shadow-[0_1px_2px_rgba(11,31,72,0.06)]">
            <button
              type="button"
              onClick={() => setPeriod("yearly")}
              className={toggleClass(period === "yearly")}
            >
              Annual · save 20%
            </button>
            <button
              type="button"
              onClick={() => setPeriod("monthly")}
              className={toggleClass(period === "monthly")}
            >
              Monthly
            </button>
          </div>
          <div className="flex rounded-full border border-[#ECECEA] bg-white p-1 shadow-[0_1px_2px_rgba(11,31,72,0.06)]">
            <button
              type="button"
              onClick={() => setCurrency("USD")}
              className={toggleClass(currency === "USD")}
            >
              USD
            </button>
            <button
              type="button"
              onClick={() => setCurrency("INR")}
              className={toggleClass(currency === "INR")}
            >
              INR
            </button>
          </div>

          {/* Sits with the toggles rather than under the cards: the allowance is the one
              number a visitor arrives knowing, and the answer to "what if I go over?"
              was below the fold where nobody scrolled to find it. The drawer prices the
              headroom in whatever currency and cadence these toggles are set to. */}
          {!compact && conversationPack && (
            <ConversationCreditsDrawer
              tiers={tiers}
              pack={conversationPack}
              currency={currency}
              period={period}
            />
          )}
        </div>

        <motion.div
          className={
            // The dialog is near full-width for its viewport, so the compact variant can
            // reach four columns a breakpoint earlier than the page, where the grid sits
            // inside a 1240px container with the rest of the layout around it.
            compact
              ? `mt-6 grid items-start gap-5 ${
                  COMPACT_GRID_COLS[Math.min(offeredTiers.length, 4)] ?? COMPACT_GRID_COLS[4]
                }`
              : "mt-11 grid items-start gap-5 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
          }
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {offeredTiers.map((tier) => (
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
          <div className="rounded-xl border border-[#ECECEA] bg-white p-8 text-center">
            <h3 className="font-nunito text-lg font-extrabold text-[#0A0B0A]">
              You&apos;re on our highest plan.
            </h3>
            <p className="mx-auto mt-2 max-w-[420px] text-sm text-[#4A4C49]">
              Need more teams, seats or conversations than Enterprise includes? Talk to us and
              we&apos;ll size a contract around it.
            </p>
          </div>
        )}

        <p
          className="mx-auto mt-6 max-w-[720px] text-center text-[13px] text-[#8B8E8A]"
          hidden={onHighestTier}
        >
          A conversation is one 24-hour window with a customer on any connected channel. Annual
          plans are billed yearly; monthly billing costs 20% more. WhatsApp message charges are
          billed to your own Meta account and are not included above.
        </p>
      </section>

      {!compact && (
        <>
          <ComparisonTable tiers={tiers} />
          <CommerceHighlights />
        </>
      )}
    </div>
  );
};

export default PricingSection;
