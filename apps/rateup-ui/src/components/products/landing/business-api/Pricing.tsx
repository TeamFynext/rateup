import { Link } from "@tanstack/react-router";

import { CheckIcon } from "@/components/RateupHomePage/shared/home-ui";

/** Two bills, side by side: Meta's per-message fee, and RateUp's platform plan. */

const META_CATEGORIES = [
  ["Marketing", "Promotions, offers, re-engagement"],
  ["Utility", "Order, payment and delivery updates"],
  ["Authentication", "One-time passcodes"],
] as const;

const PLAN_POINTS = [
  "Unlimited team seats",
  "Templates, Flows, catalog and loyalty included",
  "No per-message markup on Meta's fee",
] as const;

export default function Pricing() {
  return (
    <section className="border-t border-ru-n-100 bg-background">
      <div className="mx-auto max-w-280 px-5 py-[clamp(3rem,7vw,5.5rem)]">
        <span className="text-[11.5px] font-semibold tracking-[0.1em] text-ru-blue-500 uppercase">
          Two bills, not one
        </span>
        <h2 className="mt-3 mb-3.5 font-display text-[clamp(1.625rem,3.6vw,2.25rem)]/[1.12] font-bold tracking-[-0.028em] text-balance text-ru-n-700">
          What the WhatsApp Business API costs
        </h2>
        <p className="mb-8 max-w-[66ch] text-[16.5px]/[1.6] text-ru-n-500">
          Meta charges you for messages. RateUp charges you for the platform. Nobody marks up the
          other.
        </p>

        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white p-8 shadow-xs ring-1 ring-ru-n-200 ring-inset">
            <span className="text-[11.5px] font-semibold tracking-[0.1em] text-ru-n-400 uppercase">
              Billed by Meta
            </span>
            <h3 className="mt-3 mb-2.5 font-display text-[22px]/[1.25] font-bold tracking-[-0.018em] text-ru-n-700">
              A per-message fee
            </h3>
            <p className="mb-5 text-[14.5px]/[1.55] text-ru-n-500">
              Charged per delivered template message, priced by category and by the country you're
              messaging. Replies inside an open conversation aren't charged as templates.
            </p>
            <ul className="flex flex-col gap-2.5">
              {META_CATEGORIES.map(([name, description], index) => (
                <li
                  key={name}
                  className={`flex items-baseline justify-between gap-4 ${
                    index === META_CATEGORIES.length - 1 ? "" : "border-b border-ru-n-100 pb-2.5"
                  }`}
                >
                  <span className="text-sm font-medium text-ru-n-700">{name}</span>
                  <span className="text-right text-[13.5px] text-ru-n-500">{description}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-ru-n-200 ring-inset">
            <span className="text-[11.5px] font-semibold tracking-[0.1em] text-ru-blue-500 uppercase">
              Billed by RateUp
            </span>
            <h3 className="mt-3 mb-2.5 font-display text-[22px]/[1.25] font-bold tracking-[-0.018em] text-ru-n-700">
              A plan that starts free
            </h3>
            <p className="mb-5 text-[14.5px]/[1.55] text-ru-n-500">
              Conversations per month is the main limit — every seat, channel and product is
              included at every tier. Move up a plan when your volume does.
            </p>
            <ul className="mb-6 flex flex-col gap-2.5">
              {PLAN_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-2.25 text-sm text-ru-n-600">
                  <CheckIcon className="size-3.75 flex-none text-ru-green-500" />
                  {point}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3.5">
              <Link
                to="/tools/whatsapp-pricing-calculator"
                className="inline-flex h-10 items-center rounded-lg bg-ru-blue-600 px-5.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(28,81,142,0.2)] transition-colors hover:bg-ru-blue-700"
              >
                Calculate your monthly cost
              </Link>
              <Link
                to="/pricing"
                className="text-sm font-medium text-ru-blue-600 hover:text-ru-blue-700"
              >
                See all plans
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
