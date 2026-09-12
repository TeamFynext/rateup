import { useMemo, useState } from "react";

import { getToolBySlug } from "@/config/tools.ts";
import {
  BILLING_CURRENCIES,
  COUNTRIES,
  DEFAULT_COUNTRY,
  DEFAULT_CURRENCY,
  RATE_CARD_SOURCE_URL,
  RATES_EFFECTIVE_FROM,
  formatCount,
  formatMoney,
  formatRate,
  getCountry,
  getRates,
  resolveMarket,
  tieredCost,
  type BillingCurrency,
} from "@/config/whatsappRates.ts";

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

const SLUG = "whatsapp-pricing-calculator";

const parseCount = (raw: string) => {
  const parsed = Number(raw.replace(/[^\d]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const isCurrency = (value: string): value is BillingCurrency =>
  BILLING_CURRENCIES.some((entry) => entry.code === value);

export default function WhatsAppPricingCalculator() {
  const tool = getToolBySlug(SLUG);
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY);
  const [currency, setCurrency] = useState<BillingCurrency>(DEFAULT_CURRENCY);
  const [marketing, setMarketing] = useState(5_000);
  const [utility, setUtility] = useState(20_000);
  const [authentication, setAuthentication] = useState(2_000);
  /** Share of utility templates that land inside an open 24h service window. */
  const [utilityInWindow, setUtilityInWindow] = useState(30);

  const market = resolveMarket(countryCode);
  const country = getCountry(countryCode);
  const rates = getRates(market, currency);

  const money = (value: number) => formatMoney(value, currency);
  const rate = (value: number) => formatRate(value, currency);
  const count = (value: number) => formatCount(value, currency);

  const breakdown = useMemo(() => {
    // Utility templates delivered inside an open customer service window are
    // free, and — because only charged messages accrue — they do not count
    // toward the volume tiers either.
    const freeUtility = Math.round(utility * (utilityInWindow / 100));
    const billedUtility = Math.max(utility - freeUtility, 0);

    const marketingCost = marketing * rates.marketing;
    const utilityResult = tieredCost(billedUtility, rates.utility, rates.utilityTiers);
    const authResult = tieredCost(authentication, rates.authentication, rates.authenticationTiers);

    const monthly = marketingCost + utilityResult.cost + authResult.cost;
    const billed = marketing + billedUtility + authentication;

    return {
      freeUtility,
      billedUtility,
      marketingCost,
      utilityResult,
      authResult,
      monthly,
      billed,
      blended: billed > 0 ? monthly / billed : 0,
      savedByWindow: freeUtility * rates.utility,
      tiered: utilityResult.reachedTier || authResult.reachedTier,
    };
  }, [rates, marketing, utility, authentication, utilityInWindow]);

  return (
    <>
      <ToolContainer className="pt-7">
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.15fr]">
          <ToolCard title="Your volume">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field
                label="Where are your customers?"
                htmlFor="pc-country"
                hint={
                  country && country.name !== market.name ? (
                    <>
                      Meta bills this market at <b>{market.name}</b> rates.
                    </>
                  ) : (
                    "Rates are set by the recipient's country, not your location."
                  )
                }
              >
                <SelectControl
                  id="pc-country"
                  value={countryCode}
                  onChange={(event) => setCountryCode(event.target.value)}
                >
                  {COUNTRIES.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.name}
                    </option>
                  ))}
                  <option value="OTHER">Anywhere else</option>
                </SelectControl>
              </Field>

              <Field
                label="Your billing currency"
                htmlFor="pc-currency"
                hint="Meta publishes a separate native card per currency — these are its real figures, not a conversion."
              >
                <SelectControl
                  id="pc-currency"
                  value={currency}
                  onChange={(event) => {
                    if (isCurrency(event.target.value)) setCurrency(event.target.value);
                  }}
                >
                  {BILLING_CURRENCIES.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </SelectControl>
              </Field>
            </div>

            <div className="mt-4.5 grid gap-3.5 sm:grid-cols-2">
              <Field label="Marketing / mo" htmlFor="pc-marketing">
                <TextControl
                  id="pc-marketing"
                  inputMode="numeric"
                  value={count(marketing)}
                  onChange={(event) => setMarketing(parseCount(event.target.value))}
                />
              </Field>
              <Field label="Utility / mo" htmlFor="pc-utility">
                <TextControl
                  id="pc-utility"
                  inputMode="numeric"
                  value={count(utility)}
                  onChange={(event) => setUtility(parseCount(event.target.value))}
                />
              </Field>
              <Field label="Authentication / mo" htmlFor="pc-auth">
                <TextControl
                  id="pc-auth"
                  inputMode="numeric"
                  value={count(authentication)}
                  onChange={(event) => setAuthentication(parseCount(event.target.value))}
                />
              </Field>
              <Field
                label="Service / mo"
                htmlFor="pc-service"
                hint="Never billed, so it does not change the total."
              >
                <TextControl id="pc-service" value="Free" readOnly className="bg-muted" />
              </Field>
            </div>

            <Field
              label={`Utility sent inside a service window: ${utilityInWindow}%`}
              htmlFor="pc-window"
              className="mt-4.5"
              hint="A utility template is free if the customer messaged you in the last 24 hours. An order update answering a customer's question usually is; a cold dispatch alert usually is not."
            >
              <input
                id="pc-window"
                type="range"
                min={0}
                max={100}
                step={5}
                value={utilityInWindow}
                onChange={(event) => setUtilityInWindow(Number(event.target.value))}
                className="w-full accent-primary"
              />
            </Field>

            <InfoNote>
              Rate card effective <b>{RATES_EFFECTIVE_FROM}</b>, {currency} card. Meta only changes
              rates on 1 January, 1 April, 1 July or 1 October, with at least a month&apos;s notice
              —{" "}
              <a
                href={RATE_CARD_SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-primary"
              >
                check the current card
              </a>{" "}
              before you commit a budget.
            </InfoNote>

            {rates.authenticationInternational ? (
              <InfoNote>
                Sending OTPs to {market.name} numbers from outside the market is billed at
                Meta&apos;s authentication-international rate of{" "}
                {rate(rates.authenticationInternational)} —{" "}
                {Math.round(rates.authenticationInternational / rates.authentication)}× the domestic
                rate used here.
              </InfoNote>
            ) : null}

            {currency === "USD" && countryCode === "IN" ? (
              <InfoNote>
                Billing in India is localising: businesses whose Sold-To country is India must move
                every WhatsApp Business account to INR by <b>31 December 2026</b>, after which Meta
                stops delivering messages from non-INR accounts. Switch the currency above to see
                your bill on Meta&apos;s rupee card.
              </InfoNote>
            ) : null}
          </ToolCard>

          <ResultPanel eyebrow="Estimated monthly cost">
            <ResultFigure
              value={money(breakdown.monthly)}
              suffix={currency}
              note={`${count(breakdown.billed)} billed messages · ${money(breakdown.monthly * 12)} a year`}
            />

            <ResultRows
              rows={[
                {
                  label: "Marketing",
                  detail: `${count(marketing)} × ${rate(rates.marketing)} · no volume tiers`,
                  cost: money(breakdown.marketingCost),
                },
                {
                  label: "Utility",
                  detail: `${count(breakdown.billedUtility)} billed × ${rate(breakdown.utilityResult.effectiveRate)}${
                    breakdown.utilityResult.reachedTier ? " (tiered)" : ""
                  }`,
                  cost: money(breakdown.utilityResult.cost),
                },
                {
                  label: "Authentication",
                  detail: `${count(authentication)} × ${rate(breakdown.authResult.effectiveRate)}${
                    breakdown.authResult.reachedTier ? " (tiered)" : ""
                  }`,
                  cost: money(breakdown.authResult.cost),
                },
                {
                  label: "Free of charge",
                  detail: `${count(breakdown.freeUtility)} utility in a service window · all service messages`,
                  cost: money(0),
                },
              ]}
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[10px] bg-card/[0.06] p-3.5">
                <div className="text-[11px] font-bold tracking-[0.1em] text-white/55 uppercase">
                  Saved by the 24h window
                </div>
                <div className="mt-1 font-nunito text-[22px] font-extrabold text-white">
                  {money(breakdown.savedByWindow)}
                </div>
              </div>
              <div className="rounded-[10px] bg-card/[0.06] p-3.5">
                <div className="text-[11px] font-bold tracking-[0.1em] text-white/55 uppercase">
                  Per billed message
                </div>
                <div className="mt-1 font-nunito text-[22px] font-extrabold text-white">
                  {rate(breakdown.blended)}
                </div>
              </div>
            </div>

            {breakdown.tiered ? (
              <p className="mt-3.5 rounded-[10px] bg-ru-blue-300/10 p-3.5 text-[12.5px] leading-[1.5] text-white/80">
                At this volume you have reached a discounted tier on utility or authentication. Meta
                pools volume across every WhatsApp Business account in your portfolio, and resets
                the count each month.
              </p>
            ) : null}

            <div className="mt-3.5 rounded-[10px] border border-ru-star-top/30 bg-[linear-gradient(135deg,rgba(255,213,76,0.16),rgba(248,149,29,0.1))] p-4">
              <div className="text-[13px] font-bold text-ru-star-top">
                + RateUp platform fee: a flat monthly subscription
              </div>
              <p className="mt-1 text-[12.5px] leading-[1.5] text-white/75">
                No per-seat fees and no markup on Meta&apos;s per-message rates — most resellers add
                10–20%, which compounds as you scale.
              </p>
            </div>
          </ResultPanel>
        </div>
      </ToolContainer>

      {tool ? <HowItWorks steps={tool.steps} /> : null}
      {tool ? <FaqSection faqs={tool.faqs} /> : null}
      <RelatedTools slug={SLUG} />
      {tool ? (
        <ToolCta
          title={tool.cta}
          description="The number above is what Meta charges. What you actually pay depends on the platform in front of it — and a per-message markup quietly scales with you. RateUp charges a flat subscription instead."
        />
      ) : null}
    </>
  );
}
