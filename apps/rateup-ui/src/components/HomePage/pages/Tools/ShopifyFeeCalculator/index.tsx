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
  SelectControl,
  TextControl,
  ToolCard,
  ToolContainer,
  ToolCta,
} from "../shared/ToolSections.tsx";

const SLUG = "shopify-fee-calculator";

const PLAN_RATES = {
  Basic: {
    online: { pct: 2.9, fixed: 0.3 },
    inPerson: { pct: 2.7, fixed: 0.0 },
    externalTxnFee: 2.0,
  },
  Shopify: {
    online: { pct: 2.6, fixed: 0.3 },
    inPerson: { pct: 2.5, fixed: 0.0 },
    externalTxnFee: 1.0,
  },
  Advanced: {
    online: { pct: 2.4, fixed: 0.3 },
    inPerson: { pct: 2.4, fixed: 0.0 },
    externalTxnFee: 0.6,
  },
  Plus: {
    online: { pct: 2.15, fixed: 0.3 },
    inPerson: { pct: 2.15, fixed: 0.0 },
    externalTxnFee: 0.2,
  },
};

type ShopifyPlan = keyof typeof PLAN_RATES;
type GatewayType = "Shopify Payments" | "External Gateway";
type PaymentType = "Online" | "In-Person";

const DEFAULTS = {
  currency: "$",
  salePrice: 100,
  quantity: 1,
  cogs: 30,
  shipping: 5,
  plan: "Basic" as ShopifyPlan,
  gateway: "Shopify Payments" as GatewayType,
  paymentType: "Online" as PaymentType,
  appFeesPct: 0,
  otherFixed: 0,
  otherVariablePct: 0,
  extGatewayPct: 2.9,
  extGatewayFixed: 0.3,
};

type Inputs = typeof DEFAULTS;

