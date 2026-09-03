import { IconCalculator, IconMinus, IconPlus } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet.tsx";
import { Slider } from "@/components/ui/slider.tsx";

import {
  adviseOnTopUp,
  type BillingPeriod,
  CONVERSATION_PACK_DAYS,
  type ConversationPack,
  conversationPackPrice,
  estimateTopUp,
  formatCount,
  formatPrice,
  type PricingCurrency,
  type PricingTier,
  resolveDisplayPrice,
  tierConversationAllowance,
  type TopUpOption,
} from "./pricing.data.ts";

/** The stepper offers no more than one purchase can hold — past this it is a sales conversation. */
const MAX_PACKS = 20;

/**
 * A plan the calculator can top up: one that includes a countable number of conversations.
 *
 * Free and Enterprise are deliberately absent rather than shown as refusals. A pack tops
 * up a paid plan with a cap, and the API's purchase endpoint enforces exactly that.
 */
interface TopUpPlan extends TopUpOption {
  tier: PricingTier;
}

const chip = (active: boolean) =>
  `cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-colors ${
    active
      ? "border-primary bg-primary text-white"
      : "border-border bg-card text-muted-foreground hover:text-foreground"
  }`;

/**
 * "How much would the conversations I actually run cost?" — answered on the pricing page
 * instead of after signing up.
 *
 * Every figure comes off the plans endpoint: the plan allowances, the pack size and the
 * pack price in the currency on screen. The drawer quotes no total it cannot price, so a
 * catalog that stops pricing the pack in a currency makes the drawer say so rather than
 * invent a number.
 */
