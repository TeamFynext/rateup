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
} from "../shared/ToolSections.tsx";

const SLUG = "clv-calculator";

const DEFAULTS = {
  aov: 1200,
  frequency: 3,
  totalSales: 8,
  margin: 55,
  cac: 800,
};

type Inputs = typeof DEFAULTS;

const FIELDS: { key: keyof Inputs; label: string }[] = [
  { key: "aov", label: "Average Order Value ₹" },
  { key: "frequency", label: "Purchase Frequency (per year)" },
  { key: "totalSales", label: "Lifetime Number of Sales Per Customer" },
  { key: "margin", label: "Gross Margin %" },
  { key: "cac", label: "Customer Acquisition Cost ₹" },
];

const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

export default function ClvCalculator() {
  const tool = getToolBySlug(SLUG);
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [uplift, setUplift] = useState(0);

  const set = (key: keyof Inputs, raw: string) => {
    const parsed = Number(raw.replace(/[^\d.]/g, ""));
    setInputs((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const result = useMemo(() => {
    const clvBase = inputs.aov * inputs.totalSales;
    const effectiveFrequency = inputs.frequency * (1 + uplift / 100);
    const upliftedTotalSales = inputs.totalSales * (1 + uplift / 100);
    const clvUplifted = inputs.aov * upliftedTotalSales;
    const lifetimeGrossProfit = clvUplifted * (inputs.margin / 100);

    const ltvCacRatio = lifetimeGrossProfit / (inputs.cac || 1); // prevent division by zero

    const monthlyProfitPerCustomer = inputs.aov * (effectiveFrequency / 12) * (inputs.margin / 100);
    const paybackMonths = monthlyProfitPerCustomer > 0 ? inputs.cac / monthlyProfitPerCustomer : 0;

    let ratioColor = "bg-[#3A4A61] text-white"; // default
    let ratioLabel = "Unknown";

    if (ltvCacRatio < 1) {
      ratioColor = "bg-[#FFEBEB] text-[#D32F2F]";
      ratioLabel = "Losing money";
    } else if (ltvCacRatio < 3) {
      ratioColor = "bg-[#FFF9C4] text-[#F57F17]";
      ratioLabel = "Break even";
    } else if (ltvCacRatio <= 5) {
      ratioColor = "bg-[#E8F5E9] text-[#2E7D32]";
      ratioLabel = "Healthy";
    } else {
      ratioColor = "bg-[#E3F2FD] text-[#1565C0]";
      ratioLabel = "Under-investing";
    }

    return {
      clvBase,
      effectiveFrequency,
      clvUplifted,
      lifetimeGrossProfit,
      ltvCacRatio,
      ratioColor,
      ratioLabel,
      paybackMonths,
      upliftedTotalSales,
    };
  }, [inputs, uplift]);

  return (
    <>
      <ToolContainer className="pt-7">
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.15fr]">
          <ToolCard
            title="Your metrics"
            subtitle="Enter your average order, margin, and acquisition costs to calculate CLV."
          >
            <div className="grid gap-3.5 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <Field key={field.key} label={field.label} htmlFor={`clv-${field.key}`}>
                  <TextControl
                    id={`clv-${field.key}`}
                    inputMode="decimal"
                    value={inputs[field.key]}
                    onChange={(event) => set(field.key, event.target.value)}
                  />
                </Field>
              ))}
            </div>

            <div className="mt-8">
              <label
                htmlFor="clv-uplift"
                className="mb-2.5 flex justify-between text-[12.5px] font-bold text-muted-foreground"
              >
                <span>Retention Uplift</span>
                <span className="text-primary">{uplift}% improvement</span>
              </label>
              <input
                id="clv-uplift"
                type="range"
                min={0}
                max={30}
                step={1}
                value={uplift}
                onChange={(event) => setUplift(Number(event.target.value))}
                className="w-full accent-primary"
              />
              <p className="mt-2 text-[11.5px] text-muted-foreground">
                Model the impact of increasing your purchase frequency.
              </p>
            </div>

            <InfoNote>
              Your customers currently buy <b>{inputs.frequency.toFixed(1)} times</b> a year.
              {uplift > 0 &&
                ` With a ${uplift}% uplift, that becomes ${result.effectiveFrequency.toFixed(2)} times.`}
            </InfoNote>
          </ToolCard>

          <div className="flex flex-col gap-3.5">
            <ResultPanel eyebrow="Customer Lifetime Value">
              <ResultFigure
                value={inr(result.clvUplifted)}
                note={`Based on ${result.upliftedTotalSales.toFixed(1)} lifetime sales`}
              />

              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 pb-2">
                <div>
                  <div className="text-[14px] font-bold text-white">LTV:CAC Ratio</div>
                  <div className="text-[11.5px] text-white/55">Lifetime gross profit / CAC</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[15px] font-bold text-[#EAF4FF]">
                    {result.ltvCacRatio.toFixed(1)}:1
                  </div>
                  <div
                    className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${result.ratioColor}`}
                  >
                    {result.ratioLabel}
                  </div>
                </div>
              </div>

              <ResultRows
                rows={[
                  {
                    label: "Base CLV",
                    detail: "Without retention uplift",
                    cost: inr(result.clvBase),
                  },
                  {
                    label: "Lifetime Gross Profit",
                    detail: `CLV × ${inputs.margin}% margin`,
                    cost: inr(result.lifetimeGrossProfit),
                  },
                  {
                    label: "Months to Payback",
                    detail: "Time to recover CAC",
                    cost: `${result.paybackMonths.toFixed(1)} mos`,
                  },
                ]}
              />
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
          description="RateUp increases customer lifetime value by delivering targeted post-purchase retention nudges."
        />
      ) : null}
    </>
  );
}
