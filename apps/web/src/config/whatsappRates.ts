/**
 * Meta's WhatsApp Business Platform rate card, used by the public pricing
 * calculator at `/tools/whatsapp-pricing-calculator`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SOURCE OF TRUTH — do not hand-edit these numbers from a blog post.
 *
 * `MARKETS` was generated from Meta's own "rates" and "volume tiers" CSVs for
 * USD and INR, linked from https://developers.facebook.com/docs/whatsapp/pricing
 * `COUNTRIES` was transcribed from that page's "Country calling codes" table.
 *
 * Meta publishes a separate native card per billing currency — the INR figures
 * are NOT the USD ones converted, and converting instead of using the native
 * card overstates rupee costs by roughly a fifth. A WhatsApp Business account is
 * billed in exactly one currency, which is why the two sets sit side by side
 * here rather than behind an exchange rate.
 *
 * There is no Meta API that returns the published rate card. The Graph API's
 * `pricing_analytics` field reports what *your own* delivered messages cost —
 * retrospective, not a price list — so this table is refreshed by hand.
 *
 * To refresh: download the four CSVs, regenerate this file, and bump
 * RATES_EFFECTIVE_FROM. The calculator renders that date, so a stale table is
 * visible to visitors rather than silently wrong.
 *
 * Meta may only change rates on 1 January, 1 April, 1 July or 1 October, and
 * gives at least one month's notice — so checking quarterly is sufficient.
 *
 * KNOWN UPCOMING CHANGE: effective 1 October 2026, Bangladesh, Iraq, Nepal,
 * Sri Lanka, Kazakhstan, Kuwait, Morocco, Oman and Ukraine move out of their
 * "Rest of" regions onto standalone rows, each gaining an authentication-
 * international rate. Meta publishes the new figures by 1 September 2026.
 *
 * INDIA BILLING LOCALIZATION: businesses whose Billing Hub Sold-To country is
 * India must migrate every WABA to INR by 31 December 2026 — from 1 January 2027
 * Meta stops delivering messages from their non-INR accounts.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Billing model (per-message pricing, in force since 1 July 2025):
 *  - Only delivered *template* messages are billed.
 *  - Non-template messages inside an open 24h customer service window are free.
 *  - Utility templates inside an open customer service window are also free.
 *  - Everything inside a 72h free-entry-point window is free.
 *  - Utility and authentication unlock cheaper volume tiers; marketing does not.
 */

export const RATES_EFFECTIVE_FROM = "1 July 2026";

export const RATE_CARD_SOURCE_LABEL = "Meta's published WhatsApp Business Platform rate card";

export const RATE_CARD_SOURCE_URL = "https://developers.facebook.com/docs/whatsapp/pricing";

export type MessageCategory = "marketing" | "utility" | "authentication";

/** Billing currencies this calculator carries native cards for. */
export type BillingCurrency = "USD" | "INR";

export const BILLING_CURRENCIES: {
  code: BillingCurrency;
  label: string;
  symbol: string;
  locale: string;
  /** Decimals needed to show a per-message rate without rounding it to zero. */
  rateDigits: number;
}[] = [
  { code: "INR", label: "INR — billed in rupees", symbol: "₹", locale: "en-IN", rateDigits: 4 },
  { code: "USD", label: "USD — billed in dollars", symbol: "$", locale: "en-US", rateDigits: 4 },
];

/** One step of a volume tier: `rate` applies from `from` messages upward. */
export interface TierBand {
  from: number;
  rate: number;
}

/** One currency's rates for one market. */
export interface RateSet {
  /** Per delivered template message, at list rate, in the parent currency. */
  marketing: number;
  utility: number;
  authentication: number;
  /**
   * Rate for authentication messages sent to a recipient outside the business's
   * own market. Absent where Meta lists n/a.
   * @see https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/authentication-international-rates
   */
  authenticationInternational?: number;
  /** Volume tiers, cheapest-last. Absent where the market has none. */
  utilityTiers?: TierBand[];
  authenticationTiers?: TierBand[];
}

export interface Market {
  /** Market name exactly as Meta lists it on the rate card. */
  name: string;
  rates: Record<BillingCurrency, RateSet>;
}

