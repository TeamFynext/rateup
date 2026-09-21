import { useMemo, useState } from "react";

import { getToolBySlug } from "@/config/tools.ts";

import {
  FaqSection,
  Field,
  HowItWorks,
  RelatedTools,
  ResultFigure,
  ResultPanel,
  ResultRows,
  TextControl,
  ToolCard,
  ToolContainer,
  ToolCta,
} from "../shared/ToolSections.tsx";

const SLUG = "profit-margin-calculator";

const DEFAULTS = {
  sellingPrice: 1200,
  cogs: 420,
  shipping: 70,
  packaging: 25,
  adSpend: 150,
  gatewayPct: 2,
  platformPct: 0,
};

type Inputs = typeof DEFAULTS;

const FIELDS: { key: keyof Inputs; label: string }[] = [
  { key: "sellingPrice", label: "Selling Price ₹" },
  { key: "cogs", label: "Cost of Goods Sold (COGS) ₹" },
  { key: "shipping", label: "Shipping & Handling ₹" },
  { key: "packaging", label: "Packaging ₹" },
  { key: "adSpend", label: "Ad Spend per Order ₹" },
  { key: "gatewayPct", label: "Payment Gateway Fee %" },
  { key: "platformPct", label: "Platform / Marketplace Fee %" },
];

const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const pct = (value: number) => `${value.toFixed(1)}%`;

export default function ProfitMarginCalculator() {
  const tool = getToolBySlug(SLUG);
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);

  const set = (key: keyof Inputs, raw: string) => {
    const parsed = Number(raw.replace(/[^\d.]/g, ""));
    setInputs((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const result = useMemo(() => {
    const { sellingPrice, cogs, shipping, packaging, adSpend, gatewayPct, platformPct } = inputs;

    // Prevent division by zero for margins where sellingPrice is denominator
    const sp = Math.max(sellingPrice, 1);

    const gatewayFee = (sp * gatewayPct) / 100;
    const platformFee = (sp * platformPct) / 100;
    const grossProfit = sp - cogs;
    const grossMargin = (grossProfit / sp) * 100;

    const totalCosts = cogs + shipping + packaging + adSpend + gatewayFee + platformFee;
    const netProfit = sp - totalCosts;
    const netMargin = (netProfit / sp) * 100;

    const markup = cogs > 0 ? ((sp - cogs) / cogs) * 100 : 0;

    const netMarginBeforeAds = (sp - totalCosts + adSpend) / sp;
    const breakevenRoas = netMarginBeforeAds > 0 ? 1 / netMarginBeforeAds : Infinity;

    return {
      gatewayFee,
      platformFee,
      grossProfit,
      grossMargin,
      totalCosts,
      netProfit,
      netMargin,
      markup,
      breakevenRoas,
    };
  }, [inputs]);

  let marginColor = "text-red-600";
  if (result.netMargin > 15) {
    marginColor = "text-green-600";
  } else if (result.netMargin >= 5) {
    marginColor = "text-yellow-600";
  }

  return (
    <>
      <ToolContainer className="pt-7">
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.15fr]">
          <ToolCard
            title="Your numbers"
            subtitle="Enter your product and operational costs to calculate margins per order."
          >
            <div className="grid gap-3.5 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <Field key={field.key} label={field.label} htmlFor={`pmc-${field.key}`}>
                  <TextControl
                    id={`pmc-${field.key}`}
                    inputMode="decimal"
                    value={inputs[field.key]}
                    onChange={(event) => set(field.key, event.target.value)}
                  />
                </Field>
              ))}
            </div>
          </ToolCard>

          <div className="flex flex-col gap-3.5">
            <ResultPanel eyebrow="Per Order Economics">
              <ResultFigure
                value={inr(result.netProfit)}
                note={<span className={marginColor}>{pct(result.netMargin)} Net Margin</span>}
              />

              <ResultRows
                rows={[
                  {
                    label: "Selling Price",
                    detail: "",
                    cost: inr(inputs.sellingPrice),
                  },
                  {
                    label: "− COGS",
                    detail: "",
                    cost: inr(inputs.cogs),
                  },
                  {
                    label: "= Gross Profit",
                    detail: `${pct(result.grossMargin)} gross margin`,
                    cost: inr(result.grossProfit),
                  },
                  {
                    label: "− Shipping",
                    detail: "",
                    cost: inr(inputs.shipping),
                  },
                  {
                    label: "− Packaging",
                    detail: "",
                    cost: inr(inputs.packaging),
                  },
                  {
                    label: "− Ad Spend",
                    detail: "",
                    cost: inr(inputs.adSpend),
                  },
                  {
                    label: "− Gateway Fee",
                    detail: `${inputs.gatewayPct}%`,
                    cost: inr(result.gatewayFee),
                  },
                  {
                    label: "− Platform Fee",
                    detail: `${inputs.platformPct}%`,
                    cost: inr(result.platformFee),
                  },
                  {
                    label: "= Net Profit",
                    detail: `${pct(result.netMargin)} net margin`,
                    cost: inr(result.netProfit),
                  },
                ]}
              />

              <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-border/50 bg-muted/30 p-4">
                <div>
                  <div className="text-[11.5px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase">
                    Markup
                  </div>
                  <div className="mt-1 font-display text-[22px] font-black">
                    {pct(result.markup)}
                  </div>
                </div>
                <div>
                  <div className="text-[11.5px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase">
                    Breakeven ROAS
                  </div>
                  <div className="mt-1 font-display text-[22px] font-black">
                    {result.breakevenRoas === Infinity
                      ? "∞"
                      : `${result.breakevenRoas.toFixed(2)}×`}
                  </div>
                </div>
              </div>
            </ResultPanel>
          </div>
        </div>
      </ToolContainer>

      {tool ? <HowItWorks steps={tool.steps} /> : null}
      {tool ? <FaqSection faqs={tool.faqs} /> : null}
      <RelatedTools slug={SLUG} />
      {tool ? (
        <ToolCta
          title={tool.cta}
          description="Understanding your unit economics is just the first step. RateUp helps you improve your net margins by recovering lost revenue from RTOs."
        />
      ) : null}
    </>
  );
}