export default function ShopifyFeeCalculator() {
  const tool = getToolBySlug(SLUG);
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);

  const set = (key: keyof Inputs, raw: string) => {
    if (key === "currency" || key === "plan" || key === "gateway" || key === "paymentType") {
      setInputs((current) => ({ ...current, [key]: raw }));
      return;
    }
    const parsed = Number(raw.replace(/[^\d.-]/g, ""));
    setInputs((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const fmt = (value: number) => {
    return `${inputs.currency}${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const reset = () => setInputs(DEFAULTS);

  const result = useMemo(() => {
    const grossRevenue = inputs.salePrice * inputs.quantity;
    const cogsTotal = inputs.cogs * inputs.quantity; // assuming cogs is per item
    const shippingCost = inputs.shipping;

    let shopifyTxnFee = 0;
    let paymentProcessingFee = 0;

    const planRates = PLAN_RATES[inputs.plan];

    if (inputs.gateway === "Shopify Payments") {
      const rate = planRates[inputs.paymentType === "Online" ? "online" : "inPerson"];
      paymentProcessingFee = (grossRevenue * rate.pct) / 100 + rate.fixed;
      shopifyTxnFee = 0;
    } else {
      // External Gateway
      paymentProcessingFee = (grossRevenue * inputs.extGatewayPct) / 100 + inputs.extGatewayFixed;
      shopifyTxnFee = (grossRevenue * planRates.externalTxnFee) / 100;
    }

    const appFeesTotal = (grossRevenue * inputs.appFeesPct) / 100;
    const otherVariableTotal = (grossRevenue * inputs.otherVariablePct) / 100;
    const otherFixedTotal = inputs.otherFixed;

    const totalFees =
      cogsTotal +
      shippingCost +
      shopifyTxnFee +
      paymentProcessingFee +
      appFeesTotal +
      otherFixedTotal +
      otherVariableTotal;

    const netProfit = grossRevenue - totalFees;

    return {
      grossRevenue,
      cogsTotal,
      shippingCost,
      shopifyTxnFee,
      paymentProcessingFee,
      appFeesTotal,
      otherFixedTotal,
      otherVariableTotal,
      netProfit,
    };
  }, [inputs]);

  return (
    <>
      <ToolContainer className="pt-7">
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.15fr]">
          <ToolCard title="Transaction Details" subtitle="Calculate profit for a single order.">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Currency" htmlFor="shopify-currency">
                <SelectControl
                  id="shopify-currency"
                  value={inputs.currency}
                  onChange={(e) => set("currency", e.target.value)}
                >
                  <option value="$">$ (USD)</option>
                  <option value="₹">₹ (INR)</option>
                  <option value="€">€ (EUR)</option>
                  <option value="£">£ (GBP)</option>
                </SelectControl>
              </Field>

              <div className="hidden sm:block" />

              <Field label="Sale Price (per item)" htmlFor="shopify-price">
                <TextControl
                  id="shopify-price"
                  inputMode="decimal"
                  value={inputs.salePrice}
                  onChange={(e) => set("salePrice", e.target.value)}
                />
              </Field>

              <Field label="Quantity" htmlFor="shopify-quantity">
                <TextControl
                  id="shopify-quantity"
                  inputMode="numeric"
                  value={inputs.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                />
              </Field>

              <Field label="Cost of Goods Sold (COGS)" htmlFor="shopify-cogs">
                <TextControl
                  id="shopify-cogs"
                  inputMode="decimal"
                  value={inputs.cogs}
                  onChange={(e) => set("cogs", e.target.value)}
                />
              </Field>

              <Field label="Shipping Cost (Paid by Seller)" htmlFor="shopify-shipping">
                <TextControl
                  id="shopify-shipping"
                  inputMode="decimal"
                  value={inputs.shipping}
                  onChange={(e) => set("shipping", e.target.value)}
                />
              </Field>

              <Field label="Shopify Plan" htmlFor="shopify-plan">
                <SelectControl
                  id="shopify-plan"
                  value={inputs.plan}
                  onChange={(e) => set("plan", e.target.value)}
                >
                  <option value="Basic">Basic</option>
                  <option value="Shopify">Shopify</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Plus">Plus</option>
                </SelectControl>
              </Field>

              <Field label="Payment Gateway" htmlFor="shopify-gateway">
                <SelectControl
                  id="shopify-gateway"
                  value={inputs.gateway}
                  onChange={(e) => set("gateway", e.target.value)}
                >
                  <option value="Shopify Payments">Shopify Payments</option>
                  <option value="External Gateway">External Gateway</option>
                </SelectControl>
              </Field>

              <Field label="Payment Type" htmlFor="shopify-payment-type">
                <SelectControl
                  id="shopify-payment-type"
                  value={inputs.paymentType}
                  onChange={(e) => set("paymentType", e.target.value)}
                >
                  <option value="Online">Online</option>
                  <option value="In-Person">In-Person</option>
                </SelectControl>
              </Field>

              <div className="hidden sm:block" />

              {inputs.gateway === "External Gateway" && (
                <>
                  <Field label="External Gateway Fee (%)" htmlFor="shopify-ext-pct">
                    <TextControl
                      id="shopify-ext-pct"
                      inputMode="decimal"
                      value={inputs.extGatewayPct}
                      onChange={(e) => set("extGatewayPct", e.target.value)}
                    />
                  </Field>
                  <Field label="External Gateway Fixed Fee" htmlFor="shopify-ext-fixed">
                    <TextControl
                      id="shopify-ext-fixed"
                      inputMode="decimal"
                      value={inputs.extGatewayFixed}
                      onChange={(e) => set("extGatewayFixed", e.target.value)}
                    />
                  </Field>
                </>
              )}

              <Field label="App Fees (%)" htmlFor="shopify-app-fees">
                <TextControl
                  id="shopify-app-fees"
                  inputMode="decimal"
                  value={inputs.appFeesPct}
                  onChange={(e) => set("appFeesPct", e.target.value)}
                />
              </Field>

              <Field label="Other Variable Fees (%)" htmlFor="shopify-other-var">
                <TextControl
                  id="shopify-other-var"
                  inputMode="decimal"
                  value={inputs.otherVariablePct}
                  onChange={(e) => set("otherVariablePct", e.target.value)}
                />
              </Field>

              <Field label="Other Fixed Fees (per tx)" htmlFor="shopify-other-fixed">
                <TextControl
                  id="shopify-other-fixed"
                  inputMode="decimal"
                  value={inputs.otherFixed}
                  onChange={(e) => set("otherFixed", e.target.value)}
                />
              </Field>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={reset}
                className="w-full rounded-full border border-border bg-card px-4 py-3 text-[14px] font-bold text-foreground transition-colors hover:bg-muted"
              >
                Reset
              </button>
            </div>
          </ToolCard>

          <div className="flex flex-col gap-3.5">
            <ResultPanel eyebrow="Transaction Summary">
              <ResultFigure value={fmt(result.netProfit)} note="Net Profit" />

              <div className="mt-5 border-t border-white/10 pt-4 pb-2" />

              <ResultRows
                rows={[
                  {
                    label: "Gross Sale Revenue",
                    detail: "Sale Price × Quantity",
                    cost: fmt(result.grossRevenue),
                  },
                  {
                    label: "Cost of Goods Sold",
                    detail: "COGS × Quantity",
                    cost: `-${fmt(result.cogsTotal)}`,
                  },
                  {
                    label: "Shipping Cost",
                    detail: "Paid by seller",
                    cost: `-${fmt(result.shippingCost)}`,
                  },
                  {
                    label: "Shopify Transaction Fee",
                    detail:
                      inputs.gateway === "Shopify Payments"
                        ? "0% on Shopify Payments"
                        : `${PLAN_RATES[inputs.plan].externalTxnFee}% on external gateway`,
                    cost: `-${fmt(result.shopifyTxnFee)}`,
                  },
                  {
                    label: "Payment Processing Fee",
                    detail:
                      inputs.gateway === "Shopify Payments"
                        ? `${PLAN_RATES[inputs.plan][inputs.paymentType === "Online" ? "online" : "inPerson"].pct}% + ${inputs.currency}${PLAN_RATES[inputs.plan][inputs.paymentType === "Online" ? "online" : "inPerson"].fixed}`
                        : `${inputs.extGatewayPct}% + ${inputs.currency}${inputs.extGatewayFixed}`,
                    cost: `-${fmt(result.paymentProcessingFee)}`,
                  },
                  {
                    label: "App Fees",
                    detail: `${inputs.appFeesPct}%`,
                    cost: `-${fmt(result.appFeesTotal)}`,
                  },
                  {
                    label: "Other Fixed Fees",
                    detail: "Per transaction",
                    cost: `-${fmt(result.otherFixedTotal)}`,
                  },
                  {
                    label: "Other Variable Fees",
                    detail: `${inputs.otherVariablePct}%`,
                    cost: `-${fmt(result.otherVariableTotal)}`,
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
          description="Reduce your cost per acquisition and increase LTV using RateUp's automated WhatsApp engagement."
        />
      ) : null}
    </>
  );
}
