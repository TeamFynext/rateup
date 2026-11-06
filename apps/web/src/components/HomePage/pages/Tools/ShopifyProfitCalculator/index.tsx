import { useMemo, useState } from "react";

import { getToolBySlug } from "@/config/tools.ts";
import { cn } from "@/lib/utils.ts";

import {
  SHOPIFY_PLAN_NAMES as PLAN_NAMES,
  SHOPIFY_PLANS as PLANS,
  type ShopifyPlan as Plan,
} from "../shared/shopifyPlans.ts";
import {
  FaqSection,
  Field,
  HowItWorks,
  RelatedTools,
  ResultFigure,
  ResultPanel,
  ResultRows,
  SelectControl,
  TextControl,
  ToolCard,
  ToolContainer,
  ToolCta,
  WarnNote,
} from "../shared/ToolSections.tsx";

const SLUG = "shopify-profit-calculator";

const DEFAULTS = {
  orders: 1500,
  aov: 1200,
  returnRate: 15,
  cogsPct: 35,
  shipping: 70,
  returnShipping: 70,
  packaging: 25,
  gatewayPct: 2,
  planFee: PLANS.Basic.fee,
  txnPct: PLANS.Basic.txnPct,
  apps: 4000,
  adSpend: 300000,
  otherFixed: 100000,
};

type Inputs = typeof DEFAULTS;

const SECTIONS: { title: string; fields: { key: keyof Inputs; label: string }[] }[] = [
  {
    title: "Sales this month",
    fields: [
      { key: "orders", label: "Orders placed" },
      { key: "aov", label: "Average order value ₹" },
      { key: "returnRate", label: "Returns + RTO % of orders" },
      { key: "cogsPct", label: "Product cost % of price" },
    ],
  },
  {
    title: "Cost per order",
    fields: [
      { key: "shipping", label: "Shipping per order ₹" },
      { key: "returnShipping", label: "Return shipping per return ₹" },
      { key: "packaging", label: "Packaging per order ₹" },
      { key: "gatewayPct", label: "Payment gateway fee %" },
    ],
  },
  {
    title: "Monthly costs",
    fields: [
      { key: "planFee", label: "Shopify plan ₹ / month" },
      { key: "txnPct", label: "Shopify transaction fee %" },
      { key: "apps", label: "Shopify apps ₹ / month" },
      { key: "adSpend", label: "Ad spend ₹ / month" },
      { key: "otherFixed", label: "Salaries, rent, other ₹ / month" },
    ],
  },
];

const inr = (value: number) =>
  `${value < 0 ? "−" : ""}₹${Math.abs(Math.round(value)).toLocaleString("en-IN")}`;
const count = (value: number) => Math.round(value).toLocaleString("en-IN");
const pct = (value: number) => `${value.toFixed(1)}%`;

