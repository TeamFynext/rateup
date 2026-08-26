import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal";

import {
  type BillingPeriod,
  formatPrice,
  type PricingCurrency,
  type PricingTier,
  resolveDisplayPrice,
} from "../pricing.data.ts";

/**
 * One pricing card, rendered entirely from a plans-endpoint row. The featured tier
 * (the one the catalog gives a badge) is dark navy with the warm brand gradient on its
 * button and a cyan check; every other tier is a light surface.
 */
const PlanCardNew = ({
  tier,
  period,
  currency,
  onButtonClick,
  ctaLabel,
}: {
  tier: PricingTier;
  period: BillingPeriod;
  currency: PricingCurrency;
  onButtonClick: () => void;
  /**
   * Overrides the tier's own call to action. The in-app upgrade dialog uses this: a
   * customer already paying is changing plan, not subscribing fresh, so the catalog's
   * acquisition copy would be wrong there.
   */
  ctaLabel?: string;
}) => {
  const dark = tier.featured;
  const price = resolveDisplayPrice(tier, currency);
  const annual = period === "yearly";

  let amount: string;
  let unit: string | null;
  let note: string;

  if (tier.free) {
    amount = formatPrice(currency, 0);
    unit = "forever";
    note = "No card required";
  } else if (!price) {
    // Either a sales-led tier, or one the catalog does not price in this currency.
    amount = "Custom";
    unit = null;
    note = tier.salesLed ? "Annual or monthly billing" : "Contact us for this currency";
  } else {
    const perMonth = annual ? price.yearly / 12 : price.monthly;
    amount = formatPrice(currency, Math.round(perMonth));
    unit = "/month";

    // The checkout is created from the gateway plan in the currency on screen, so the
    // figure shown is the figure charged. This note used to name a rupee amount beside a
    // converted dollar headline; both are real list prices now, and quoting the other
    // currency here would be the misleading version.
    note = annual
      ? `Billed ${formatPrice(currency, price.yearly)} / year`
      : "Billed monthly · 20% more";
  }

  const check = dark ? "text-[#4FC3FF]" : "text-[#1C518E]";
  const ctaButton = (
    <button
      type="button"
      onClick={tier.salesLed ? undefined : onButtonClick}
      className={
        dark
          ? "relative mt-[22px] w-full cursor-pointer rounded-lg border-none p-[13px] text-[15px] font-extrabold text-[#081C3F] shadow-[0_8px_24px_rgba(248,149,29,0.3)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px"
          : tier.salesLed
            ? "mt-[22px] w-full cursor-pointer rounded-lg border-none bg-[#1C518E] p-[13px] text-[15px] font-bold text-white transition-colors duration-200 hover:bg-[#113560]"
            : "mt-[22px] w-full cursor-pointer rounded-lg border-none bg-[#EEF4FB] p-[13px] text-[15px] font-bold text-[#1C518E] transition-colors duration-200 hover:bg-[#D6E4F3]"
      }
      style={dark ? { background: "linear-gradient(135deg,#FFD54C,#F8951D)" } : undefined}
    >
      {ctaLabel ?? tier.cta}
    </button>
  );

  return (
    <div
      className={
        dark
          ? "relative overflow-hidden rounded-2xl border border-[#081C3F] bg-[#081C3F] p-7 shadow-[0_24px_72px_rgba(11,31,72,0.18)]"
          : "rounded-2xl border border-[#ECECEA] bg-white p-7 shadow-[0_1px_2px_rgba(11,31,72,0.06)]"
      }
    >
      {dark && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[70px] -top-[70px] h-[220px] w-[220px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(47,163,255,0.32), transparent 70%)",
          }}
        />
      )}

      <div className="relative flex items-center justify-between gap-2">
        <div
          className={`font-nunito text-xl font-extrabold ${dark ? "text-white" : "text-[#0A0B0A]"}`}
        >
          {tier.name}
        </div>
        {tier.badge && (
          <div
            className="rounded-full px-2.5 py-[5px] text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#081C3F]"
            style={{ background: "linear-gradient(135deg,#FFD54C,#F8951D)" }}
          >
            {tier.badge}
          </div>
        )}
      </div>

      {tier.tagline && (
        <p
          className={`relative mt-1.5 text-[13px] leading-relaxed ${
            dark ? "text-white/70" : "text-[#666864]"
          }`}
        >
          {tier.tagline}
        </p>
      )}

      <div className="relative mb-1 mt-[22px] flex items-baseline gap-1.5">
        <span
          className={`font-nunito text-[44px] font-black leading-none tracking-[-0.02em] ${
            dark ? "text-white" : "text-[#0A0B0A]"
          }`}
        >
          {amount}
        </span>
        {unit && (
          <span className={`text-sm font-semibold ${dark ? "text-white/60" : "text-[#8B8E8A]"}`}>
            {unit}
          </span>
        )}
      </div>

      <div className={`relative min-h-[18px] text-xs ${dark ? "text-white/60" : "text-[#8B8E8A]"}`}>
        {note}
      </div>

      {tier.salesLed ? <BookDemoModal>{ctaButton}</BookDemoModal> : ctaButton}

      <div className={`my-6 h-px ${dark ? "bg-white/10" : "bg-[#ECECEA]"}`} />

      <ul
        className={`relative m-0 flex list-none flex-col gap-3 p-0 text-sm ${
          dark ? "text-white/85" : "text-[#4A4C49]"
        }`}
      >
        {tier.features.map((feature) => (
          <li key={feature} className="flex gap-2.5">
            <span className={`font-extrabold ${check}`} aria-hidden>
              ✓
            </span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlanCardNew;
