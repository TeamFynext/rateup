import { useMemo, useState } from "react";

import { getToolBySlug } from "@/config/tools.ts";

import {
  FaqSection,
  Field,
  HowItWorks,
  InfoNote,
  RelatedTools,
  ResultFigure,
  ResultPanel,
  ResultRows,
  TextControl,
  ToolCard,
  ToolContainer,
  ToolCta,
  WarnNote,
} from "../shared/ToolSections.tsx";

const SLUG = "shopify-conversion-rate-calculator";

/**
 * The four funnel counts match Shopify Analytics' "Conversion rate breakdown" card
 * (Sessions, Added to cart, Reached checkout, Completed checkout), so merchants can
 * copy them across one-for-one.
 */
const DEFAULTS = {
  sessions: 40000,
  addedToCart: 2400,
  reachedCheckout: 1200,
  orders: 640,
  aov: 1200,
};

type Inputs = typeof DEFAULTS;

const FIELDS: { key: keyof Inputs; label: string; hint?: string }[] = [
  { key: "sessions", label: "Sessions", hint: "Online store sessions for the period" },
  { key: "addedToCart", label: "Sessions with add to cart" },
  { key: "reachedCheckout", label: "Sessions that reached checkout" },
  { key: "orders", label: "Orders (completed checkouts)" },
  { key: "aov", label: "Average order value ₹" },
];

const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const count = (value: number) => Math.round(value).toLocaleString("en-IN");
const pct = (value: number, digits = 2) => `${value.toFixed(digits)}%`;

/** Share of `part` in `whole`, as a percentage. Zero when there is no whole. */
const share = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

export default function ShopifyConversionRateCalculator() {
  const tool = getToolBySlug(SLUG);
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [lift, setLift] = useState(0.5);

  const set = (key: keyof Inputs, raw: string) => {
    const parsed = Number(raw.replace(/[^\d.]/g, ""));
    setInputs((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const result = useMemo(() => {
    const { sessions, addedToCart, reachedCheckout, orders, aov } = inputs;

    const conversionRate = share(orders, sessions);
    const revenue = orders * aov;
    const revenuePerSession = sessions > 0 ? revenue / sessions : 0;

    const addToCartRate = share(addedToCart, sessions);
    // Drop-off at each step, so the leakiest one is easy to spot.
    const cartAbandonment = 100 - share(reachedCheckout, addedToCart);
    const checkoutAbandonment = 100 - share(orders, reachedCheckout);

    const targetRate = conversionRate + lift;
    const extraOrders = (sessions * lift) / 100;
    const extraRevenue = extraOrders * aov;

    // Each count should be no larger than the step before it.
    const funnelOutOfOrder =
      addedToCart > sessions || reachedCheckout > addedToCart || orders > reachedCheckout;

    return {
      conversionRate,
      revenue,
      revenuePerSession,
      addToCartRate,
      cartAbandonment,
      checkoutAbandonment,
      targetRate,
      extraOrders,
      extraRevenue,
      funnelOutOfOrder,
    };
  }, [inputs, lift]);

  let rateColor = "text-[#FF9C9C]";
  let rateLabel = "Below the typical range";
  if (result.conversionRate >= 3) {
    rateColor = "text-[#7DE3A8]";
    rateLabel = "Well above the typical range";
  } else if (result.conversionRate >= 1) {
    rateColor = "text-[#FFD37A]";
    rateLabel = "Within the typical 1–3% range";
  }

  return (
    <>
      <ToolContainer className="pt-7">
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.15fr]">
          <ToolCard
            title="Your store's funnel"
            subtitle="Copy these from Shopify Analytics → Conversion rate breakdown, for any date range."
          >
            <div className="grid gap-3.5 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <Field
                  key={field.key}
                  label={field.label}
                  hint={field.hint}
                  htmlFor={`cr-${field.key}`}
                >
                  <TextControl
                    id={`cr-${field.key}`}
                    inputMode="decimal"
                    value={inputs[field.key]}
                    onChange={(event) => set(field.key, event.target.value)}
                  />
                </Field>
              ))}
            </div>

            {result.funnelOutOfOrder ? (
              <WarnNote>
                Each step should be smaller than the one above it — sessions, then add to cart, then
                checkout, then orders. Check the numbers you copied.
              </WarnNote>
            ) : (
              <InfoNote>
                Out of every 100 sessions, <b>{result.addToCartRate.toFixed(1)}</b> add something to
                cart and <b>{result.conversionRate.toFixed(1)}</b> place an order.
              </InfoNote>
            )}
          </ToolCard>

          <div className="flex flex-col gap-3.5">
            <ResultPanel eyebrow="Store conversion rate">
              <ResultFigure
                value={pct(result.conversionRate)}
                note={<span className={rateColor}>{rateLabel}</span>}
              />

              <ResultRows
                rows={[
                  {
                    label: "Add-to-cart rate",
                    detail: "Sessions that added a product to cart",
                    cost: pct(result.addToCartRate, 1),
                  },
                  {
                    label: "Cart abandonment",
                    detail: "Added to cart but never reached checkout",
                    cost: pct(Math.max(result.cartAbandonment, 0), 1),
                  },
                  {
                    label: "Checkout abandonment",
                    detail: "Reached checkout but did not pay",
                    cost: pct(Math.max(result.checkoutAbandonment, 0), 1),
                  },
                  {
                    label: "Revenue",
                    detail: `${count(inputs.orders)} orders × ${inr(inputs.aov)}`,
                    cost: inr(result.revenue),
                  },
                  {
                    label: "Revenue per session",
                    detail: "What each visit is worth to you",
                    cost: `₹${result.revenuePerSession.toFixed(2)}`,
                  },
                ]}
              />
            </ResultPanel>

            <ToolCard title="What a better rate is worth">
              <p className="-mt-2 mb-4 text-[13.5px] leading-[1.55] text-muted-foreground">
                Same traffic, same order value — only the conversion rate moves. Small lifts add up
                because you are not paying for the extra visitors.
              </p>

              <label
                htmlFor="cr-lift"
                className="mb-2.5 flex justify-between text-[12.5px] font-bold text-muted-foreground"
              >
                <span>Lift conversion rate by</span>
                <span className="text-primary">
                  +{lift.toFixed(1)} pts → {pct(result.targetRate)}
                </span>
              </label>
              <input
                id="cr-lift"
                type="range"
                min={0.1}
                max={3}
                step={0.1}
                value={lift}
                onChange={(event) => setLift(Number(event.target.value))}
                className="w-full accent-primary"
              />

              <div className="mt-4.5 rounded-xl bg-[#E7F9EE] p-5">
                <div className="text-[11.5px] font-extrabold tracking-[0.1em] text-[#0F7A42] uppercase">
                  Extra revenue
                </div>
                <div className="mt-1 font-display text-[32px] leading-[1.1] font-black text-[#0B5C32] sm:text-[38px]">
                  {inr(result.extraRevenue)}
                </div>
                <div className="mt-0.5 text-[13px] text-[#0F7A42]">
                  from {count(result.extraOrders)} more orders over the same period
                </div>
              </div>
            </ToolCard>
          </div>
        </div>
      </ToolContainer>

      {tool ? <HowItWorks steps={tool.steps} /> : null}
      {tool ? <FaqSection faqs={tool.faqs} /> : null}
      <RelatedTools slug={SLUG} />
      {tool ? (
        <ToolCta
          title={tool.cta}
          description="Most of the leak sits between cart and payment. RateUp connects to Shopify and sends an automatic WhatsApp reminder when a checkout is abandoned — with the cart link, so getting back takes one tap."
        />
      ) : null}
    </>
  );
}