export default function ShopifyProfitCalculator() {
  const tool = getToolBySlug(SLUG);
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [plan, setPlan] = useState<Plan | "custom">("Basic");

  const set = (key: keyof Inputs, raw: string) => {
    const parsed = Number(raw.replace(/[^\d.]/g, ""));
    setInputs((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? parsed : 0,
    }));
    // Typing over a plan's numbers means they no longer match that plan.
    if (key === "planFee" || key === "txnPct") setPlan("custom");
  };

  const pickPlan = (next: Plan) => {
    setPlan(next);
    setInputs((current) => ({ ...current, planFee: PLANS[next].fee, txnPct: PLANS[next].txnPct }));
  };

  const result = useMemo(() => {
    const i = inputs;

    // Returned and RTO orders bring no revenue; the stock comes back, but shipping
    // both ways and the packaging are lost.
    const returned = (i.orders * i.returnRate) / 100;
    const delivered = i.orders - returned;
    const revenue = delivered * i.aov;

    const productCost = (revenue * i.cogsPct) / 100;
    const shipping = i.orders * i.shipping + returned * i.returnShipping;
    const packaging = i.orders * i.packaging;
    const gatewayFees = (revenue * i.gatewayPct) / 100;
    const shopifyTxn = (revenue * i.txnPct) / 100;

    const contribution = revenue - productCost - shipping - packaging - gatewayFees - shopifyTxn;
    const fixed = i.planFee + i.apps + i.adSpend + i.otherFixed;
    const netProfit = contribution - fixed;

    const perOrder = i.orders > 0 ? contribution / i.orders : 0;
    const breakEven = perOrder > 0 ? fixed / perOrder : Infinity;

    // Plan fee + transaction fee on this month's revenue, for each plan.
    const planCosts = PLAN_NAMES.map((name) => ({
      name,
      cost: PLANS[name].fee + (revenue * PLANS[name].txnPct) / 100,
    }));
    const cheapest = planCosts.reduce((best, row) => (row.cost < best.cost ? row : best));

    return {
      returned,
      delivered,
      revenue,
      productCost,
      shipping,
      packaging,
      paymentFees: gatewayFees + shopifyTxn,
      shopifyTxn,
      contribution,
      fixed,
      netProfit,
      netMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      perOrder,
      breakEven,
      roas: i.adSpend > 0 ? revenue / i.adSpend : 0,
      cac: i.orders > 0 ? i.adSpend / i.orders : 0,
      planCosts,
      cheapest,
    };
  }, [inputs]);

  const current = plan === "custom" ? undefined : result.planCosts.find((p) => p.name === plan);
  const planSaving = current ? current.cost - result.cheapest.cost : 0;

  const stats = [
    {
      label: "Break-even orders",
      value: result.breakEven === Infinity ? "Never" : count(Math.ceil(result.breakEven)),
      note: "a month, to cover fixed costs",
    },
    {
      label: "Profit per order",
      value: inr(result.perOrder),
      note: "before fixed costs",
    },
    {
      label: "ROAS",
      value: result.roas > 0 ? `${result.roas.toFixed(2)}×` : "—",
      note: "revenue ÷ ad spend",
    },
    {
      label: "Ad cost per order",
      value: inr(result.cac),
      note: "ad spend ÷ orders",
    },
  ];

  return (
    <>
      <ToolContainer className="pt-7">
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.15fr]">
          <ToolCard
            title="Your month"
            subtitle="Use last month's numbers from Shopify Analytics and your bank statement. Every field is editable."
          >
            <Field label="Shopify plan" htmlFor="sp-plan">
              <SelectControl
                id="sp-plan"
                value={plan}
                onChange={(event) => {
                  if (event.target.value !== "custom") pickPlan(event.target.value as Plan);
                }}
              >
                {PLAN_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name} — ₹{count(PLANS[name].fee)}/month, {PLANS[name].txnPct}% transaction fee
                  </option>
                ))}
                <option value="custom">Custom — my own numbers</option>
              </SelectControl>
            </Field>

            {SECTIONS.map((section) => (
              <div key={section.title} className="mt-6">
                <div className="mb-3 text-[11.5px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase">
                  {section.title}
                </div>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  {section.fields.map((field) => (
                    <Field key={field.key} label={field.label} htmlFor={`sp-${field.key}`}>
                      <TextControl
                        id={`sp-${field.key}`}
                        inputMode="decimal"
                        value={inputs[field.key]}
                        onChange={(event) => set(field.key, event.target.value)}
                      />
                    </Field>
                  ))}
                </div>
              </div>
            ))}
          </ToolCard>

          <div className="flex flex-col gap-3.5">
            <ResultPanel eyebrow="Net profit this month">
              <ResultFigure
                value={inr(result.netProfit)}
                note={
                  <span className={result.netProfit >= 0 ? "text-[#7DE3A8]" : "text-[#FF9C9C]"}>
                    {pct(result.netMargin)} net margin · {inr(result.netProfit * 12)} a year
                  </span>
                }
              />

              <ResultRows
                rows={[
                  {
                    label: "Revenue",
                    detail: `${count(result.delivered)} delivered orders × ${inr(inputs.aov)}`,
                    cost: inr(result.revenue),
                  },
                  {
                    label: "− Product cost",
                    detail: `${inputs.cogsPct}% of revenue`,
                    cost: inr(result.productCost),
                  },
                  {
                    label: "− Shipping & packaging",
                    detail: `Incl. ${count(result.returned)} returns shipped back`,
                    cost: inr(result.shipping + result.packaging),
                  },
                  {
                    label: "− Payment fees",
                    detail: `Gateway ${inputs.gatewayPct}% + Shopify ${inputs.txnPct}%`,
                    cost: inr(result.paymentFees),
                  },
                  {
                    label: "= Contribution",
                    detail: "What orders earn before fixed costs",
                    cost: inr(result.contribution),
                  },
                  {
                    label: "− Ad spend",
                    detail: "",
                    cost: inr(inputs.adSpend),
                  },
                  {
                    label: "− Shopify plan & apps",
                    detail: "",
                    cost: inr(inputs.planFee + inputs.apps),
                  },
                  {
                    label: "− Salaries, rent, other",
                    detail: "",
                    cost: inr(inputs.otherFixed),
                  },
                ]}
              />

              <div className="mt-5 grid grid-cols-2 gap-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-white/[0.06] p-4">
                    <div className="text-[10.5px] font-extrabold tracking-[0.1em] text-ru-blue-300 uppercase">
                      {stat.label}
                    </div>
                    <div className="mt-1 font-display text-[22px] font-black text-white">
                      {stat.value}
                    </div>
                    <div className="text-[11.5px] text-white/55">{stat.note}</div>
                  </div>
                ))}
              </div>
            </ResultPanel>

            {result.perOrder <= 0 ? (
              <WarnNote>
                Each order loses money before fixed costs are paid, so more orders make the loss
                bigger. Fix price, product cost or returns before spending more on ads.
              </WarnNote>
            ) : null}

            <ToolCard
              title="Is your Shopify plan the cheapest?"
              subtitle="Plan fee + Shopify's transaction fee on this month's revenue. Shopify India list prices, billed monthly."
            >
              <div className="flex flex-col gap-2">
                {result.planCosts.map((row) => {
                  const isCheapest = row.name === result.cheapest.name;
                  return (
                    <div
                      key={row.name}
                      className={cn(
                        "flex items-center justify-between rounded-[10px] border px-4 py-3",
                        isCheapest ? "border-[#7DD3A5] bg-[#E7F9EE]" : "border-border",
                      )}
                    >
                      <div>
                        <div className="text-[14px] font-bold text-foreground">
                          {row.name}
                          {row.name === plan ? (
                            <span className="ml-2 text-[11.5px] font-semibold text-muted-foreground">
                              your plan
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11.5px] text-muted-foreground">
                          ₹{count(PLANS[row.name].fee)} + {PLANS[row.name].txnPct}% of revenue
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[15px] font-bold text-foreground">{inr(row.cost)}</div>
                        {isCheapest ? (
                          <div className="text-[11.5px] font-bold text-[#0F7A42]">Cheapest</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 mb-0 text-[13px] leading-[1.55] text-muted-foreground">
                {planSaving > 0
                  ? `Switching to ${result.cheapest.name} would save about ${inr(planSaving)} a month at this revenue.`
                  : current
                    ? "You are on the cheapest plan for this revenue."
                    : "Pick your plan above to compare it."}
              </p>
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
          description="Repeat customers cost nothing to acquire. RateUp connects to Shopify and runs WhatsApp campaigns, loyalty points and win-back messages, so more of next month's orders come without ad spend."
        />
      ) : null}
    </>
  );
}