/** Ordered with RateUp's core markets first; the default selection is India. */
export const MARKETS: Market[] = [
  {
    name: "India",
    rates: {
      USD: {
        marketing: 0.0118,
        utility: 0.0014,
        authentication: 0.0014,
        authenticationInternational: 0.0304,
        utilityTiers: [
          { from: 0, rate: 0.0014 },
          { from: 25000001, rate: 0.0013 },
          { from: 50000001, rate: 0.0012 },
          { from: 100000001, rate: 0.0011 },
          { from: 200000001, rate: 0.0011 },
          { from: 300000001, rate: 0.001 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0014 },
          { from: 750001, rate: 0.0013 },
          { from: 15000001, rate: 0.0012 },
          { from: 20000001, rate: 0.0011 },
          { from: 50000001, rate: 0.0011 },
          { from: 100000001, rate: 0.001 },
        ],
      },
      INR: {
        marketing: 0.8631,
        utility: 0.115,
        authentication: 0.115,
        authenticationInternational: 2.4971,
        utilityTiers: [
          { from: 0, rate: 0.115 },
          { from: 25000001, rate: 0.1081 },
          { from: 50000001, rate: 0.1012 },
          { from: 100000001, rate: 0.0943 },
          { from: 200000001, rate: 0.0874 },
          { from: 300000001, rate: 0.0805 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.115 },
          { from: 750001, rate: 0.1081 },
          { from: 15000001, rate: 0.1012 },
          { from: 20000001, rate: 0.0943 },
          { from: 50000001, rate: 0.0874 },
          { from: 100000001, rate: 0.0805 },
        ],
      },
    },
  },
  {
    name: "United Arab Emirates",
    rates: {
      USD: {
        marketing: 0.0499,
        utility: 0.0157,
        authentication: 0.0157,
        authenticationInternational: 0.051,
        utilityTiers: [
          { from: 0, rate: 0.0157 },
          { from: 100001, rate: 0.0149 },
          { from: 1000001, rate: 0.0141 },
          { from: 4500001, rate: 0.0133 },
          { from: 40000001, rate: 0.0126 },
          { from: 80000001, rate: 0.0118 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0157 },
          { from: 300001, rate: 0.0149 },
          { from: 2000001, rate: 0.0141 },
          { from: 10000001, rate: 0.0133 },
          { from: 20000001, rate: 0.0126 },
          { from: 40000001, rate: 0.0118 },
        ],
      },
      INR: {
        marketing: 3.6613,
        utility: 1.1509,
        authentication: 1.1509,
        authenticationInternational: 3.7342,
        utilityTiers: [
          { from: 0, rate: 1.1509 },
          { from: 100001, rate: 1.0934 },
          { from: 1000001, rate: 1.0358 },
          { from: 4500001, rate: 0.9783 },
          { from: 40000001, rate: 0.9207 },
          { from: 80000001, rate: 0.8632 },
        ],
        authenticationTiers: [
          { from: 0, rate: 1.1509 },
          { from: 300001, rate: 1.0934 },
          { from: 2000001, rate: 1.0358 },
          { from: 10000001, rate: 0.9783 },
          { from: 20000001, rate: 0.9207 },
          { from: 40000001, rate: 0.8632 },
        ],
      },
    },
  },
  {
    name: "Saudi Arabia",
    rates: {
      USD: {
        marketing: 0.0501,
        utility: 0.0107,
        authentication: 0.0107,
        authenticationInternational: 0.0598,
        utilityTiers: [
          { from: 0, rate: 0.0107 },
          { from: 100001, rate: 0.0102 },
          { from: 1000001, rate: 0.0096 },
          { from: 4500001, rate: 0.0091 },
          { from: 40000001, rate: 0.0086 },
          { from: 80000001, rate: 0.008 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0107 },
          { from: 300001, rate: 0.0102 },
          { from: 2000001, rate: 0.0096 },
          { from: 10000001, rate: 0.0091 },
          { from: 20000001, rate: 0.0086 },
          { from: 40000001, rate: 0.008 },
        ],
      },
      INR: {
        marketing: 3.6621,
        utility: 0.7834,
        authentication: 0.7834,
        authenticationInternational: 4.3871,
        utilityTiers: [
          { from: 0, rate: 0.7834 },
          { from: 100001, rate: 0.7442 },
          { from: 1000001, rate: 0.7051 },
          { from: 4500001, rate: 0.6659 },
          { from: 40000001, rate: 0.6267 },
          { from: 80000001, rate: 0.5876 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.7834 },
          { from: 300001, rate: 0.7442 },
          { from: 2000001, rate: 0.7051 },
          { from: 10000001, rate: 0.6659 },
          { from: 20000001, rate: 0.6267 },
          { from: 40000001, rate: 0.5876 },
        ],
      },
    },
  },
  {
    name: "Indonesia",
    rates: {
      USD: {
        marketing: 0.0411,
        utility: 0.025,
        authentication: 0.025,
        authenticationInternational: 0.136,
        utilityTiers: [
          { from: 0, rate: 0.025 },
          { from: 750001, rate: 0.0238 },
          { from: 4000001, rate: 0.0225 },
          { from: 25000001, rate: 0.0213 },
          { from: 75000001, rate: 0.02 },
          { from: 150000001, rate: 0.0188 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.025 },
          { from: 750001, rate: 0.0238 },
          { from: 2000001, rate: 0.0225 },
          { from: 6000001, rate: 0.0213 },
          { from: 30000001, rate: 0.02 },
          { from: 60000001, rate: 0.0188 },
        ],
      },
      INR: {
        marketing: 3.0111,
        utility: 1.8316,
        authentication: 1.8316,
        authenticationInternational: 9.9638,
        utilityTiers: [
          { from: 0, rate: 1.8316 },
          { from: 750001, rate: 1.74 },
          { from: 4000001, rate: 1.6484 },
          { from: 25000001, rate: 1.5569 },
          { from: 75000001, rate: 1.4653 },
          { from: 150000001, rate: 1.3737 },
        ],
        authenticationTiers: [
          { from: 0, rate: 1.8316 },
          { from: 750001, rate: 1.74 },
          { from: 2000001, rate: 1.6484 },
          { from: 6000001, rate: 1.5569 },
          { from: 30000001, rate: 1.4653 },
          { from: 60000001, rate: 1.3737 },
        ],
      },
    },
  },
  {
    name: "Brazil",
    rates: {
      USD: {
        marketing: 0.0625,
        utility: 0.0068,
        authentication: 0.0068,
        utilityTiers: [
          { from: 0, rate: 0.0068 },
          { from: 250001, rate: 0.0065 },
          { from: 2000001, rate: 0.0061 },
          { from: 17000001, rate: 0.0058 },
          { from: 35000001, rate: 0.0054 },
          { from: 70000001, rate: 0.0051 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0068 },
          { from: 500001, rate: 0.0065 },
          { from: 3000001, rate: 0.0061 },
          { from: 5250001, rate: 0.0058 },
          { from: 10000001, rate: 0.0054 },
          { from: 20000001, rate: 0.0051 },
        ],
      },
      INR: {
        marketing: 4.5808,
        utility: 0.4984,
        authentication: 0.4984,
        utilityTiers: [
          { from: 0, rate: 0.4984 },
          { from: 250001, rate: 0.4735 },
          { from: 2000001, rate: 0.4486 },
          { from: 17000001, rate: 0.4236 },
          { from: 35000001, rate: 0.3987 },
          { from: 70000001, rate: 0.3738 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.4984 },
          { from: 500001, rate: 0.4735 },
          { from: 3000001, rate: 0.4486 },
          { from: 5250001, rate: 0.4236 },
          { from: 10000001, rate: 0.3987 },
          { from: 20000001, rate: 0.3738 },
        ],
      },
    },
  },
  {
    name: "Mexico",
    rates: {
      USD: {
        marketing: 0.0305,
        utility: 0.0085,
        authentication: 0.0085,
        utilityTiers: [
          { from: 0, rate: 0.0085 },
          { from: 1000001, rate: 0.0081 },
          { from: 5000001, rate: 0.0077 },
          { from: 10000001, rate: 0.0072 },
          { from: 20000001, rate: 0.0068 },
          { from: 40000001, rate: 0.0064 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0085 },
          { from: 250001, rate: 0.0081 },
          { from: 1000001, rate: 0.0077 },
          { from: 3000001, rate: 0.0072 },
          { from: 5000001, rate: 0.0068 },
          { from: 10000001, rate: 0.0064 },
        ],
      },
      INR: {
        marketing: 2.2357,
        utility: 0.6226,
        authentication: 0.6226,
        utilityTiers: [
          { from: 0, rate: 0.6226 },
          { from: 1000001, rate: 0.5915 },
          { from: 5000001, rate: 0.5603 },
          { from: 10000001, rate: 0.5292 },
          { from: 20000001, rate: 0.4981 },
          { from: 40000001, rate: 0.467 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.6226 },
          { from: 250001, rate: 0.5915 },
          { from: 1000001, rate: 0.5603 },
          { from: 3000001, rate: 0.5292 },
          { from: 5000001, rate: 0.4981 },
          { from: 10000001, rate: 0.467 },
        ],
      },
    },
  },
  {
    name: "Nigeria",
    rates: {
      USD: {
        marketing: 0.0516,
        utility: 0.0067,
        authentication: 0.0067,
        authenticationInternational: 0.075,
        utilityTiers: [
          { from: 0, rate: 0.0067 },
          { from: 100001, rate: 0.0064 },
          { from: 1000001, rate: 0.006 },
          { from: 4500001, rate: 0.0057 },
          { from: 40000001, rate: 0.0054 },
          { from: 80000001, rate: 0.005 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0067 },
          { from: 300001, rate: 0.0064 },
          { from: 2000001, rate: 0.006 },
          { from: 10000001, rate: 0.0057 },
          { from: 20000001, rate: 0.0054 },
          { from: 40000001, rate: 0.005 },
        ],
      },
      INR: {
        marketing: 3.7851,
        utility: 0.4915,
        authentication: 0.4915,
        authenticationInternational: 5.5035,
        utilityTiers: [
          { from: 0, rate: 0.4915 },
          { from: 100001, rate: 0.4669 },
          { from: 1000001, rate: 0.4424 },
          { from: 4500001, rate: 0.4178 },
          { from: 40000001, rate: 0.3932 },
          { from: 80000001, rate: 0.3686 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.4915 },
          { from: 300001, rate: 0.4669 },
          { from: 2000001, rate: 0.4424 },
          { from: 10000001, rate: 0.4178 },
          { from: 20000001, rate: 0.3932 },
          { from: 40000001, rate: 0.3686 },
        ],
      },
    },
  },
  {
    name: "South Africa",
    rates: {
      USD: {
        marketing: 0.0379,
        utility: 0.0076,
        authentication: 0.0076,
        authenticationInternational: 0.02,
        utilityTiers: [
          { from: 0, rate: 0.0076 },
          { from: 100001, rate: 0.0072 },
          { from: 1000001, rate: 0.0068 },
          { from: 4500001, rate: 0.0065 },
          { from: 40000001, rate: 0.0061 },
          { from: 80000001, rate: 0.0057 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0076 },
          { from: 300001, rate: 0.0072 },
          { from: 2000001, rate: 0.0068 },
          { from: 10000001, rate: 0.0065 },
          { from: 20000001, rate: 0.0061 },
          { from: 40000001, rate: 0.0057 },
        ],
      },
      INR: {
        marketing: 2.7821,
        utility: 0.5579,
        authentication: 0.5579,
        authenticationInternational: 1.4681,
        utilityTiers: [
          { from: 0, rate: 0.5579 },
          { from: 100001, rate: 0.53 },
          { from: 1000001, rate: 0.5021 },
          { from: 4500001, rate: 0.4742 },
          { from: 40000001, rate: 0.4463 },
          { from: 80000001, rate: 0.4184 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.5579 },
          { from: 300001, rate: 0.53 },
          { from: 2000001, rate: 0.5021 },
          { from: 10000001, rate: 0.4742 },
          { from: 20000001, rate: 0.4463 },
          { from: 40000001, rate: 0.4184 },
        ],
      },
    },
  },
  {
    name: "Pakistan",
    rates: {
      USD: {
        marketing: 0.0473,
        utility: 0.01,
        authentication: 0.01,
        authenticationInternational: 0.075,
        utilityTiers: [
          { from: 0, rate: 0.01 },
          { from: 150001, rate: 0.0095 },
          { from: 1000001, rate: 0.009 },
          { from: 4000001, rate: 0.0085 },
          { from: 25000001, rate: 0.008 },
          { from: 50000001, rate: 0.0075 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.01 },
          { from: 100001, rate: 0.0095 },
          { from: 300001, rate: 0.009 },
          { from: 1000001, rate: 0.0085 },
          { from: 10000001, rate: 0.008 },
          { from: 20000001, rate: 0.0075 },
        ],
      },
      INR: {
        marketing: 3.4683,
        utility: 0.7333,
        authentication: 0.7333,
        authenticationInternational: 5.5035,
        utilityTiers: [
          { from: 0, rate: 0.7333 },
          { from: 150001, rate: 0.6966 },
          { from: 1000001, rate: 0.66 },
          { from: 4000001, rate: 0.6233 },
          { from: 25000001, rate: 0.5866 },
          { from: 50000001, rate: 0.55 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.7333 },
          { from: 100001, rate: 0.6966 },
          { from: 300001, rate: 0.66 },
          { from: 1000001, rate: 0.6233 },
          { from: 10000001, rate: 0.5866 },
          { from: 20000001, rate: 0.55 },
        ],
      },
    },
  },
  {
    name: "Malaysia",
    rates: {
      USD: {
        marketing: 0.086,
        utility: 0.014,
        authentication: 0.014,
        authenticationInternational: 0.0418,
        utilityTiers: [
          { from: 0, rate: 0.014 },
          { from: 150001, rate: 0.0133 },
          { from: 1000001, rate: 0.0126 },
          { from: 4000001, rate: 0.0119 },
          { from: 25000001, rate: 0.0112 },
          { from: 50000001, rate: 0.0105 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.014 },
          { from: 100001, rate: 0.0133 },
          { from: 300001, rate: 0.0126 },
          { from: 1000001, rate: 0.0119 },
          { from: 10000001, rate: 0.0112 },
          { from: 20000001, rate: 0.0105 },
        ],
      },
      INR: {
        marketing: 6.3037,
        utility: 1.0262,
        authentication: 1.0262,
        authenticationInternational: 3.0639,
        utilityTiers: [
          { from: 0, rate: 1.0262 },
          { from: 150001, rate: 0.9749 },
          { from: 1000001, rate: 0.9236 },
          { from: 4000001, rate: 0.8723 },
          { from: 25000001, rate: 0.821 },
          { from: 50000001, rate: 0.7697 },
        ],
        authenticationTiers: [
          { from: 0, rate: 1.0262 },
          { from: 100001, rate: 0.9749 },
          { from: 300001, rate: 0.9236 },
          { from: 1000001, rate: 0.8723 },
          { from: 10000001, rate: 0.821 },
          { from: 20000001, rate: 0.7697 },
        ],
      },
    },
  },
  {
    name: "Singapore",
    rates: {
      USD: {
        marketing: 0.0732,
        utility: 0.016,
        authentication: 0.016,
        utilityTiers: [
          { from: 0, rate: 0.016 },
          { from: 150001, rate: 0.0152 },
          { from: 1000001, rate: 0.0144 },
          { from: 4000001, rate: 0.0136 },
          { from: 25000001, rate: 0.0128 },
          { from: 50000001, rate: 0.012 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.016 },
          { from: 100001, rate: 0.0152 },
          { from: 300001, rate: 0.0144 },
          { from: 1000001, rate: 0.0136 },
          { from: 10000001, rate: 0.0128 },
          { from: 20000001, rate: 0.012 },
        ],
      },
      INR: {
        marketing: 5.3664,
        utility: 1.1727,
        authentication: 1.1727,
        utilityTiers: [
          { from: 0, rate: 1.1727 },
          { from: 150001, rate: 1.1141 },
          { from: 1000001, rate: 1.0554 },
          { from: 4000001, rate: 0.9968 },
          { from: 25000001, rate: 0.9382 },
          { from: 50000001, rate: 0.8795 },
        ],
        authenticationTiers: [
          { from: 0, rate: 1.1727 },
          { from: 100001, rate: 1.1141 },
          { from: 300001, rate: 1.0554 },
          { from: 1000001, rate: 0.9968 },
          { from: 10000001, rate: 0.9382 },
          { from: 20000001, rate: 0.8795 },
        ],
      },
    },
  },
  {
    name: "Hong Kong",
    rates: {
      USD: {
        marketing: 0.0732,
        utility: 0.026,
        authentication: 0.026,
        utilityTiers: [
          { from: 0, rate: 0.026 },
          { from: 150001, rate: 0.0247 },
          { from: 1000001, rate: 0.0234 },
          { from: 4000001, rate: 0.0221 },
          { from: 25000001, rate: 0.0208 },
          { from: 50000001, rate: 0.0195 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.026 },
          { from: 100001, rate: 0.0247 },
          { from: 300001, rate: 0.0234 },
          { from: 1000001, rate: 0.0221 },
          { from: 10000001, rate: 0.0208 },
          { from: 20000001, rate: 0.0195 },
        ],
      },
      INR: {
        marketing: 5.3664,
        utility: 1.9056,
        authentication: 1.9056,
        utilityTiers: [
          { from: 0, rate: 1.9056 },
          { from: 150001, rate: 1.8103 },
          { from: 1000001, rate: 1.715 },
          { from: 4000001, rate: 1.6198 },
          { from: 25000001, rate: 1.5245 },
          { from: 50000001, rate: 1.4292 },
        ],
        authenticationTiers: [
          { from: 0, rate: 1.9056 },
          { from: 100001, rate: 1.8103 },
          { from: 300001, rate: 1.715 },
          { from: 1000001, rate: 1.6198 },
          { from: 10000001, rate: 1.5245 },
          { from: 20000001, rate: 1.4292 },
        ],
      },
    },
  },
  {
    name: "United Kingdom",
    rates: {
      USD: {
        marketing: 0.0635,
        utility: 0.022,
        authentication: 0.022,
        utilityTiers: [
          { from: 0, rate: 0.022 },
          { from: 100001, rate: 0.0209 },
          { from: 1000001, rate: 0.0198 },
          { from: 4500001, rate: 0.0187 },
          { from: 40000001, rate: 0.0176 },
          { from: 80000001, rate: 0.0165 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.022 },
          { from: 300001, rate: 0.0209 },
          { from: 2000001, rate: 0.0198 },
          { from: 10000001, rate: 0.0187 },
          { from: 20000001, rate: 0.0176 },
          { from: 40000001, rate: 0.0165 },
        ],
      },
      INR: {
        marketing: 4.6496,
        utility: 1.6122,
        authentication: 1.6122,
        utilityTiers: [
          { from: 0, rate: 1.6122 },
          { from: 100001, rate: 1.5316 },
          { from: 1000001, rate: 1.451 },
          { from: 4500001, rate: 1.3704 },
          { from: 40000001, rate: 1.2898 },
          { from: 80000001, rate: 1.2092 },
        ],
        authenticationTiers: [
          { from: 0, rate: 1.6122 },
          { from: 300001, rate: 1.5316 },
          { from: 2000001, rate: 1.451 },
          { from: 10000001, rate: 1.3704 },
          { from: 20000001, rate: 1.2898 },
          { from: 40000001, rate: 1.2092 },
        ],
      },
    },
  },
  {
    name: "Germany",
    rates: {
      USD: {
        marketing: 0.1365,
        utility: 0.055,
        authentication: 0.055,
        utilityTiers: [
          { from: 0, rate: 0.055 },
          { from: 100001, rate: 0.0523 },
          { from: 1000001, rate: 0.0495 },
          { from: 4500001, rate: 0.0468 },
          { from: 40000001, rate: 0.044 },
          { from: 80000001, rate: 0.0413 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.055 },
          { from: 300001, rate: 0.0523 },
          { from: 2000001, rate: 0.0495 },
          { from: 10000001, rate: 0.0468 },
          { from: 20000001, rate: 0.044 },
          { from: 40000001, rate: 0.0413 },
        ],
      },
      INR: {
        marketing: 10.0073,
        utility: 4.0322,
        authentication: 4.0322,
        utilityTiers: [
          { from: 0, rate: 4.0322 },
          { from: 100001, rate: 3.8306 },
          { from: 1000001, rate: 3.629 },
          { from: 4500001, rate: 3.4274 },
          { from: 40000001, rate: 3.2258 },
          { from: 80000001, rate: 3.0242 },
        ],
        authenticationTiers: [
          { from: 0, rate: 4.0322 },
          { from: 300001, rate: 3.8306 },
          { from: 2000001, rate: 3.629 },
          { from: 10000001, rate: 3.4274 },
          { from: 20000001, rate: 3.2258 },
          { from: 40000001, rate: 3.0242 },
        ],
      },
    },
  },
  {
    name: "France",
    rates: {
      USD: {
        marketing: 0.0859,
        utility: 0.03,
        authentication: 0.03,
        utilityTiers: [
          { from: 0, rate: 0.03 },
          { from: 100001, rate: 0.0285 },
          { from: 1000001, rate: 0.027 },
          { from: 4500001, rate: 0.0255 },
          { from: 40000001, rate: 0.024 },
          { from: 80000001, rate: 0.0225 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.03 },
          { from: 300001, rate: 0.0285 },
          { from: 2000001, rate: 0.027 },
          { from: 10000001, rate: 0.0255 },
          { from: 20000001, rate: 0.024 },
          { from: 40000001, rate: 0.0225 },
        ],
      },
      INR: {
        marketing: 6.299,
        utility: 2.1994,
        authentication: 2.1994,
        utilityTiers: [
          { from: 0, rate: 2.1994 },
          { from: 100001, rate: 2.0894 },
          { from: 1000001, rate: 1.9795 },
          { from: 4500001, rate: 1.8695 },
          { from: 40000001, rate: 1.7595 },
          { from: 80000001, rate: 1.6496 },
        ],
        authenticationTiers: [
          { from: 0, rate: 2.1994 },
          { from: 300001, rate: 2.0894 },
          { from: 2000001, rate: 1.9795 },
          { from: 10000001, rate: 1.8695 },
          { from: 20000001, rate: 1.7595 },
          { from: 40000001, rate: 1.6496 },
        ],
      },
    },
  },
  {
    name: "Italy",
    rates: {
      USD: {
        marketing: 0.0795,
        utility: 0.03,
        authentication: 0.03,
        utilityTiers: [
          { from: 0, rate: 0.03 },
          { from: 100001, rate: 0.0285 },
          { from: 1000001, rate: 0.027 },
          { from: 4500001, rate: 0.0255 },
          { from: 40000001, rate: 0.024 },
          { from: 80000001, rate: 0.0225 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.03 },
          { from: 300001, rate: 0.0285 },
          { from: 2000001, rate: 0.027 },
          { from: 10000001, rate: 0.0255 },
          { from: 20000001, rate: 0.024 },
          { from: 40000001, rate: 0.0225 },
        ],
      },
      INR: {
        marketing: 5.8206,
        utility: 2.1974,
        authentication: 2.1974,
        utilityTiers: [
          { from: 0, rate: 2.1974 },
          { from: 100001, rate: 2.0875 },
          { from: 1000001, rate: 1.9777 },
          { from: 4500001, rate: 1.8678 },
          { from: 40000001, rate: 1.7579 },
          { from: 80000001, rate: 1.6481 },
        ],
        authenticationTiers: [
          { from: 0, rate: 2.1974 },
          { from: 300001, rate: 2.0875 },
          { from: 2000001, rate: 1.9777 },
          { from: 10000001, rate: 1.8678 },
          { from: 20000001, rate: 1.7579 },
          { from: 40000001, rate: 1.6481 },
        ],
      },
    },
  },
  {
    name: "Spain",
    rates: {
      USD: {
        marketing: 0.0707,
        utility: 0.02,
        authentication: 0.02,
        utilityTiers: [
          { from: 0, rate: 0.02 },
          { from: 100001, rate: 0.019 },
          { from: 1000001, rate: 0.018 },
          { from: 4500001, rate: 0.017 },
          { from: 40000001, rate: 0.016 },
          { from: 80000001, rate: 0.015 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.02 },
          { from: 300001, rate: 0.019 },
          { from: 2000001, rate: 0.018 },
          { from: 10000001, rate: 0.017 },
          { from: 20000001, rate: 0.016 },
          { from: 40000001, rate: 0.015 },
        ],
      },
      INR: {
        marketing: 5.1801,
        utility: 1.4648,
        authentication: 1.4648,
        utilityTiers: [
          { from: 0, rate: 1.4648 },
          { from: 100001, rate: 1.3916 },
          { from: 1000001, rate: 1.3183 },
          { from: 4500001, rate: 1.2451 },
          { from: 40000001, rate: 1.1718 },
          { from: 80000001, rate: 1.0986 },
        ],
        authenticationTiers: [
          { from: 0, rate: 1.4648 },
          { from: 300001, rate: 1.3916 },
          { from: 2000001, rate: 1.3183 },
          { from: 10000001, rate: 1.2451 },
          { from: 20000001, rate: 1.1718 },
          { from: 40000001, rate: 1.0986 },
        ],
      },
    },
  },
  {
    name: "Netherlands",
    rates: {
      USD: {
        marketing: 0.1597,
        utility: 0.05,
        authentication: 0.05,
        utilityTiers: [
          { from: 0, rate: 0.05 },
          { from: 100001, rate: 0.0475 },
          { from: 1000001, rate: 0.045 },
          { from: 4500001, rate: 0.0425 },
          { from: 40000001, rate: 0.04 },
          { from: 80000001, rate: 0.0375 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.05 },
          { from: 300001, rate: 0.0475 },
          { from: 2000001, rate: 0.045 },
          { from: 10000001, rate: 0.0425 },
          { from: 20000001, rate: 0.04 },
          { from: 40000001, rate: 0.0375 },
        ],
      },
      INR: {
        marketing: 11.7078,
        utility: 3.6656,
        authentication: 3.6656,
        utilityTiers: [
          { from: 0, rate: 3.6656 },
          { from: 100001, rate: 3.4823 },
          { from: 1000001, rate: 3.299 },
          { from: 4500001, rate: 3.1158 },
          { from: 40000001, rate: 2.9325 },
          { from: 80000001, rate: 2.7492 },
        ],
        authenticationTiers: [
          { from: 0, rate: 3.6656 },
          { from: 300001, rate: 3.4823 },
          { from: 2000001, rate: 3.299 },
          { from: 10000001, rate: 3.1158 },
          { from: 20000001, rate: 2.9325 },
          { from: 40000001, rate: 2.7492 },
        ],
      },
    },
  },
  {
    name: "Poland",
    rates: {
      USD: {
        marketing: 0.0366,
        utility: 0.0122,
        authentication: 0.0122,
        utilityTiers: [
          { from: 0, rate: 0.0122 },
          { from: 100001, rate: 0.0116 },
          { from: 1000001, rate: 0.011 },
          { from: 4500001, rate: 0.0104 },
          { from: 40000001, rate: 0.0098 },
          { from: 80000001, rate: 0.0092 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0122 },
          { from: 300001, rate: 0.0116 },
          { from: 2000001, rate: 0.011 },
          { from: 10000001, rate: 0.0104 },
          { from: 20000001, rate: 0.0098 },
          { from: 40000001, rate: 0.0092 },
        ],
      },
      INR: {
        marketing: 2.6754,
        utility: 0.8918,
        authentication: 0.8918,
        utilityTiers: [
          { from: 0, rate: 0.8918 },
          { from: 100001, rate: 0.8472 },
          { from: 1000001, rate: 0.8026 },
          { from: 4500001, rate: 0.758 },
          { from: 40000001, rate: 0.7134 },
          { from: 80000001, rate: 0.6689 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.8918 },
          { from: 300001, rate: 0.8472 },
          { from: 2000001, rate: 0.8026 },
          { from: 10000001, rate: 0.758 },
          { from: 20000001, rate: 0.7134 },
          { from: 40000001, rate: 0.6689 },
        ],
      },
    },
  },
  {
    name: "Hungary",
    rates: {
      USD: {
        marketing: 0.086,
        utility: 0.035,
        authentication: 0.035,
        utilityTiers: [
          { from: 0, rate: 0.035 },
          { from: 100001, rate: 0.0333 },
          { from: 1000001, rate: 0.0315 },
          { from: 4500001, rate: 0.0298 },
          { from: 40000001, rate: 0.028 },
          { from: 80000001, rate: 0.0263 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.035 },
          { from: 300001, rate: 0.0333 },
          { from: 2000001, rate: 0.0315 },
          { from: 10000001, rate: 0.0298 },
          { from: 20000001, rate: 0.028 },
          { from: 40000001, rate: 0.0263 },
        ],
      },
      INR: {
        marketing: 6.2997,
        utility: 2.5583,
        authentication: 2.5583,
        utilityTiers: [
          { from: 0, rate: 2.5583 },
          { from: 100001, rate: 2.4304 },
          { from: 1000001, rate: 2.3025 },
          { from: 4500001, rate: 2.1746 },
          { from: 40000001, rate: 2.0466 },
          { from: 80000001, rate: 1.9187 },
        ],
        authenticationTiers: [
          { from: 0, rate: 2.5583 },
          { from: 300001, rate: 2.4304 },
          { from: 2000001, rate: 2.3025 },
          { from: 10000001, rate: 2.1746 },
          { from: 20000001, rate: 2.0466 },
          { from: 40000001, rate: 1.9187 },
        ],
      },
    },
  },
  {
    name: "Romania",
    rates: {
      USD: {
        marketing: 0.086,
        utility: 0.029,
        authentication: 0.029,
        utilityTiers: [
          { from: 0, rate: 0.029 },
          { from: 100001, rate: 0.0276 },
          { from: 1000001, rate: 0.0261 },
          { from: 4500001, rate: 0.0247 },
          { from: 40000001, rate: 0.0232 },
          { from: 80000001, rate: 0.0218 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.029 },
          { from: 300001, rate: 0.0276 },
          { from: 2000001, rate: 0.0261 },
          { from: 10000001, rate: 0.0247 },
          { from: 20000001, rate: 0.0232 },
          { from: 40000001, rate: 0.0218 },
        ],
      },
      INR: {
        marketing: 6.2997,
        utility: 2.1197,
        authentication: 2.1197,
        utilityTiers: [
          { from: 0, rate: 2.1197 },
          { from: 100001, rate: 2.0137 },
          { from: 1000001, rate: 1.9077 },
          { from: 4500001, rate: 1.8017 },
          { from: 40000001, rate: 1.6958 },
          { from: 80000001, rate: 1.5898 },
        ],
        authenticationTiers: [
          { from: 0, rate: 2.1197 },
          { from: 300001, rate: 2.0137 },
          { from: 2000001, rate: 1.9077 },
          { from: 10000001, rate: 1.8017 },
          { from: 20000001, rate: 1.6958 },
          { from: 40000001, rate: 1.5898 },
        ],
      },
    },
  },
  {
    name: "Russia",
    rates: {
      USD: {
        marketing: 0.0802,
        utility: 0.04,
        authentication: 0.04,
        utilityTiers: [
          { from: 0, rate: 0.04 },
          { from: 100001, rate: 0.038 },
          { from: 1000001, rate: 0.036 },
          { from: 4500001, rate: 0.034 },
          { from: 40000001, rate: 0.032 },
          { from: 80000001, rate: 0.03 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.04 },
          { from: 300001, rate: 0.038 },
          { from: 2000001, rate: 0.036 },
          { from: 10000001, rate: 0.034 },
          { from: 20000001, rate: 0.032 },
          { from: 40000001, rate: 0.03 },
        ],
      },
      INR: {
        marketing: 5.8767,
        utility: 2.9311,
        authentication: 2.9311,
        utilityTiers: [
          { from: 0, rate: 2.9311 },
          { from: 100001, rate: 2.7845 },
          { from: 1000001, rate: 2.638 },
          { from: 4500001, rate: 2.4914 },
          { from: 40000001, rate: 2.3449 },
          { from: 80000001, rate: 2.1983 },
        ],
        authenticationTiers: [
          { from: 0, rate: 2.9311 },
          { from: 300001, rate: 2.7845 },
          { from: 2000001, rate: 2.638 },
          { from: 10000001, rate: 2.4914 },
          { from: 20000001, rate: 2.3449 },
          { from: 40000001, rate: 2.1983 },
        ],
      },
    },
  },
  {
    name: "Turkey",
    rates: {
      USD: {
        marketing: 0.0109,
        utility: 0.0009,
        authentication: 0.0009,
        utilityTiers: [
          { from: 0, rate: 0.0009 },
          { from: 100001, rate: 0.0009 },
          { from: 1000001, rate: 0.0008 },
          { from: 4500001, rate: 0.0008 },
          { from: 40000001, rate: 0.0007 },
          { from: 80000001, rate: 0.0007 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0009 },
          { from: 300001, rate: 0.0009 },
          { from: 2000001, rate: 0.0008 },
          { from: 10000001, rate: 0.0008 },
          { from: 20000001, rate: 0.0007 },
          { from: 40000001, rate: 0.0007 },
        ],
      },
      INR: {
        marketing: 0.7989,
        utility: 0.066,
        authentication: 0.066,
        utilityTiers: [
          { from: 0, rate: 0.066 },
          { from: 100001, rate: 0.0627 },
          { from: 1000001, rate: 0.0594 },
          { from: 4500001, rate: 0.0561 },
          { from: 40000001, rate: 0.0528 },
          { from: 80000001, rate: 0.0495 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.066 },
          { from: 300001, rate: 0.0627 },
          { from: 2000001, rate: 0.0594 },
          { from: 10000001, rate: 0.0561 },
          { from: 20000001, rate: 0.0528 },
          { from: 40000001, rate: 0.0495 },
        ],
      },
    },
  },
  {
    name: "Israel",
    rates: {
      USD: {
        marketing: 0.0353,
        utility: 0.0053,
        authentication: 0.0053,
        utilityTiers: [
          { from: 0, rate: 0.0053 },
          { from: 100001, rate: 0.005 },
          { from: 1000001, rate: 0.0048 },
          { from: 4500001, rate: 0.0045 },
          { from: 40000001, rate: 0.0042 },
          { from: 80000001, rate: 0.004 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0053 },
          { from: 300001, rate: 0.005 },
          { from: 2000001, rate: 0.0048 },
          { from: 10000001, rate: 0.0045 },
          { from: 20000001, rate: 0.0042 },
          { from: 40000001, rate: 0.004 },
        ],
      },
      INR: {
        marketing: 2.5871,
        utility: 0.3885,
        authentication: 0.3885,
        utilityTiers: [
          { from: 0, rate: 0.3885 },
          { from: 100001, rate: 0.3691 },
          { from: 1000001, rate: 0.3497 },
          { from: 4500001, rate: 0.3302 },
          { from: 40000001, rate: 0.3108 },
          { from: 80000001, rate: 0.2914 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.3885 },
          { from: 300001, rate: 0.3691 },
          { from: 2000001, rate: 0.3497 },
          { from: 10000001, rate: 0.3302 },
          { from: 20000001, rate: 0.3108 },
          { from: 40000001, rate: 0.2914 },
        ],
      },
    },
  },
  {
    name: "Qatar",
    rates: {
      USD: {
        marketing: 0.0341,
        utility: 0.012,
        authentication: 0.012,
        utilityTiers: [
          { from: 0, rate: 0.012 },
          { from: 100001, rate: 0.0114 },
          { from: 1000001, rate: 0.0108 },
          { from: 4500001, rate: 0.0102 },
          { from: 40000001, rate: 0.0096 },
          { from: 80000001, rate: 0.009 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.012 },
          { from: 300001, rate: 0.0114 },
          { from: 2000001, rate: 0.0108 },
          { from: 10000001, rate: 0.0102 },
          { from: 20000001, rate: 0.0096 },
          { from: 40000001, rate: 0.009 },
        ],
      },
      INR: {
        marketing: 2.4993,
        utility: 0.8789,
        authentication: 0.8789,
        utilityTiers: [
          { from: 0, rate: 0.8789 },
          { from: 100001, rate: 0.835 },
          { from: 1000001, rate: 0.791 },
          { from: 4500001, rate: 0.7471 },
          { from: 40000001, rate: 0.7031 },
          { from: 80000001, rate: 0.6592 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.8789 },
          { from: 300001, rate: 0.835 },
          { from: 2000001, rate: 0.791 },
          { from: 10000001, rate: 0.7471 },
          { from: 20000001, rate: 0.7031 },
          { from: 40000001, rate: 0.6592 },
        ],
      },
    },
  },
  {
    name: "Egypt",
    rates: {
      USD: {
        marketing: 0.0644,
        utility: 0.0036,
        authentication: 0.0036,
        authenticationInternational: 0.065,
        utilityTiers: [
          { from: 0, rate: 0.0036 },
          { from: 100001, rate: 0.0034 },
          { from: 1000001, rate: 0.0032 },
          { from: 4500001, rate: 0.0031 },
          { from: 40000001, rate: 0.0029 },
          { from: 80000001, rate: 0.0027 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0036 },
          { from: 300001, rate: 0.0034 },
          { from: 2000001, rate: 0.0032 },
          { from: 10000001, rate: 0.0031 },
          { from: 20000001, rate: 0.0029 },
          { from: 40000001, rate: 0.0027 },
        ],
      },
      INR: {
        marketing: 4.7191,
        utility: 0.2639,
        authentication: 0.2639,
        authenticationInternational: 4.7668,
        utilityTiers: [
          { from: 0, rate: 0.2639 },
          { from: 100001, rate: 0.2507 },
          { from: 1000001, rate: 0.2375 },
          { from: 4500001, rate: 0.2243 },
          { from: 40000001, rate: 0.2111 },
          { from: 80000001, rate: 0.1979 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.2639 },
          { from: 300001, rate: 0.2507 },
          { from: 2000001, rate: 0.2375 },
          { from: 10000001, rate: 0.2243 },
          { from: 20000001, rate: 0.2111 },
          { from: 40000001, rate: 0.1979 },
        ],
      },
    },
  },
  {
    name: "Argentina",
    rates: {
      USD: {
        marketing: 0.0618,
        utility: 0.026,
        authentication: 0.026,
        utilityTiers: [
          { from: 0, rate: 0.026 },
          { from: 100001, rate: 0.0247 },
          { from: 1000001, rate: 0.0234 },
          { from: 4500001, rate: 0.0221 },
          { from: 15000001, rate: 0.0208 },
          { from: 30000001, rate: 0.0195 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.026 },
          { from: 120001, rate: 0.0247 },
          { from: 400001, rate: 0.0234 },
          { from: 1000001, rate: 0.0221 },
          { from: 5000001, rate: 0.0208 },
          { from: 10000001, rate: 0.0195 },
        ],
      },
      INR: {
        marketing: 4.5293,
        utility: 1.9062,
        authentication: 1.9062,
        utilityTiers: [
          { from: 0, rate: 1.9062 },
          { from: 100001, rate: 1.8109 },
          { from: 1000001, rate: 1.7156 },
          { from: 4500001, rate: 1.6203 },
          { from: 15000001, rate: 1.525 },
          { from: 30000001, rate: 1.4297 },
        ],
        authenticationTiers: [
          { from: 0, rate: 1.9062 },
          { from: 120001, rate: 1.8109 },
          { from: 400001, rate: 1.7156 },
          { from: 1000001, rate: 1.6203 },
          { from: 5000001, rate: 1.525 },
          { from: 10000001, rate: 1.4297 },
        ],
      },
    },
  },
  {
    name: "Chile",
    rates: {
      USD: {
        marketing: 0.0889,
        utility: 0.02,
        authentication: 0.02,
        utilityTiers: [
          { from: 0, rate: 0.02 },
          { from: 100001, rate: 0.019 },
          { from: 1000001, rate: 0.018 },
          { from: 4500001, rate: 0.017 },
          { from: 15000001, rate: 0.016 },
          { from: 30000001, rate: 0.015 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.02 },
          { from: 120001, rate: 0.019 },
          { from: 400001, rate: 0.018 },
          { from: 1000001, rate: 0.017 },
          { from: 5000001, rate: 0.016 },
          { from: 10000001, rate: 0.015 },
        ],
      },
      INR: {
        marketing: 6.5135,
        utility: 1.4654,
        authentication: 1.4654,
        utilityTiers: [
          { from: 0, rate: 1.4654 },
          { from: 100001, rate: 1.3921 },
          { from: 1000001, rate: 1.3189 },
          { from: 4500001, rate: 1.2456 },
          { from: 15000001, rate: 1.1723 },
          { from: 30000001, rate: 1.0991 },
        ],
        authenticationTiers: [
          { from: 0, rate: 1.4654 },
          { from: 120001, rate: 1.3921 },
          { from: 400001, rate: 1.3189 },
          { from: 1000001, rate: 1.2456 },
          { from: 5000001, rate: 1.1723 },
          { from: 10000001, rate: 1.0991 },
        ],
      },
    },
  },
  {
    name: "Colombia",
    rates: {
      USD: {
        marketing: 0.0125,
        utility: 0.0008,
        authentication: 0.0008,
        utilityTiers: [
          { from: 0, rate: 0.0008 },
          { from: 100001, rate: 0.0008 },
          { from: 1000001, rate: 0.0007 },
          { from: 4500001, rate: 0.0007 },
          { from: 15000001, rate: 0.0006 },
          { from: 30000001, rate: 0.0006 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0008 },
          { from: 120001, rate: 0.0008 },
          { from: 400001, rate: 0.0007 },
          { from: 1000001, rate: 0.0007 },
          { from: 5000001, rate: 0.0006 },
          { from: 10000001, rate: 0.0006 },
        ],
      },
      INR: {
        marketing: 0.9161,
        utility: 0.0588,
        authentication: 0.0588,
        utilityTiers: [
          { from: 0, rate: 0.0588 },
          { from: 100001, rate: 0.0559 },
          { from: 1000001, rate: 0.0529 },
          { from: 4500001, rate: 0.05 },
          { from: 15000001, rate: 0.047 },
          { from: 30000001, rate: 0.0441 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0588 },
          { from: 120001, rate: 0.0559 },
          { from: 400001, rate: 0.0529 },
          { from: 1000001, rate: 0.05 },
          { from: 5000001, rate: 0.047 },
          { from: 10000001, rate: 0.0441 },
        ],
      },
    },
  },
  {
    name: "Peru",
    rates: {
      USD: {
        marketing: 0.0703,
        utility: 0.02,
        authentication: 0.02,
        utilityTiers: [
          { from: 0, rate: 0.02 },
          { from: 100001, rate: 0.019 },
          { from: 1000001, rate: 0.018 },
          { from: 4500001, rate: 0.017 },
          { from: 15000001, rate: 0.016 },
          { from: 30000001, rate: 0.015 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.02 },
          { from: 120001, rate: 0.019 },
          { from: 400001, rate: 0.018 },
          { from: 1000001, rate: 0.017 },
          { from: 5000001, rate: 0.016 },
          { from: 10000001, rate: 0.015 },
        ],
      },
      INR: {
        marketing: 5.1536,
        utility: 1.4662,
        authentication: 1.4662,
        utilityTiers: [
          { from: 0, rate: 1.4662 },
          { from: 100001, rate: 1.3929 },
          { from: 1000001, rate: 1.3196 },
          { from: 4500001, rate: 1.2463 },
          { from: 15000001, rate: 1.173 },
          { from: 30000001, rate: 1.0997 },
        ],
        authenticationTiers: [
          { from: 0, rate: 1.4662 },
          { from: 120001, rate: 1.3929 },
          { from: 400001, rate: 1.3196 },
          { from: 1000001, rate: 1.2463 },
          { from: 5000001, rate: 1.173 },
          { from: 10000001, rate: 1.0997 },
        ],
      },
    },
  },
  {
    name: "North America",
    rates: {
      USD: {
        marketing: 0.025,
        utility: 0.0034,
        authentication: 0.0034,
        utilityTiers: [
          { from: 0, rate: 0.0034 },
          { from: 80001, rate: 0.0032 },
          { from: 750001, rate: 0.0031 },
          { from: 2250001, rate: 0.0029 },
          { from: 3000001, rate: 0.0027 },
          { from: 6000001, rate: 0.0026 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0034 },
          { from: 100001, rate: 0.0032 },
          { from: 500001, rate: 0.0031 },
          { from: 2000001, rate: 0.0029 },
          { from: 5000001, rate: 0.0027 },
          { from: 10000001, rate: 0.0026 },
        ],
      },
      INR: {
        marketing: 1.8313,
        utility: 0.2491,
        authentication: 0.2491,
        utilityTiers: [
          { from: 0, rate: 0.2491 },
          { from: 80001, rate: 0.2366 },
          { from: 750001, rate: 0.2242 },
          { from: 2250001, rate: 0.2117 },
          { from: 3000001, rate: 0.1993 },
          { from: 6000001, rate: 0.1868 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.2491 },
          { from: 100001, rate: 0.2366 },
          { from: 500001, rate: 0.2242 },
          { from: 2000001, rate: 0.2117 },
          { from: 5000001, rate: 0.1993 },
          { from: 10000001, rate: 0.1868 },
        ],
      },
    },
  },
  {
    name: "Rest of Asia Pacific",
    rates: {
      USD: {
        marketing: 0.0732,
        utility: 0.0113,
        authentication: 0.0113,
        utilityTiers: [
          { from: 0, rate: 0.0113 },
          { from: 150001, rate: 0.0107 },
          { from: 1000001, rate: 0.0102 },
          { from: 4000001, rate: 0.0096 },
          { from: 25000001, rate: 0.009 },
          { from: 50000001, rate: 0.0085 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0113 },
          { from: 100001, rate: 0.0107 },
          { from: 300001, rate: 0.0102 },
          { from: 1000001, rate: 0.0096 },
          { from: 10000001, rate: 0.009 },
          { from: 20000001, rate: 0.0085 },
        ],
      },
      INR: {
        marketing: 5.3664,
        utility: 0.8282,
        authentication: 0.8282,
        utilityTiers: [
          { from: 0, rate: 0.8282 },
          { from: 150001, rate: 0.7868 },
          { from: 1000001, rate: 0.7454 },
          { from: 4000001, rate: 0.704 },
          { from: 25000001, rate: 0.6626 },
          { from: 50000001, rate: 0.6212 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.8282 },
          { from: 100001, rate: 0.7868 },
          { from: 300001, rate: 0.7454 },
          { from: 1000001, rate: 0.704 },
          { from: 10000001, rate: 0.6626 },
          { from: 20000001, rate: 0.6212 },
        ],
      },
    },
  },
  {
    name: "Rest of Africa",
    rates: {
      USD: {
        marketing: 0.0225,
        utility: 0.004,
        authentication: 0.004,
        utilityTiers: [
          { from: 0, rate: 0.004 },
          { from: 100001, rate: 0.0038 },
          { from: 1000001, rate: 0.0036 },
          { from: 4500001, rate: 0.0034 },
          { from: 40000001, rate: 0.0032 },
          { from: 80000001, rate: 0.003 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.004 },
          { from: 300001, rate: 0.0038 },
          { from: 2000001, rate: 0.0036 },
          { from: 10000001, rate: 0.0034 },
          { from: 20000001, rate: 0.0032 },
          { from: 40000001, rate: 0.003 },
        ],
      },
      INR: {
        marketing: 1.6497,
        utility: 0.293,
        authentication: 0.293,
        utilityTiers: [
          { from: 0, rate: 0.293 },
          { from: 100001, rate: 0.2784 },
          { from: 1000001, rate: 0.2637 },
          { from: 4500001, rate: 0.2491 },
          { from: 40000001, rate: 0.2344 },
          { from: 80000001, rate: 0.2198 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.293 },
          { from: 300001, rate: 0.2784 },
          { from: 2000001, rate: 0.2637 },
          { from: 10000001, rate: 0.2491 },
          { from: 20000001, rate: 0.2344 },
          { from: 40000001, rate: 0.2198 },
        ],
      },
    },
  },
  {
    name: "Rest of Western Europe",
    rates: {
      USD: {
        marketing: 0.0592,
        utility: 0.0171,
        authentication: 0.0171,
        utilityTiers: [
          { from: 0, rate: 0.0171 },
          { from: 100001, rate: 0.0162 },
          { from: 1000001, rate: 0.0154 },
          { from: 4500001, rate: 0.0145 },
          { from: 40000001, rate: 0.0137 },
          { from: 80000001, rate: 0.0128 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0171 },
          { from: 300001, rate: 0.0162 },
          { from: 2000001, rate: 0.0154 },
          { from: 10000001, rate: 0.0145 },
          { from: 20000001, rate: 0.0137 },
          { from: 40000001, rate: 0.0128 },
        ],
      },
      INR: {
        marketing: 4.3378,
        utility: 1.2516,
        authentication: 1.2516,
        utilityTiers: [
          { from: 0, rate: 1.2516 },
          { from: 100001, rate: 1.189 },
          { from: 1000001, rate: 1.1264 },
          { from: 4500001, rate: 1.0639 },
          { from: 40000001, rate: 1.0013 },
          { from: 80000001, rate: 0.9387 },
        ],
        authenticationTiers: [
          { from: 0, rate: 1.2516 },
          { from: 300001, rate: 1.189 },
          { from: 2000001, rate: 1.1264 },
          { from: 10000001, rate: 1.0639 },
          { from: 20000001, rate: 1.0013 },
          { from: 40000001, rate: 0.9387 },
        ],
      },
    },
  },
  {
    name: "Rest of Central & Eastern Europe",
    rates: {
      USD: {
        marketing: 0.086,
        utility: 0.0212,
        authentication: 0.0212,
        utilityTiers: [
          { from: 0, rate: 0.0212 },
          { from: 100001, rate: 0.0201 },
          { from: 1000001, rate: 0.019 },
          { from: 4500001, rate: 0.018 },
          { from: 40000001, rate: 0.0169 },
          { from: 80000001, rate: 0.0159 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0212 },
          { from: 300001, rate: 0.0201 },
          { from: 2000001, rate: 0.019 },
          { from: 10000001, rate: 0.018 },
          { from: 20000001, rate: 0.0169 },
          { from: 40000001, rate: 0.0159 },
        ],
      },
      INR: {
        marketing: 6.2997,
        utility: 1.5496,
        authentication: 1.5496,
        utilityTiers: [
          { from: 0, rate: 1.5496 },
          { from: 100001, rate: 1.4721 },
          { from: 1000001, rate: 1.3946 },
          { from: 4500001, rate: 1.3172 },
          { from: 40000001, rate: 1.2397 },
          { from: 80000001, rate: 1.1622 },
        ],
        authenticationTiers: [
          { from: 0, rate: 1.5496 },
          { from: 300001, rate: 1.4721 },
          { from: 2000001, rate: 1.3946 },
          { from: 10000001, rate: 1.3172 },
          { from: 20000001, rate: 1.2397 },
          { from: 40000001, rate: 1.1622 },
        ],
      },
    },
  },
  {
    name: "Rest of Latin America",
    rates: {
      USD: {
        marketing: 0.074,
        utility: 0.0113,
        authentication: 0.0113,
        utilityTiers: [
          { from: 0, rate: 0.0113 },
          { from: 100001, rate: 0.0107 },
          { from: 1000001, rate: 0.0102 },
          { from: 4500001, rate: 0.0096 },
          { from: 15000001, rate: 0.009 },
          { from: 30000001, rate: 0.0085 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0113 },
          { from: 120001, rate: 0.0107 },
          { from: 400001, rate: 0.0102 },
          { from: 1000001, rate: 0.0096 },
          { from: 5000001, rate: 0.009 },
          { from: 10000001, rate: 0.0085 },
        ],
      },
      INR: {
        marketing: 5.4207,
        utility: 0.8278,
        authentication: 0.8278,
        utilityTiers: [
          { from: 0, rate: 0.8278 },
          { from: 100001, rate: 0.7864 },
          { from: 1000001, rate: 0.745 },
          { from: 4500001, rate: 0.7036 },
          { from: 15000001, rate: 0.6622 },
          { from: 30000001, rate: 0.6209 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.8278 },
          { from: 120001, rate: 0.7864 },
          { from: 400001, rate: 0.745 },
          { from: 1000001, rate: 0.7036 },
          { from: 5000001, rate: 0.6622 },
          { from: 10000001, rate: 0.6209 },
        ],
      },
    },
  },
  {
    name: "Rest of Middle East",
    rates: {
      USD: {
        marketing: 0.0341,
        utility: 0.0091,
        authentication: 0.0091,
        utilityTiers: [
          { from: 0, rate: 0.0091 },
          { from: 100001, rate: 0.0086 },
          { from: 1000001, rate: 0.0082 },
          { from: 4500001, rate: 0.0077 },
          { from: 40000001, rate: 0.0073 },
          { from: 80000001, rate: 0.0068 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0091 },
          { from: 300001, rate: 0.0086 },
          { from: 2000001, rate: 0.0082 },
          { from: 10000001, rate: 0.0077 },
          { from: 20000001, rate: 0.0073 },
          { from: 40000001, rate: 0.0068 },
        ],
      },
      INR: {
        marketing: 2.4993,
        utility: 0.6665,
        authentication: 0.6665,
        utilityTiers: [
          { from: 0, rate: 0.6665 },
          { from: 100001, rate: 0.6332 },
          { from: 1000001, rate: 0.5999 },
          { from: 4500001, rate: 0.5665 },
          { from: 40000001, rate: 0.5332 },
          { from: 80000001, rate: 0.4999 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.6665 },
          { from: 300001, rate: 0.6332 },
          { from: 2000001, rate: 0.5999 },
          { from: 10000001, rate: 0.5665 },
          { from: 20000001, rate: 0.5332 },
          { from: 40000001, rate: 0.4999 },
        ],
      },
    },
  },
  {
    name: "Other",
    rates: {
      USD: {
        marketing: 0.0604,
        utility: 0.0077,
        authentication: 0.0077,
        utilityTiers: [
          { from: 0, rate: 0.0077 },
          { from: 80001, rate: 0.0073 },
          { from: 750001, rate: 0.0069 },
          { from: 2250001, rate: 0.0065 },
          { from: 3000001, rate: 0.0062 },
          { from: 6000001, rate: 0.0058 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.0077 },
          { from: 100001, rate: 0.0073 },
          { from: 500001, rate: 0.0069 },
          { from: 2000001, rate: 0.0065 },
          { from: 5000001, rate: 0.0062 },
          { from: 10000001, rate: 0.0058 },
        ],
      },
      INR: {
        marketing: 4.4248,
        utility: 0.5641,
        authentication: 0.5641,
        utilityTiers: [
          { from: 0, rate: 0.5641 },
          { from: 80001, rate: 0.5359 },
          { from: 750001, rate: 0.5077 },
          { from: 2250001, rate: 0.4795 },
          { from: 3000001, rate: 0.4513 },
          { from: 6000001, rate: 0.4231 },
        ],
        authenticationTiers: [
          { from: 0, rate: 0.5641 },
          { from: 100001, rate: 0.5359 },
          { from: 500001, rate: 0.5077 },
          { from: 2000001, rate: 0.4795 },
          { from: 5000001, rate: 0.4513 },
          { from: 10000001, rate: 0.4231 },
        ],
      },
    },
  },
];

