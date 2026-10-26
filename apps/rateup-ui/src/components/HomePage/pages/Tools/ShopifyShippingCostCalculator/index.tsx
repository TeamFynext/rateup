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
  SelectControl,
  TextControl,
  ToolCard,
  ToolContainer,
  ToolCta,
  WarnNote,
} from "../shared/ToolSections.tsx";

const SLUG = "shopify-shipping-cost-calculator";

/** Couriers bill in 500 g steps: the first slab, then each extra 500 g. */
const SLAB_KG = 0.5;
const GST_PCT = 18;

/**
 * The A–E zones Indian couriers and shipping aggregators price by. Rates are rough
 * surface-shipping examples for a small seller, excluding GST — they only pre-fill
 * the two rate fields, which stay editable so merchants can enter their own card.
 */
type Zone = "A" | "B" | "C" | "D" | "E";

const ZONES: Record<Zone, { label: string; first: number; extra: number }> = {
  A: { label: "Zone A — within city", first: 32, extra: 30 },
  B: { label: "Zone B — within state / region", first: 38, extra: 35 },
  C: { label: "Zone C — metro to metro", first: 46, extra: 44 },
  D: { label: "Zone D — rest of India", first: 52, extra: 50 },
  E: { label: "Zone E — North East, J&K, special", first: 65, extra: 62 },
};

const DEFAULTS = {
  weight: 0.4,
  length: 25,
  width: 20,
  height: 10,
  firstSlab: ZONES.C.first,
  extraSlab: ZONES.C.extra,
  orderValue: 1200,
  codFixed: 40,
  codPct: 1.75,
  customerFee: 0,
  margin: 60,
};

type Inputs = typeof DEFAULTS;

const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const inr2 = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const kg = (value: number) => `${Number(value.toFixed(2))} kg`;
const pct = (value: number) => `${value.toFixed(1)}%`;

/** Round a weight up to the next billing slab, never below one slab. */
const toSlab = (weight: number) => Math.max(Math.ceil(weight / SLAB_KG - 1e-9), 1) * SLAB_KG;

/** Freight for a chargeable weight: first slab + each extra slab. */
const freightFor = (chargeable: number, first: number, extra: number) =>
  first + (chargeable / SLAB_KG - 1) * extra;