export function ConversationCreditsDrawer({
  tiers,
  pack,
  currency,
  period,
}: Readonly<{
  tiers: PricingTier[];
  pack: ConversationPack;
  currency: PricingCurrency;
  period: BillingPeriod;
}>) {
  const plans = useMemo<TopUpPlan[]>(
    () =>
      tiers
        .filter((tier) => !tier.free && !tier.salesLed)
        .map((tier) => {
          const price = resolveDisplayPrice(tier, currency);
          return {
            tier,
            planName: tier.planName,
            name: tier.name,
            included: tierConversationAllowance(tier) ?? 0,
            monthlyPrice: price ? (period === "yearly" ? price.yearly / 12 : price.monthly) : null,
          };
        })
        .filter((plan) => plan.included > 0),
    [tiers, currency, period],
  );

  // The badged tier is the one most visitors land on, so it is the one to open against.
  const [planName, setPlanName] = useState<string | null>(null);
  // Expected monthly volume is the single source of truth: the slider sets it directly
  // and the stepper sets it to whatever the chosen number of packs covers, so the two
  // controls can never disagree about how many packs are being quoted.
  const [expected, setExpected] = useState<number | null>(null);

  const selected =
    plans.find((plan) => plan.tier.planName === planName) ??
    plans.find((plan) => plan.tier.featured) ??
    plans[0];

  // Nothing to calculate against — every tier on offer is either free, sales-led or
  // uncapped, none of which a pack tops up.
  if (!selected) return null;

  const included = selected.included;
  const ceiling = included + MAX_PACKS * pack.conversations;
  // Opens one pack past the allowance: the question the drawer answers is what the next
  // slice of headroom costs, so starting exactly on the cap would answer nothing.
  const volume = Math.min(ceiling, Math.max(included, expected ?? included + pack.conversations));

  const estimate = estimateTopUp(included, volume, pack.conversations);
  const packPrice = conversationPackPrice(pack, currency);
  const planPerMonth = selected.monthlyPrice;
  const packTotal = packPrice === null ? null : packPrice * estimate.packs;

  // Past a certain number of packs the top-up stops being the cheap answer, and saying so
  // is worth more than the extra packs: a customer who works that out after buying six of
  // them has been sold the wrong thing.
  const advice = adviseOnTopUp({
    options: plans,
    currentIncluded: included,
    volume,
    packs: estimate.packs,
    monthlyCostWithPacks:
      planPerMonth === null || packTotal === null ? null : planPerMonth + packTotal,
  });

  const setPacks = (packs: number) =>
    setExpected(included + Math.min(MAX_PACKS, Math.max(0, packs)) * pack.conversations);

  return (
    <Sheet>
      {/* Tinted rather than another white pill: beside the billing toggles it has to read
          as something to open, not as a third thing to switch. */}
      <SheetTrigger className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#C9DAF0] bg-[#EDF3FB] px-[18px] py-[11px] text-[13px] font-bold text-primary transition-colors hover:bg-[#DFEAF7]">
        <IconCalculator size={16} />
        Calculate extra credits
      </SheetTrigger>

      <SheetContent className="w-full gap-0 overflow-y-auto bg-card p-0 text-foreground sm:max-w-md">
        <div className="border-b border-border px-6 pb-4 pt-5">
          <SheetTitle className="font-nunito pr-7 text-lg font-extrabold text-foreground">
            Additional conversation credits
          </SheetTitle>
          <SheetDescription className="mt-1 text-[13px] text-muted-foreground">
            {formatCount(pack.conversations)} extra conversations per pack, good for{" "}
            {CONVERSATION_PACK_DAYS} days. A one-off charge — nothing renews, and packs stack.
          </SheetDescription>
        </div>

        <div className="flex flex-col gap-6 px-6 py-6">
          <div>
            <p className="text-[13px] font-bold text-foreground">Your plan</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {plans.map((plan) => (
                <button
                  key={plan.tier.id}
                  type="button"
                  onClick={() => {
                    setPlanName(plan.tier.planName);
                    // Volume is the customer's own number — it does not belong to the
                    // plan, so switching plans re-answers the same question rather than
                    // resetting what they typed.
                    setExpected(volume);
                  }}
                  className={chip(plan.tier.planName === selected.tier.planName)}
                >
                  {plan.tier.name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Includes {formatCount(included)} conversations a month.
            </p>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-[13px] font-bold text-foreground">Conversations you expect</p>
              <span className="text-[15px] font-black tabular-nums text-primary">
                {formatCount(volume)}
              </span>
            </div>
            <Slider
              aria-label="Conversations you expect each month"
              className="mt-3"
              min={included}
              max={ceiling}
              step={100}
              value={volume}
              onValueChange={(next) => setExpected(Array.isArray(next) ? next[0] : next)}
            />
            <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
              <span>{formatCount(included)}</span>
              <span>{formatCount(ceiling)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3.5">
            <div>
              <p className="text-[13px] font-bold text-foreground">Packs to buy</p>
              <p className="text-[12px] text-muted-foreground">
                {estimate.overage > 0
                  ? `${formatCount(estimate.overage)} over your allowance`
                  : "Your plan already covers this"}
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
              <button
                type="button"
                aria-label="Fewer packs"
                className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-[#F2F5FA] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={estimate.packs <= 0}
                onClick={() => setPacks(estimate.packs - 1)}
              >
                <IconMinus size={16} />
              </button>
              <span className="w-7 text-center text-sm font-bold tabular-nums">
                {estimate.packs}
              </span>
              <button
                type="button"
                aria-label="More packs"
                className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-[#F2F5FA] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={estimate.packs >= MAX_PACKS}
                onClick={() => setPacks(estimate.packs + 1)}
              >
                <IconPlus size={16} />
              </button>
            </div>
          </div>

          {advice.kind === "upgrade" && (
            <div className="rounded-xl border border-[#F0D9A8] bg-[#FDF8EE] p-4">
              <p className="text-[13px] font-bold text-foreground">
                {advice.option.name} is cheaper at this volume
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {estimate.packs} {estimate.packs === 1 ? "pack" : "packs"} on {selected.name} comes
                to {formatPrice(currency, Math.round((planPerMonth ?? 0) + (packTotal ?? 0)))} for
                the month. {advice.option.name} includes {formatCount(advice.option.included)}{" "}
                conversations for{" "}
                {`${formatPrice(currency, Math.round(advice.option.monthlyPrice ?? 0))}/mo`} — and
                raises every other limit too. Packs are the cheaper answer for a one-off spike; if
                this is your volume every month, moving up saves{" "}
                {formatPrice(currency, Math.round(advice.monthlySaving))} a month.
              </p>
              <button
                type="button"
                className="mt-3 cursor-pointer rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#164272]"
                onClick={() => {
                  setPlanName(advice.option.planName);
                  setExpected(volume);
                }}
              >
                Price {advice.option.name} instead
              </button>
            </div>
          )}

          {advice.kind === "sales" && (
            <div className="rounded-xl border border-[#F0D9A8] bg-[#FDF8EE] p-4">
              <p className="text-[13px] font-bold text-foreground">
                That is past what packs are for
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {formatCount(volume)} conversations a month is more than any plan on this page
                includes. Enterprise is invoiced on the volume you actually run, which at this scale
                costs less than stacking {estimate.packs} packs every month — talk to us and we will
                size it around your numbers.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-border p-4">
            <Row
              label={`${selected.tier.name} · ${period === "yearly" ? "annual" : "monthly"} billing`}
              value={
                planPerMonth === null
                  ? "Custom"
                  : `${formatPrice(currency, Math.round(planPerMonth))}/mo`
              }
            />
            <Row
              label={`${estimate.packs} ${estimate.packs === 1 ? "pack" : "packs"} · ${formatCount(
                estimate.extraConversations,
              )} conversations`}
              value={
                packPrice === null
                  ? "Not priced in this currency"
                  : `${formatPrice(currency, packTotal ?? 0)} once`
              }
            />
            <div className="mt-3 border-t border-border pt-3">
              <Row
                strong
                label={`Total for ${formatCount(estimate.totalConversations)} conversations`}
                value={
                  planPerMonth === null || packPrice === null
                    ? "—"
                    : formatPrice(currency, Math.round(planPerMonth) + (packTotal ?? 0))
                }
              />
              <p className="mt-1.5 text-[12px] text-muted-foreground">
                {packPrice === null
                  ? "Packs are not priced in this currency yet — switch currency or talk to us and we will sort it out."
                  : `First month, with the packs charged once. From then on it is ${
                      planPerMonth === null
                        ? "your plan"
                        : `${formatPrice(currency, Math.round(planPerMonth))}/mo`
                    } unless you top up again.`}
              </p>
            </div>
          </div>

          <p className="text-[12px] leading-relaxed text-muted-foreground">
            A conversation is one 24-hour window with a customer on any connected channel. Packs are
            bought from Billing once you are on a paid plan, and lapse after{" "}
            {CONVERSATION_PACK_DAYS} days rather than renewing. WhatsApp message charges are billed
            to your own Meta account and are not included here.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({
  label,
  value,
  strong,
}: Readonly<{ label: string; value: string; strong?: boolean }>) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span
        className={`text-[13px] ${strong ? "font-bold text-foreground" : "text-muted-foreground"}`}
      >
        {label}
      </span>
      <span
        className={`shrink-0 tabular-nums ${
          strong
            ? "text-[15px] font-black text-foreground"
            : "text-[13px] font-bold text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
