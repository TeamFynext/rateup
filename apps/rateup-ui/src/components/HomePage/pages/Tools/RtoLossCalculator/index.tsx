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

const SLUG = "rto-loss-calculator";

/**
 * Defaults are Indian D2C averages. They are deliberately visible and editable —
 * a calculator with hidden constants reads as marketing, not as a tool.
 */
const DEFAULTS = {
  orders: 3000,
  cod: 60,
  rto: 25,
  aov: 1200,
  fwd: 70,
  ret: 70,
  pack: 25,
  cogs: 45,
};

type Inputs = typeof DEFAULTS;

const FIELDS: { key: keyof Inputs; label: string }[] = [
  { key: "orders", label: "Monthly orders" },
  { key: "cod", label: "COD share %" },
  { key: "rto", label: "RTO rate %" },
  { key: "aov", label: "AOV ₹" },
  { key: "fwd", label: "Forward shipping ₹" },
  { key: "ret", label: "Return shipping ₹" },
  { key: "pack", label: "Packaging ₹" },
  { key: "cogs", label: "COGS % of AOV" },
];

const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const count = (value: number) => Math.round(value).toLocaleString("en-IN");

export default function RtoLossCalculator() {
  const tool = getToolBySlug(SLUG);
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [reduce, setReduce] = useState(5);

  const set = (key: keyof Inputs, raw: string) => {
    const parsed = Number(raw.replace(/[^\d.]/g, ""));
    setInputs((current) => ({ ...current, [key]: Number.isFinite(parsed) ? parsed : 0 }));
  };

  const result = useMemo(() => {
    const codOrders = (inputs.orders * inputs.cod) / 100;
    const rtoOrders = (codOrders * inputs.rto) / 100;
    const lossPerRto = inputs.fwd + inputs.ret + inputs.pack;

    const shipBurn = rtoOrders * (inputs.fwd + inputs.ret);
    const packBurn = rtoOrders * inputs.pack;
    const monthlyLoss = shipBurn + packBurn;

    // Stock inside a returning parcel is unsellable for the weeks it spends in
    // transit. That is working capital blocked, not money burned, so it is
    // reported separately rather than added to the loss.
    const blocked = (rtoOrders * inputs.aov * inputs.cogs) / 100;

    const reducedOrders = (codOrders * Math.max(0, inputs.rto - reduce)) / 100;
    const saving = (rtoOrders - reducedOrders) * lossPerRto;

    return {
      codOrders,
      rtoOrders,
      lossPerRto,
      shipBurn,
      packBurn,
      monthlyLoss,
      blocked,
      saving,
    };
  }, [inputs, reduce]);

  return (
    <>
      <ToolContainer className="pt-7">
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.15fr]">
          <ToolCard
            title="Your numbers"
            subtitle="Pre-filled with Indian D2C averages. Every assumption is editable — change what you know."
          >
            <div className="grid gap-3.5 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <Field key={field.key} label={field.label} htmlFor={`rto-${field.key}`}>
                  <TextControl
                    id={`rto-${field.key}`}
                    inputMode="decimal"
                    value={inputs[field.key]}
                    onChange={(event) => set(field.key, event.target.value)}
                  />
                </Field>
              ))}
            </div>

            <InfoNote>
              {count(result.codOrders)} COD orders → <b>{count(result.rtoOrders)} RTO orders</b> a
              month at ₹{count(result.lossPerRto)} burnt per undelivered parcel.
            </InfoNote>
          </ToolCard>

          <div className="flex flex-col gap-3.5">
            <ResultPanel eyebrow="What RTO costs you">
              <ResultFigure
                value={inr(result.monthlyLoss)}
                note={`per month · ${inr(result.monthlyLoss * 12)} a year`}
              />

              <ResultRows
                rows={[
                  {
                    label: "Shipping burn",
                    detail: `Forward + return on ${count(result.rtoOrders)} parcels`,
                    cost: inr(result.shipBurn),
                  },
                  {
                    label: "Packaging burn",
                    detail: `${count(result.rtoOrders)} × ₹${count(inputs.pack)} unrecoverable`,
                    cost: inr(result.packBurn),
                  },
                  {
                    label: "Blocked working capital",
                    detail: `COGS in transit at ${inputs.cogs}% of AOV`,
                    cost: inr(result.blocked),
                  },
                  {
                    label: "Annualised loss",
                    detail: "Shipping + packaging × 12",
                    cost: inr(result.monthlyLoss * 12),
                  },
                ]}
              />
            </ResultPanel>

            <ToolCard title="Recovery">
              <p className="-mt-2 mb-4 text-[13.5px] leading-[1.55] text-[#4A4C49]">
                WhatsApp COD-confirmation flows are the standard lever — address verification,
                prepaid nudges, and a single &ldquo;confirm your order&rdquo; message before
                dispatch.
              </p>

              <label
                htmlFor="rto-reduce"
                className="mb-2.5 flex justify-between text-[12.5px] font-bold text-[#4A4C49]"
              >
                <span>Cut RTO by</span>
                <span className="text-[#1C518E]">{reduce} percentage points</span>
              </label>
              <input
                id="rto-reduce"
                type="range"
                min={1}
                max={Math.max(Math.round(inputs.rto), 1)}
                step={1}
                value={Math.min(reduce, Math.max(Math.round(inputs.rto), 1))}
                onChange={(event) => setReduce(Number(event.target.value))}
                className="w-full accent-[#1C518E]"
              />

              <div className="mt-4.5 rounded-xl bg-[#E7F9EE] p-5">
                <div className="text-[11.5px] font-extrabold tracking-[0.1em] text-[#0F7A42] uppercase">
                  You&apos;d save
                </div>
                <div className="mt-1 font-nunito text-[32px] leading-[1.1] font-black text-[#0B5C32] sm:text-[38px]">
                  {inr(result.saving)}
                </div>
                <div className="mt-0.5 text-[13px] text-[#0F7A42]">
                  a month · {inr(result.saving * 12)} a year
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
          description="RateUp sends an automated WhatsApp confirmation on every COD order — one tap to confirm, one tap to cancel. A cancellation at that point costs you nothing; a refusal at the door costs you everything above."
        />
      ) : null}
    </>
  );
}