export default function ShopifyShippingCostCalculator() {
  const tool = getToolBySlug(SLUG);
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [zone, setZone] = useState<Zone>("C");
  const [divisor, setDivisor] = useState(5000);
  const [payment, setPayment] = useState<"cod" | "prepaid">("cod");
  const [addGst, setAddGst] = useState(true);

  const set = (key: keyof Inputs, raw: string) => {
    const parsed = Number(raw.replace(/[^\d.]/g, ""));
    setInputs((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const pickZone = (next: Zone) => {
    setZone(next);
    setInputs((current) => ({
      ...current,
      firstSlab: ZONES[next].first,
      extraSlab: ZONES[next].extra,
    }));
  };

  const result = useMemo(() => {
    const { weight, length, width, height, firstSlab, extraSlab, orderValue } = inputs;

    const volumetric = (length * width * height) / Math.max(divisor, 1);
    const chargeable = toSlab(Math.max(weight, volumetric));
    const freight = freightFor(chargeable, firstSlab, extraSlab);

    // What the same parcel would cost if the box were only as big as it needs to be.
    const freightAtActual = freightFor(toSlab(weight), firstSlab, extraSlab);
    const boxPenalty = Math.max(freight - freightAtActual, 0);

    const codCharge =
      payment === "cod" ? Math.max(inputs.codFixed, (orderValue * inputs.codPct) / 100) : 0;

    const beforeGst = freight + codCharge;
    const gst = addGst ? (beforeGst * GST_PCT) / 100 : 0;
    const total = beforeGst + gst;

    const netCost = total - inputs.customerFee;
    const grossProfit = (orderValue * inputs.margin) / 100;
    const shareOfProfit = grossProfit > 0 ? (Math.max(netCost, 0) / grossProfit) * 100 : 0;

    return {
      volumetric,
      chargeable,
      volumetricWins: volumetric > weight,
      freight,
      boxPenalty,
      codCharge,
      gst,
      total,
      shareOfOrder: orderValue > 0 ? (total / orderValue) * 100 : 0,
      netCost,
      grossProfit,
      shareOfProfit,
      profitLeft: grossProfit - netCost,
    };
  }, [inputs, divisor, payment, addGst]);

  const numberField = (key: keyof Inputs, label: string, hint?: string) => (
    <Field key={key} label={label} hint={hint} htmlFor={`ship-${key}`}>
      <TextControl
        id={`ship-${key}`}
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
          <div className="flex flex-col gap-3.5">
            <ToolCard
              title="Your parcel"
              subtitle="Weigh it packed, and measure the outer box — couriers bill on whichever is bigger."
            >
              <div className="grid gap-3.5 sm:grid-cols-2">
                {numberField("weight", "Actual weight (kg)")}
                <Field label="Volumetric divisor" htmlFor="ship-divisor">
                  <SelectControl
                    id="ship-divisor"
                    value={divisor}
                    onChange={(event) => setDivisor(Number(event.target.value))}
                  >
                    <option value={5000}>5000 (most Indian couriers)</option>
                    <option value={4000}>4000 (some air services)</option>
                  </SelectControl>
                </Field>
              </div>
              <div className="mt-3.5 grid grid-cols-3 gap-3.5">
                {numberField("length", "Length (cm)")}
                {numberField("width", "Width (cm)")}
                {numberField("height", "Height (cm)")}
              </div>

              <InfoNote>
                Volumetric weight {kg(result.volumetric)} vs actual {kg(inputs.weight)} → billed as{" "}
                <b>{kg(result.chargeable)}</b>
                {result.volumetricWins ? " (box size decides)" : " (actual weight decides)"}.
              </InfoNote>
            </ToolCard>

            <ToolCard
              title="Your courier rates"
              subtitle="Pick a zone to pre-fill example rates, then replace them with your own rate card."
            >
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Delivery zone" htmlFor="ship-zone" className="sm:col-span-2">
                  <SelectControl
                    id="ship-zone"
                    value={zone}
                    onChange={(event) => pickZone(event.target.value as Zone)}
                  >
                    {(Object.keys(ZONES) as Zone[]).map((key) => (
                      <option key={key} value={key}>
                        {ZONES[key].label}
                      </option>
                    ))}
                  </SelectControl>
                </Field>
                {numberField("firstSlab", "First 500 g ₹")}
                {numberField("extraSlab", "Each extra 500 g ₹")}
                {numberField("orderValue", "Order value ₹")}
                <Field label="Payment" htmlFor="ship-payment">
                  <SelectControl
                    id="ship-payment"
                    value={payment}
                    onChange={(event) => setPayment(event.target.value as "cod" | "prepaid")}
                  >
                    <option value="cod">Cash on delivery</option>
                    <option value="prepaid">Prepaid</option>
                  </SelectControl>
                </Field>
                {payment === "cod" ? (
                  <>
                    {numberField("codFixed", "COD charge ₹ (minimum)")}
                    {numberField("codPct", "COD charge % of order value")}
                  </>
                ) : null}
                <Field label="GST" htmlFor="ship-gst" className="sm:col-span-2">
                  <SelectControl
                    id="ship-gst"
                    value={addGst ? "add" : "included"}
                    onChange={(event) => setAddGst(event.target.value === "add")}
                  >
                    <option value="add">My rates exclude GST — add 18%</option>
                    <option value="included">My rates already include GST</option>
                  </SelectControl>
                </Field>
              </div>
            </ToolCard>
          </div>

          <div className="flex flex-col gap-3.5">
            <ResultPanel eyebrow="Shipping cost per order">
              <ResultFigure
                value={inr2(result.total)}
                note={`${pct(result.shareOfOrder)} of a ${inr(inputs.orderValue)} order`}
              />

              <ResultRows
                rows={[
                  {
                    label: "Freight",
                    detail: `${kg(result.chargeable)} billed · ${inr(inputs.firstSlab)} + ${
                      result.chargeable / SLAB_KG - 1
                    } × ${inr(inputs.extraSlab)}`,
                    cost: inr2(result.freight),
                  },
                  {
                    label: "COD charge",
                    detail:
                      payment === "cod"
                        ? `Higher of ${inr(inputs.codFixed)} or ${inputs.codPct}% of order value`
                        : "None on prepaid orders",
                    cost: inr2(result.codCharge),
                  },
                  {
                    label: "GST",
                    detail: addGst ? `${GST_PCT}% on freight + COD` : "Already in your rates",
                    cost: inr2(result.gst),
                  },
                  {
                    label: "Total per shipment",
                    detail: "What the courier bills you",
                    cost: inr2(result.total),
                  },
                ]}
              />
            </ResultPanel>

            {result.boxPenalty > 0 ? (
              <WarnNote>
                You are paying <b>{inr2(result.boxPenalty * (addGst ? 1 + GST_PCT / 100 : 1))}</b>{" "}
                extra per order for box size. Billed at its actual weight, this parcel would cost
                less — a snugger box or a courier bag pays for itself quickly.
              </WarnNote>
            ) : null}

            <ToolCard title="Who pays for it">
              <p className="-mt-2 mb-4 text-[13.5px] leading-[1.55] text-muted-foreground">
                Set what you charge the customer at checkout — ₹0 for free shipping — and your gross
                margin, to see how much of the profit on this order shipping takes.
              </p>
              <div className="grid gap-3.5 sm:grid-cols-2">
                {numberField("customerFee", "Shipping charged to customer ₹")}
                {numberField("margin", "Gross margin %", "Selling price minus product cost")}
              </div>

              <div className="mt-4.5 grid grid-cols-2 gap-4 rounded-xl bg-[#E7F9EE] p-5">
                <div>
                  <div className="text-[11.5px] font-extrabold tracking-[0.1em] text-[#0F7A42] uppercase">
                    {result.netCost >= 0 ? "You absorb" : "You make"}
                  </div>
                  <div className="mt-1 font-display text-[26px] leading-[1.1] font-black text-[#0B5C32] sm:text-[30px]">
                    {inr(Math.abs(result.netCost))}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-[#0F7A42]">
                    {pct(result.shareOfProfit)} of your {inr(result.grossProfit)} gross profit
                  </div>
                </div>
                <div>
                  <div className="text-[11.5px] font-extrabold tracking-[0.1em] text-[#0F7A42] uppercase">
                    Profit left
                  </div>
                  <div className="mt-1 font-display text-[26px] leading-[1.1] font-black text-[#0B5C32] sm:text-[30px]">
                    {inr(result.profitLeft)}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-[#0F7A42]">
                    before ads, fees and returns
                  </div>
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
          description="A refused COD parcel costs you shipping twice and earns nothing. RateUp connects to Shopify and asks every COD customer to confirm on WhatsApp before you ship, then sends tracking updates so fewer parcels come back."
        />
      ) : null}
    </>
  );
}
