import type { LoyaltyPresetKey } from "@/backend/loyalty/onboarding.api";

import { formatMoney } from "../giveback/format.ts";
import { roundNice, suggestPointsCost } from "../giveback/suggestPointsCost.ts";
import type { RewardValue, RewardValueType } from "./rewardValue.ts";

/**
 * Starter rewards offered in the "Add a reward" dialog.
 *
 * Client-side rather than in the API's `presets.ts` on purpose: these are priced against the
 * merchant's *live* order value and earn rate, which may have changed a step ago and not
 * been saved yet. The preset's own `rewards[]` still seed the initial list, so the two never
 * compete — this catalog only answers "add another".
 *
 * Examples carry an `aovMultiple`, never a hardcoded amount: "a free coffee" is a different
 * number of rupees to a cafe and a hotel, and a fixed 150 would be nonsense in a currency
 * where a typical order is 40 000.
 */

/** Identity marker for strings that live in data and are rendered through `t()` elsewhere. */
const tx = (source: string): string => source;

export interface RewardExample {
  /** Stable — used as the React key. */
  readonly id: string;
  readonly kind: RewardValueType;
  /** English source string, rendered through `t()` at the call site. */
  readonly name: string;
  readonly description: string;
  /** Worth as a fraction of a typical order. `free_item` and `discount_fixed`. */
  readonly aovMultiple?: number;
  /** `discount_percentage` only. */
  readonly percentage?: number;
  /** `discount_percentage` only — a cap, as a fraction of a typical order. */
  readonly capAovMultiple?: number;
  /** `free_item` only — what goes into `item_name`. */
  readonly itemName?: string;
}

/* ── universal: a percentage off means the same in every trade ─────────────── */

const PERCENTAGE_EXAMPLES: readonly RewardExample[] = [
  {
    id: "pct-5",
    kind: "discount_percentage",
    name: tx("5% off"),
    description: tx("A small thank-you that is easy to reach."),
    percentage: 5,
  },
  {
    id: "pct-10",
    kind: "discount_percentage",
    name: tx("10% off"),
    description: tx("The one most customers recognise."),
    percentage: 10,
  },
  {
    id: "pct-20",
    kind: "discount_percentage",
    name: tx("20% off"),
    description: tx("A bigger prize that takes longer to earn."),
    percentage: 20,
  },
  {
    id: "pct-20-capped",
    kind: "discount_percentage",
    name: tx("20% off, up to a limit"),
    description: tx("Protects you when someone spends far more than usual."),
    percentage: 20,
    capAovMultiple: 0.5,
  },
];

const CASH_OFF_EXAMPLES: readonly RewardExample[] = [
  {
    id: "cash-small",
    kind: "discount_fixed",
    name: tx("A little off"),
    description: tx("A flat amount off the next visit."),
    aovMultiple: 0.2,
  },
  {
    id: "cash-mid",
    kind: "discount_fixed",
    name: tx("Half a visit off"),
    description: tx("Roughly half a typical order."),
    aovMultiple: 0.4,
  },
  {
    id: "cash-large",
    kind: "discount_fixed",
    name: tx("A visit on you"),
    description: tx("About what a customer usually spends in one go."),
    aovMultiple: 1,
  },
];

/* ── per business: "a regular hot drink" means nothing to a gym ────────────── */

const FREE_ITEM_EXAMPLES: Readonly<Record<LoyaltyPresetKey, readonly RewardExample[]>> = {
  cafe: [
    {
      id: "cafe-coffee",
      kind: "free_item",
      name: tx("Free coffee"),
      description: tx("Any regular hot drink, on the house."),
      itemName: tx("Regular hot drink"),
      aovMultiple: 0.6,
    },
    {
      id: "cafe-pastry",
      kind: "free_item",
      name: tx("Free pastry"),
      description: tx("Pick anything from the counter."),
      itemName: tx("Pastry"),
      aovMultiple: 0.5,
    },
    {
      id: "cafe-upgrade",
      kind: "free_item",
      name: tx("Free size upgrade"),
      description: tx("Cheap for you, and it feels like a win."),
      itemName: tx("Size upgrade"),
      aovMultiple: 0.2,
    },
  ],
  retail: [
    {
      id: "retail-gift",
      kind: "free_item",
      name: tx("Free gift with your order"),
      description: tx("A small item added to the next purchase."),
      itemName: tx("Gift item"),
      aovMultiple: 0.25,
    },
    {
      id: "retail-delivery",
      kind: "free_item",
      name: tx("Free delivery"),
      description: tx("Costs you the courier, not your margin."),
      itemName: tx("Delivery"),
      aovMultiple: 0.15,
    },
    {
      id: "retail-accessory",
      kind: "free_item",
      name: tx("Free accessory"),
      description: tx("A bigger prize for a loyal customer."),
      itemName: tx("Accessory"),
      aovMultiple: 0.5,
    },
  ],
  salon: [
    {
      id: "salon-addon",
      kind: "free_item",
      name: tx("Complimentary add-on"),
      description: tx("A free add-on with the next appointment."),
      itemName: tx("Add-on treatment"),
      aovMultiple: 0.55,
    },
    {
      id: "salon-massage",
      kind: "free_item",
      name: tx("Free head massage"),
      description: tx("Costs you time rather than stock."),
      itemName: tx("Head massage"),
      aovMultiple: 0.25,
    },
    {
      id: "salon-signature",
      kind: "free_item",
      name: tx("Free signature treatment"),
      description: tx("The reward regulars work towards."),
      itemName: tx("Signature treatment"),
      aovMultiple: 1.6,
    },
  ],
  gym: [
    {
      id: "gym-guest",
      kind: "free_item",
      name: tx("Guest day pass"),
      description: tx("Brings a friend in — and they may join."),
      itemName: tx("Guest day pass"),
      aovMultiple: 0.25,
    },
    {
      id: "gym-pt",
      kind: "free_item",
      name: tx("Free personal training session"),
      description: tx("One session with a trainer."),
      itemName: tx("Personal training session"),
      aovMultiple: 0.6,
    },
    {
      id: "gym-shake",
      kind: "free_item",
      name: tx("Free protein shake"),
      description: tx("Small, frequent, and easy to hand over."),
      itemName: tx("Protein shake"),
      aovMultiple: 0.1,
    },
  ],
  generic: [
    {
      id: "generic-item",
      kind: "free_item",
      name: tx("Free item of your choice"),
      description: tx("Let the customer pick something."),
      itemName: tx("Free item"),
      aovMultiple: 0.5,
    },
    {
      id: "generic-small",
      kind: "free_item",
      name: tx("A small freebie"),
      description: tx("Low cost to you, quick to earn."),
      itemName: tx("Small item"),
      aovMultiple: 0.2,
    },
    {
      id: "generic-upgrade",
      kind: "free_item",
      name: tx("Free upgrade"),
      description: tx("Costs you little and feels generous."),
      itemName: tx("Upgrade"),
      aovMultiple: 0.3,
    },
  ],
};