export interface Country {
  /** ISO 3166-1 alpha-2. */
  code: string;
  name: string;
  /** The `Market.name` this country is billed at. */
  market: string;
}

/**
 * Every country Meta names in its mapping table. Anything not listed here is
 * billed at the "Other" rate, which is what `resolveMarket` falls back to.
 */
export const COUNTRIES: Country[] = [
  { code: "AF", name: "Afghanistan", market: "Rest of Asia Pacific" },
  { code: "AL", name: "Albania", market: "Rest of Central & Eastern Europe" },
  { code: "DZ", name: "Algeria", market: "Rest of Africa" },
  { code: "AO", name: "Angola", market: "Rest of Africa" },
  { code: "AR", name: "Argentina", market: "Argentina" },
  { code: "AM", name: "Armenia", market: "Rest of Central & Eastern Europe" },
  { code: "AU", name: "Australia", market: "Rest of Asia Pacific" },
  { code: "AT", name: "Austria", market: "Rest of Western Europe" },
  { code: "AZ", name: "Azerbaijan", market: "Rest of Central & Eastern Europe" },
  { code: "BH", name: "Bahrain", market: "Rest of Middle East" },
  { code: "BD", name: "Bangladesh", market: "Rest of Asia Pacific" },
  { code: "BY", name: "Belarus", market: "Rest of Central & Eastern Europe" },
  { code: "BE", name: "Belgium", market: "Rest of Western Europe" },
  { code: "BJ", name: "Benin", market: "Rest of Africa" },
  { code: "BO", name: "Bolivia", market: "Rest of Latin America" },
  { code: "BW", name: "Botswana", market: "Rest of Africa" },
  { code: "BR", name: "Brazil", market: "Brazil" },
  { code: "BG", name: "Bulgaria", market: "Rest of Central & Eastern Europe" },
  { code: "BF", name: "Burkina Faso", market: "Rest of Africa" },
  { code: "BI", name: "Burundi", market: "Rest of Africa" },
  { code: "KH", name: "Cambodia", market: "Rest of Asia Pacific" },
  { code: "CM", name: "Cameroon", market: "Rest of Africa" },
  { code: "CA", name: "Canada", market: "North America" },
  { code: "TD", name: "Chad", market: "Rest of Africa" },
  { code: "CL", name: "Chile", market: "Chile" },
  { code: "CN", name: "China", market: "Rest of Asia Pacific" },
  { code: "CO", name: "Colombia", market: "Colombia" },
  { code: "CR", name: "Costa Rica", market: "Rest of Latin America" },
  { code: "HR", name: "Croatia", market: "Rest of Central & Eastern Europe" },
  { code: "CZ", name: "Czech Republic", market: "Rest of Central & Eastern Europe" },
  { code: "DK", name: "Denmark", market: "Rest of Western Europe" },
  { code: "DO", name: "Dominican Republic", market: "Rest of Latin America" },
  { code: "EC", name: "Ecuador", market: "Rest of Latin America" },
  { code: "EG", name: "Egypt", market: "Egypt" },
  { code: "SV", name: "El Salvador", market: "Rest of Latin America" },
  { code: "ER", name: "Eritrea", market: "Rest of Africa" },
  { code: "SZ", name: "Eswatini", market: "Rest of Africa" },
  { code: "ET", name: "Ethiopia", market: "Rest of Africa" },
  { code: "FI", name: "Finland", market: "Rest of Western Europe" },
  { code: "FR", name: "France", market: "France" },
  { code: "GA", name: "Gabon", market: "Rest of Africa" },
  { code: "GM", name: "Gambia", market: "Rest of Africa" },
  { code: "GE", name: "Georgia", market: "Rest of Central & Eastern Europe" },
  { code: "DE", name: "Germany", market: "Germany" },
  { code: "GH", name: "Ghana", market: "Rest of Africa" },
  { code: "GR", name: "Greece", market: "Rest of Central & Eastern Europe" },
  { code: "GT", name: "Guatemala", market: "Rest of Latin America" },
  { code: "GW", name: "Guinea-Bissau", market: "Rest of Africa" },
  { code: "HT", name: "Haiti", market: "Rest of Latin America" },
  { code: "HN", name: "Honduras", market: "Rest of Latin America" },
  { code: "HK", name: "Hong Kong", market: "Hong Kong" },
  { code: "HU", name: "Hungary", market: "Hungary" },
  { code: "IN", name: "India", market: "India" },
  { code: "ID", name: "Indonesia", market: "Indonesia" },
  { code: "IQ", name: "Iraq", market: "Rest of Middle East" },
  { code: "IE", name: "Ireland", market: "Rest of Western Europe" },
  { code: "IL", name: "Israel", market: "Israel" },
  { code: "IT", name: "Italy", market: "Italy" },
  { code: "CI", name: "Ivory Coast", market: "Rest of Africa" },
  { code: "JM", name: "Jamaica", market: "Rest of Latin America" },
  { code: "JP", name: "Japan", market: "Rest of Asia Pacific" },
  { code: "JO", name: "Jordan", market: "Rest of Middle East" },
  { code: "KE", name: "Kenya", market: "Rest of Africa" },
  { code: "KW", name: "Kuwait", market: "Rest of Middle East" },
  { code: "LA", name: "Laos", market: "Rest of Asia Pacific" },
  { code: "LV", name: "Latvia", market: "Rest of Central & Eastern Europe" },
  { code: "LB", name: "Lebanon", market: "Rest of Middle East" },
  { code: "LS", name: "Lesotho", market: "Rest of Africa" },
  { code: "LR", name: "Liberia", market: "Rest of Africa" },
  { code: "LY", name: "Libya", market: "Rest of Africa" },
  { code: "LT", name: "Lithuania", market: "Rest of Central & Eastern Europe" },
  { code: "MG", name: "Madagascar", market: "Rest of Africa" },
  { code: "MW", name: "Malawi", market: "Rest of Africa" },
  { code: "MY", name: "Malaysia", market: "Malaysia" },
  { code: "ML", name: "Mali", market: "Rest of Africa" },
  { code: "MR", name: "Mauritania", market: "Rest of Africa" },
  { code: "MX", name: "Mexico", market: "Mexico" },
  { code: "MD", name: "Moldova", market: "Rest of Central & Eastern Europe" },
  { code: "MN", name: "Mongolia", market: "Rest of Asia Pacific" },
  { code: "MA", name: "Morocco", market: "Rest of Africa" },
  { code: "MZ", name: "Mozambique", market: "Rest of Africa" },
  { code: "NA", name: "Namibia", market: "Rest of Africa" },
  { code: "NP", name: "Nepal", market: "Rest of Asia Pacific" },
  { code: "NL", name: "Netherlands", market: "Netherlands" },
  { code: "NZ", name: "New Zealand", market: "Rest of Asia Pacific" },
  { code: "NI", name: "Nicaragua", market: "Rest of Latin America" },
  { code: "NE", name: "Niger", market: "Rest of Africa" },
  { code: "NG", name: "Nigeria", market: "Nigeria" },
  { code: "MK", name: "North Macedonia", market: "Rest of Central & Eastern Europe" },
  { code: "NO", name: "Norway", market: "Rest of Western Europe" },
  { code: "OM", name: "Oman", market: "Rest of Middle East" },
  { code: "PK", name: "Pakistan", market: "Pakistan" },
  { code: "PA", name: "Panama", market: "Rest of Latin America" },
  { code: "PG", name: "Papua New Guinea", market: "Rest of Asia Pacific" },
  { code: "PY", name: "Paraguay", market: "Rest of Latin America" },
  { code: "PE", name: "Peru", market: "Peru" },
  { code: "PH", name: "Philippines", market: "Rest of Asia Pacific" },
  { code: "PL", name: "Poland", market: "Poland" },
  { code: "PT", name: "Portugal", market: "Rest of Western Europe" },
  { code: "PR", name: "Puerto Rico", market: "Rest of Latin America" },
  { code: "QA", name: "Qatar", market: "Qatar" },
  { code: "CG", name: "Republic of the Congo", market: "Rest of Africa" },
  { code: "RO", name: "Romania", market: "Romania" },
  { code: "RU", name: "Russia", market: "Russia" },
  { code: "RW", name: "Rwanda", market: "Rest of Africa" },
  { code: "SA", name: "Saudi Arabia", market: "Saudi Arabia" },
  { code: "SN", name: "Senegal", market: "Rest of Africa" },
  { code: "RS", name: "Serbia", market: "Rest of Central & Eastern Europe" },
  { code: "SL", name: "Sierra Leone", market: "Rest of Africa" },
  { code: "SG", name: "Singapore", market: "Singapore" },
  { code: "SK", name: "Slovakia", market: "Rest of Central & Eastern Europe" },
  { code: "SI", name: "Slovenia", market: "Rest of Central & Eastern Europe" },
  { code: "SO", name: "Somalia", market: "Rest of Africa" },
  { code: "ZA", name: "South Africa", market: "South Africa" },
  { code: "SS", name: "South Sudan", market: "Rest of Africa" },
  { code: "ES", name: "Spain", market: "Spain" },
  { code: "LK", name: "Sri Lanka", market: "Rest of Asia Pacific" },
  { code: "SD", name: "Sudan", market: "Rest of Africa" },
  { code: "SE", name: "Sweden", market: "Rest of Western Europe" },
  { code: "CH", name: "Switzerland", market: "Rest of Western Europe" },
  { code: "TW", name: "Taiwan", market: "Rest of Asia Pacific" },
  { code: "TJ", name: "Tajikistan", market: "Rest of Asia Pacific" },
  { code: "TZ", name: "Tanzania", market: "Rest of Africa" },
  { code: "TH", name: "Thailand", market: "Rest of Asia Pacific" },
  { code: "TG", name: "Togo", market: "Rest of Africa" },
  { code: "TN", name: "Tunisia", market: "Rest of Africa" },
  { code: "TR", name: "Turkey", market: "Turkey" },
  { code: "TM", name: "Turkmenistan", market: "Rest of Asia Pacific" },
  { code: "UG", name: "Uganda", market: "Rest of Africa" },
  { code: "UA", name: "Ukraine", market: "Rest of Central & Eastern Europe" },
  { code: "AE", name: "United Arab Emirates", market: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom", market: "United Kingdom" },
  { code: "US", name: "United States", market: "North America" },
  { code: "UY", name: "Uruguay", market: "Rest of Latin America" },
  { code: "UZ", name: "Uzbekistan", market: "Rest of Asia Pacific" },
  { code: "VE", name: "Venezuela", market: "Rest of Latin America" },
  { code: "VN", name: "Vietnam", market: "Rest of Asia Pacific" },
  { code: "YE", name: "Yemen", market: "Rest of Middle East" },
  { code: "ZM", name: "Zambia", market: "Rest of Africa" },
  { code: "ZW", name: "Zimbabwe", market: "Rest of Africa" },
];

export const DEFAULT_COUNTRY = "IN";

export const DEFAULT_CURRENCY: BillingCurrency = "INR";

const OTHER: Market =
  MARKETS.find((market) => market.name === "Other") ?? MARKETS[MARKETS.length - 1];

export const getMarket = (name: string): Market =>
  MARKETS.find((market) => market.name === name) ?? OTHER;

/** ISO country code → the market whose rates apply to it. */
export function resolveMarket(countryCode: string): Market {
  const country = COUNTRIES.find((entry) => entry.code === countryCode);
  return country ? getMarket(country.market) : OTHER;
}

export const getCountry = (countryCode: string): Country | undefined =>
  COUNTRIES.find((entry) => entry.code === countryCode);

export const getRates = (market: Market, currency: BillingCurrency): RateSet =>
  market.rates[currency];

export const getCurrency = (code: BillingCurrency) =>
  BILLING_CURRENCIES.find((entry) => entry.code === code) ?? BILLING_CURRENCIES[0];

/** Money in the billing currency, e.g. "₹1,03,840.00". */
export function formatMoney(value: number, currency: BillingCurrency): string {
  const meta = getCurrency(currency);
  return `${meta.symbol}${value.toLocaleString(meta.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** A per-message rate, which needs more decimals than a total. */
export function formatRate(value: number, currency: BillingCurrency): string {
  const meta = getCurrency(currency);
  return `${meta.symbol}${value.toFixed(meta.rateDigits)}`;
}

/** Message counts, grouped the way the reader's locale expects. */
export function formatCount(value: number, currency: BillingCurrency): string {
  return Math.round(value).toLocaleString(getCurrency(currency).locale);
}

/**
 * Cost of `messages` in one market–category pair for one month, walking the
 * volume tiers. Meta charges each band at its own rate rather than repricing
 * everything at the tier reached, and tiers reset monthly.
 *
 * Returns the total plus the effective per-message rate, so the UI can show
 * both the bill and what the tiering actually bought you.
 */
export function tieredCost(
  messages: number,
  listRate: number,
  tiers?: TierBand[],
): { cost: number; effectiveRate: number; reachedTier: boolean } {
  if (messages <= 0) return { cost: 0, effectiveRate: listRate, reachedTier: false };
  if (!tiers || tiers.length === 0) {
    return { cost: messages * listRate, effectiveRate: listRate, reachedTier: false };
  }

  let cost = 0;
  let reachedTier = false;

  for (const [index, band] of tiers.entries()) {
    // Meta writes the first band as "0 to N" but the first *message* is number 1,
    // so the opening band is clamped to 1 to avoid counting one message twice.
    const bandStart = Math.max(band.from, 1);
    const bandEnd = tiers[index + 1] ? tiers[index + 1].from - 1 : Number.POSITIVE_INFINITY;
    if (messages < bandStart) break;

    const inBand = Math.min(messages, bandEnd) - bandStart + 1;
    cost += inBand * band.rate;
    if (index > 0) reachedTier = true;
  }

  return { cost, effectiveRate: cost / messages, reachedTier };
}

export const CATEGORY_META: {
  key: MessageCategory;
  label: string;
  blurb: string;
  tiered: boolean;
}[] = [
  {
    key: "marketing",
    label: "Marketing",
    blurb: "Offers, launches, re-engagement campaigns",
    tiered: false,
  },
  {
    key: "utility",
    label: "Utility",
    blurb: "Order updates, delivery alerts, payment reminders",
    tiered: true,
  },
  {
    key: "authentication",
    label: "Authentication",
    blurb: "One-time passcodes and login verification",
    tiered: true,
  },
];
