import { useMemo, useState } from "react";

import { getToolBySlug } from "@/config/tools.ts";

import { SHOPIFY_PLAN_NAMES, SHOPIFY_PLANS, type ShopifyPlan } from "../shared/shopifyPlans.ts";
import {
  FaqSection,
  Field,
  HowItWorks,
  InfoNote,
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

/**
 * India: Shopify Payments isn't offered, so every order goes through a third-party
 * gateway and pays Shopify's transaction fee on top. US: Shopify Payments is the
 * default and waives that fee. Card rates differ in every other country, so only
 * these two are offered rather than showing US rates under a € or £ sign.
 */
type Region = "IN" | "US";
type Gateway = "shopify-payments" | "third-party";

/** Shopify Payments US online card rates, by plan. List rates; Shopify changes them. */
const US_CARD_RATES: Record<ShopifyPlan, { pct: number; fixed: number }> = {
  Basic: { pct: 2.9, fixed: 0.3 },
  Grow: { pct: 2.7, fixed: 0.3 },
  Advanced: { pct: 2.5, fixed: 0.3 },
};

const GST_PCT = 18;

const REGION_DEFAULTS: Record<Region, Inputs> = {
  IN: {
    salePrice: 1200,
    quantity: 1,
    cogs: 420,
    shipping: 70,
    gatewayPct: 2,
    gatewayFixed: 0,
    appFeesPct: 0,
    otherFixed: 0,
    ordersPerMonth: 1000,
  },
  US: {
    salePrice: 60,
    quantity: 1,
    cogs: 20,
    shipping: 6,
    gatewayPct: 2.9,
    gatewayFixed: 0.3,
    appFeesPct: 0,
    otherFixed: 0,
    ordersPerMonth: 1000,
  },
};

interface Inputs {
  salePrice: number;
  quantity: number;
  cogs: number;
  shipping: number;
  gatewayPct: number;
  gatewayFixed: number;
  appFeesPct: number;
  otherFixed: number;
  ordersPerMonth: number;
}

export default function ShopifyFeeCalculator() {
  const tool = getToolBySlug(SLUG);
  const [region, setRegion] = useState<Region>("IN");
  const [plan, setPlan] = useState<ShopifyPlan>("Basic");
  const [gateway, setGateway] = useState<Gateway>("third-party");
  const [addGst, setAddGst] = useState(true);
  const [inputs, setInputs] = useState<Inputs>(REGION_DEFAULTS.IN);

  const currency = region === "IN" ? "₹" : "$";
  const locale = region === "IN" ? "en-IN" : "en-US";
  // India has no Shopify Payments, so the gateway choice only exists in the US.
  const usesShopifyPayments = region === "US" && gateway === "shopify-payments";
  const gstApplies = region === "IN" && addGst;

  const set = (key: keyof Inputs, raw: string) => {
    const parsed = Number(raw.replace(/[^\d.]/g, ""));
    setInputs((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const pickRegion = (next: Region) => {
    setRegion(next);
    setGateway(next === "US" ? "shopify-payments" : "third-party");
    setInputs(REGION_DEFAULTS[next]);
  };

  const reset = () => {
    setPlan("Basic");
    setAddGst(true);
    setGateway(region === "US" ? "shopify-payments" : "third-party");
    setInputs(REGION_DEFAULTS[region]);
  };

  const fmt = (value: number) =>
    `${value < 0 ? "−" : ""}${currency}${Math.abs(value).toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const result = useMemo(() => {
    const gross = inputs.salePrice * inputs.quantity;
    const cogsTotal = inputs.cogs * inputs.quantity;

    const processingRate = usesShopifyPayments
      ? US_CARD_RATES[plan]
      : { pct: inputs.gatewayPct, fixed: inputs.gatewayFixed };
    const processing = (gross * processingRate.pct) / 100 + processingRate.fixed;
    const shopifyTxnPct = usesShopifyPayments ? 0 : SHOPIFY_PLANS[plan].txnPct;
    const shopifyTxn = (gross * shopifyTxnPct) / 100;
    const gst = gstApplies ? ((processing + shopifyTxn) * GST_PCT) / 100 : 0;
    const apps = (gross * inputs.appFeesPct) / 100;

    const fees = processing + shopifyTxn + gst + apps + inputs.otherFixed;
    const netProfit = gross - cogsTotal - inputs.shipping - fees;

    return {
      gross,
      cogsTotal,
      processingRate,
      processing,
      shopifyTxnPct,
      shopifyTxn,
      gst,
      apps,
      fees,
      feeShare: gross > 0 ? (fees / gross) * 100 : 0,
      netProfit,
      netMargin: gross > 0 ? (netProfit / gross) * 100 : 0,
      monthlyFees: fees * inputs.ordersPerMonth,
      monthlyShopifyTxn:
        (shopifyTxn + (gstApplies ? (shopifyTxn * GST_PCT) / 100 : 0)) * inputs.ordersPerMonth,
    };
  }, [inputs, plan, usesShopifyPayments, gstApplies]);

  const numberField = (key: keyof Inputs, label: string, hint?: string) => (
    <Field key={key} label={label} hint={hint} htmlFor={`fee-${key}`}>
      <TextControl
        id={`fee-${key}`}
        inputMode="decimal"
        value={inputs[key]}
        onChange={(event) => set(key, event.target.value)}
      />
    </Field>
  );

  return (
    <>
      <ToolContainer className="pt-7">
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.15fr]">
          <ToolCard title="Your order" subtitle="Fees and profit for a single Shopify order.">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Store location" htmlFor="fee-region">
                <SelectControl
                  id="fee-region"
                  value={region}
                  onChange={(event) => pickRegion(event.target.value as Region)}
                >
                  <option value="IN">India (₹)</option>
                  <option value="US">United States ($)</option>
                </SelectControl>
              </Field>
              <Field label="Shopify plan" htmlFor="fee-plan">
                <SelectControl
                  id="fee-plan"
                  value={plan}
                  onChange={(event) => setPlan(event.target.value as ShopifyPlan)}
                >
                  {SHOPIFY_PLAN_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </SelectControl>
              </Field>

              {numberField("salePrice", `Sale price per item ${currency}`)}
              {numberField("quantity", "Quantity")}
              {numberField("cogs", `Product cost per item ${currency}`)}
              {numberField("shipping", `Shipping you pay ${currency}`)}

              {region === "US" ? (
                <Field label="Payment provider" htmlFor="fee-gateway" className="sm:col-span-2">
                  <SelectControl
                    id="fee-gateway"
                    value={gateway}
                    onChange={(event) => setGateway(event.target.value as Gateway)}
                  >
                    <option value="shopify-payments">Shopify Payments</option>
                    <option value="third-party">Third-party (Stripe, PayPal…)</option>
                  </SelectControl>
                </Field>
              ) : null}

              {usesShopifyPayments ? null : (
                <>
                  {numberField(
                    "gatewayPct",
                    "Gateway fee %",
                    region === "IN" ? "Razorpay, PayU, Cashfree — usually about 2%" : undefined,
                  )}
                  {numberField("gatewayFixed", `Gateway fixed fee ${currency}`)}
                </>
              )}

              {region === "IN" ? (
                <Field label="GST on fees" htmlFor="fee-gst" className="sm:col-span-2">
                  <SelectControl
                    id="fee-gst"
                    value={addGst ? "add" : "none"}
                    onChange={(event) => setAddGst(event.target.value === "add")}
                  >
                    <option value="add">Add 18% GST on gateway and Shopify fees</option>
                    <option value="none">Leave GST out</option>
                  </SelectControl>
                </Field>
              ) : null}

              {numberField("appFeesPct", "App fees % of sale", "Apps that charge per order")}
              {numberField("otherFixed", `Other fees per order ${currency}`)}
            </div>

            <InfoNote>
              {usesShopifyPayments ? (
                <>
                  Shopify Payments: <b>no Shopify transaction fee</b>, card rate{" "}
                  {US_CARD_RATES[plan].pct}% + {fmt(US_CARD_RATES[plan].fixed)} on {plan}.
                </>
              ) : (
                <>
                  {region === "IN" ? "Shopify Payments isn't offered in India, so " : ""}
                  Shopify adds <b>{SHOPIFY_PLANS[plan].txnPct}%</b> on {plan} on top of your
                  gateway&apos;s fee.
                </>
              )}
            </InfoNote>

            <button
              type="button"
              onClick={reset}
              className="mt-6 w-full rounded-full border border-border bg-card px-4 py-3 text-[14px] font-bold text-foreground transition-colors hover:bg-muted"
            >
              Reset
            </button>
          </ToolCard>

          <div className="flex flex-col gap-3.5">
            <ResultPanel eyebrow="Fees on this order">
              <ResultFigure
                value={fmt(result.fees)}
                note={`${result.feeShare.toFixed(1)}% of the sale goes to fees`}
              />

              <ResultRows
                rows={[
                  {
                    label: "Payment processing",
                    detail: usesShopifyPayments
                      ? `Shopify Payments ${result.processingRate.pct}% + ${fmt(result.processingRate.fixed)}`
                      : `Gateway ${result.processingRate.pct}% + ${fmt(result.processingRate.fixed)}`,
                    cost: fmt(result.processing),
                  },
                  {
                    label: "Shopify transaction fee",
                    detail: usesShopifyPayments
                      ? "Waived on Shopify Payments"
                      : `${result.shopifyTxnPct}% on ${plan}`,
                    cost: fmt(result.shopifyTxn),
                  },
                  ...(gstApplies
                    ? [
                        {
                          label: "GST",
                          detail: `${GST_PCT}% on gateway + Shopify fees`,
                          cost: fmt(result.gst),
                        },
                      ]
                    : []),
                  {
                    label: "App fees",
                    detail: `${inputs.appFeesPct}% of sale`,
                    cost: fmt(result.apps),
                  },
                  {
                    label: "Other fees",
                    detail: "Per order",
                    cost: fmt(inputs.otherFixed),
                  },
                ]}
              />
            </ResultPanel>

            <ToolCard title="Profit on this order">
              <ResultRowsLight
                rows={[
                  { label: "Sale", value: fmt(result.gross) },
                  { label: "− Product cost", value: fmt(result.cogsTotal) },
                  { label: "− Shipping", value: fmt(inputs.shipping) },
                  { label: "− Fees", value: fmt(result.fees) },
                ]}
              />
              <div className="mt-4 rounded-xl bg-[#E7F9EE] p-5">
                <div className="text-[11.5px] font-extrabold tracking-[0.1em] text-[#0F7A42] uppercase">
                  Net profit
                </div>
                <div className="mt-1 font-display text-[30px] leading-[1.1] font-black text-[#0B5C32] sm:text-[34px]">
                  {fmt(result.netProfit)}
                </div>
                <div className="mt-0.5 text-[13px] text-[#0F7A42]">
                  {result.netMargin.toFixed(1)}% net margin
                </div>
              </div>
            </ToolCard>

            <ToolCard title="Fees at your volume">
              <div className="grid items-end gap-3.5 sm:grid-cols-2">
                {numberField("ordersPerMonth", "Orders per month")}
                <div className="pb-1 text-[13.5px] leading-[1.5] text-muted-foreground">
                  <b className="text-foreground">{fmt(result.monthlyFees)}</b> a month in fees, of
                  which <b className="text-foreground">{fmt(result.monthlyShopifyTxn)}</b> is
                  Shopify&apos;s transaction fee.
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
          description="A refused COD parcel costs you shipping both ways on top of every fee above. RateUp connects to Shopify and confirms each COD order on WhatsApp before you ship."
        />
      ) : null}
    </>
  );
}

/** Plain label/value rows for a white card. */
function ResultRowsLight({ rows }: Readonly<{ rows: { label: string; value: string }[] }>) {
  return (
    <div className="-mt-1">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex justify-between border-b border-border py-2.5 text-[14px] last:border-b-0"
        >
          <span className="text-muted-foreground">{row.label}</span>
          <span className="font-bold text-foreground">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