/** Section order: cheapest-to-your-margin first, because that is the advice. */
export const REWARD_EXAMPLE_KINDS: readonly RewardValueType[] = [
  "free_item",
  "discount_percentage",
  "discount_fixed",
];

/** Narrows a stored preset key, falling back to the business-agnostic pack. */
export function asPresetKey(value: string | null | undefined): LoyaltyPresetKey {
  return value !== null && value !== undefined && value in FREE_ITEM_EXAMPLES
    ? (value as LoyaltyPresetKey)
    : "generic";
}

export function rewardExamplesFor(
  presetKey: LoyaltyPresetKey,
): Readonly<Record<RewardValueType, readonly RewardExample[]>> {
  return {
    free_item: FREE_ITEM_EXAMPLES[presetKey] ?? FREE_ITEM_EXAMPLES.generic,
    discount_percentage: PERCENTAGE_EXAMPLES,
    discount_fixed: CASH_OFF_EXAMPLES,
  };
}

/* ── building an example into something the field array can hold ───────────── */

export interface BuiltExample {
  readonly example: RewardExample;
  /** Dialect A, ready to drop straight into the form. */
  readonly rewardValue: RewardValue;
  /** null when it cannot be priced — no order value, or nothing earned per unit spent. */
  readonly pointsCost: number | null;
  /** What the card shows: "Free coffee" / "20% off" / "₹100 off". */
  readonly label: string;
}

export interface BuildExampleContext {
  readonly averageOrderValue: number | null;
  readonly earnRate: { pointsPerUnit: number; multiplier: number };
  readonly currencyCode: string;
  readonly currencySymbol: string;
}

/**
 * Turns an example into a concrete reward for this merchant. Returns null when there is no
 * order value to scale against — the dialog then offers only its "start blank" tiles rather
 * than showing prices it cannot stand behind.
 */
export function buildExample(
  example: RewardExample,
  context: BuildExampleContext,
): BuiltExample | null {
  const aov =
    context.averageOrderValue !== null && context.averageOrderValue > 0
      ? context.averageOrderValue
      : null;
  if (aov === null) return null;

  const money = (amount: number) =>
    formatMoney(amount, context.currencyCode, context.currencySymbol);

  let rewardValue: RewardValue;
  let label: string;

  if (example.kind === "free_item") {
    const worth = roundNice(aov * (example.aovMultiple ?? 0.5));
    rewardValue = {
      type: "free_item",
      item_name: example.itemName ?? example.name,
      item_value: worth,
      quantity: 1,
    };
    label = example.name;
  } else if (example.kind === "discount_fixed") {
    const amount = roundNice(aov * (example.aovMultiple ?? 0.2));
    rewardValue = { type: "discount_fixed", amount };
    // The name is the money, so it stays right in any currency.
    label = `${money(amount)} off`;
  } else {
    const percentage = example.percentage ?? 10;
    rewardValue = {
      type: "discount_percentage",
      percentage,
      max_discount_amount:
        example.capAovMultiple === undefined ? null : roundNice(aov * example.capAovMultiple),
    };
    label =
      example.capAovMultiple === undefined
        ? `${percentage}% off`
        : `${percentage}% off, up to ${money(roundNice(aov * example.capAovMultiple))}`;
  }

  return {
    example,
    rewardValue,
    pointsCost: suggestPointsCost({
      rewardValue,
      earnRate: context.earnRate,
      averageOrderValue: aov,
    }),
    label,
  };
}
