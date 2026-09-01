import { BookDemoLink } from "@/components/RateupHomePage/helper/BookDemoLink";

import {
  type BillingPeriod,
  formatPrice,
  type PricingCurrency,
  type PricingTier,
  resolveDisplayPrice,
} from "../pricing.data.ts";

/** The design system's check: a 15px stroke tick, coloured per surface. */
const Check = ({ className }: { className: string }) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`mt-[3px] shrink-0 ${className}`}
    aria-hidden
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

/**
 * One pricing card, rendered entirely from a plans-endpoint row. The featured tier
 * (the one the catalog gives a badge) is the deep navy panel; every other tier is a
 * light surface with a hairline ring.
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
      : "Billed monthly, cancel any time";
  }

  const ctaButton = (
    <button
      type="button"
      onClick={tier.salesLed ? undefined : onButtonClick}
      className={`h-10 w-full cursor-pointer rounded-lg border-none text-sm font-medium tracking-[-0.005em] transition-[filter,transform] duration-150 hover:brightness-[0.94] active:translate-y-px active:brightness-[0.89] ${
        dark
          ? "bg-white text-ru-blue-900"
          : "bg-muted text-foreground shadow-[inset_0_0_0_1px_var(--color-border)]"
      }`}
    >
      {ctaLabel ?? tier.cta}
    </button>
  );

  return (
    <div
      className={`flex h-full flex-col gap-4 rounded-2xl p-6 ${
        dark
          ? "bg-ru-blue-900 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_12px_32px_rgba(16,24,40,0.08)]"
          : "bg-white shadow-[inset_0_0_0_1px_rgba(27,32,39,0.1),0_1px_2px_rgba(0,0,0,0.05)]"
      }`}
    >
      <div className="flex min-h-5 items-center justify-between gap-2">
        <span
          className={`text-[11.5px] font-semibold uppercase tracking-[0.1em] ${
            dark ? "text-white/60" : "text-ru-n-400"
          }`}
        >
          {tier.name}
        </span>
        {tier.badge && (
          <span className="inline-flex h-5 items-center whitespace-nowrap rounded-4xl border border-amber-200 bg-amber-50 px-2 text-[11px] font-semibold text-amber-700">
            {tier.badge}
          </span>
        )}
      </div>

      <div>
        <div className="flex items-baseline gap-[5px]">
          <span
            className={`font-display text-[44px] font-bold leading-none tracking-[-0.035em] ${
              dark ? "text-white" : "text-foreground"
            }`}
          >
            {amount}
          </span>
          {unit && (
            <span className={`text-sm ${dark ? "text-white/60" : "text-ru-n-400"}`}>{unit}</span>
          )}
        </div>
        <p
          className={`mt-2 text-[13px] leading-[1.45] ${dark ? "text-white/60" : "text-ru-n-400"}`}
        >
          {note}
        </p>
      </div>

      {tier.tagline && (
        <p className={`text-sm leading-[1.55] ${dark ? "text-white/70" : "text-muted-foreground"}`}>
          {tier.tagline}
        </p>
      )}

      <div className={`h-px ${dark ? "bg-white/10" : "bg-ru-n-100"}`} />

      <ul className="m-0 flex list-none flex-col gap-[9px] p-0">
        {tier.features.map((feature) => (
          <li key={feature} className="flex gap-[9px] text-sm leading-[1.5]">
            <Check className={dark ? "text-ru-green-300" : "text-ru-green-600"} />
            <span className={dark ? "text-white/90" : "text-secondary-foreground"}>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-2">
        {tier.salesLed ? <BookDemoLink>{ctaButton}</BookDemoLink> : ctaButton}
      </div>
    </div>
  );
};

export default PlanCardNew;
