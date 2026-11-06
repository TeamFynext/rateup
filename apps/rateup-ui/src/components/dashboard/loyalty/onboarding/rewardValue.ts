import { rewardWorth } from "../giveback/calculateGiveback.ts";
import { roundNice } from "../giveback/suggestPointsCost.ts";

/**
 * The reward-shape vocabulary, in one place.
 *
 * `LoyaltyReward.rewardValue` is an untyped JSON column and two dialects are live:
 *
 *   A  keyed on `type`        — the presets, this wizard, the API's `reward.schema.ts`
 *                               discount_fixed / discount_percentage / free_item
 *   B  keyed on `rewardType`  — the standalone editor at /dashboard/loyalty/rewards
 *                               fixed-discount / percentage-discount / free-item / free-service
 *
 * `getOnboardingState` returns every reward on the programme, so dialect-B rows reach this
 * form. The rule here: **readers understand both, writers only ever emit dialect A.** A
 * dialect-B row therefore displays its real numbers, and migrates to dialect A the moment
 * the merchant edits it — which is honest, because they are editing it. A row nobody
 * touches is still written back verbatim.
 */

export type RewardValueType = "free_item" | "discount_percentage" | "discount_fixed";

export interface FreeItemValue {
  type: "free_item";
  item_name: string;
  item_value?: number;
  quantity: number;
}

export interface DiscountPercentageValue {
  type: "discount_percentage";
  percentage?: number;
  max_discount_amount: number | null;
}

export interface DiscountFixedValue {
  type: "discount_fixed";
  amount?: number;
}

export type RewardValue = FreeItemValue | DiscountPercentageValue | DiscountFixedValue;

export const REWARD_VALUE_TYPES: readonly RewardValueType[] = [
  "free_item",
  "discount_percentage",
  "discount_fixed",
];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** A non-negative finite number, or undefined. Strings count — JSON columns hold them. */
function num(record: Record<string, unknown> | null, key: string): number | undefined {
  if (!record) return undefined;
  const raw = record[key];
  if (raw === null || raw === undefined || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Maps BOTH dialects onto the three shapes the wizard can edit. null = leave it alone. */
export function readRewardValueType(value: unknown): RewardValueType | null {
  const v = asRecord(value);
  if (!v) return null;

  if (v.type === "free_item") return "free_item";
  if (v.type === "discount_percentage") return "discount_percentage";
  if (v.type === "discount_fixed") return "discount_fixed";

  if (v.rewardType === "free-item" || v.rewardType === "free-service") return "free_item";
  if (v.rewardType === "percentage-discount") return "discount_percentage";
  if (v.rewardType === "fixed-discount") return "discount_fixed";

  if (v.discountType === "percentage") return "discount_percentage";
  if (v.discountType === "fixed") return "discount_fixed";

  return null;
}

export function readPercentage(value: unknown): number | undefined {
  const v = asRecord(value);
  return num(v, "percentage") ?? num(v, "discountPercentage") ?? num(v, "discountValue");
}

export function readCap(value: unknown): number | null {
  return num(asRecord(value), "max_discount_amount") ?? null;
}

export function readAmount(value: unknown): number | undefined {
  const v = asRecord(value);
  return num(v, "amount") ?? num(v, "cashbackAmount") ?? num(v, "discountValue");
}

export function readItemName(value: unknown): string {
  const v = asRecord(value);
  const name = v?.item_name ?? v?.itemName;
  return typeof name === "string" ? name : "";
}

export function readItemValue(value: unknown): number | undefined {
  const v = asRecord(value);
  return num(v, "item_value") ?? num(v, "estimatedValue");
}

/** Hidden in the UI but load-bearing: `rewardWorth` multiplies `item_value` by it. */
export function readQuantity(value: unknown): number {
  const quantity = num(asRecord(value), "quantity");
  return quantity === undefined || quantity <= 0 ? 1 : quantity;
}

/** Narrows a Select's `string | null` back to a type, falling back to what is there now. */
export function asRewardValueType(next: string | null, current: RewardValueType): RewardValueType {
  return REWARD_VALUE_TYPES.find((type) => type === next) ?? current;
}

/** A well-formed skeleton, so the per-type fields render the moment a blank row is added. */
export function blankRewardValue(type: RewardValueType): RewardValue {
  if (type === "free_item") return { type: "free_item", item_name: "", quantity: 1 };
  if (type === "discount_fixed") return { type: "discount_fixed" };
  return { type: "discount_percentage", max_discount_amount: null };
}

/**
 * Switching a reward's type: **preserve what it is worth, rebuild the keys**.
 *
 * Merging keys would leave an `item_name` sitting on a `discount_fixed` value — garbage in
 * the JSON column, and stripped by the API's union if it were ever parsed strictly. Hard
 * resetting would throw away the one number the merchant cared about. Carrying the worth
 * across means the giveback panel does not lurch when the type changes.
 *
 * Object literals, not spreads, so key order stays deterministic — `RewardsGivebackPanel`
 * memoises on a `JSON.stringify` of this value.
 */
export function convertRewardValue(
  value: unknown,
  next: RewardValueType,
  averageOrderValue: number | null,
): RewardValue {
  const aov = averageOrderValue !== null && averageOrderValue > 0 ? averageOrderValue : null;
  const worth = rewardWorth(value, aov).worth;

  if (next === "discount_fixed") {
    return { type: "discount_fixed", amount: worth === null ? undefined : roundNice(worth) };
  }

  if (next === "free_item") {
    return {
      type: "free_item",
      item_name: readItemName(value),
      item_value: worth === null ? undefined : roundNice(worth),
      quantity: readQuantity(value),
    };
  }

  // A worth only becomes a percentage against an order to apply it to. Without an AOV,
  // keep whatever percentage was already there rather than inventing one.
  const percentage =
    worth !== null && aov !== null
      ? Math.min(100, Math.max(0, Math.round((worth / aov) * 100)))
      : readPercentage(value);

  return { type: "discount_percentage", percentage, max_discount_amount: readCap(value) };
}

/**
 * Widens a built value into the open record the form and the API payload hold.
 *
 * The one cast in this module, and provable: every `RewardValue` member is an object literal
 * with string keys, which is exactly `Record<string, unknown>` — TypeScript just will not
 * infer an index signature for an interface. Doing it here once keeps it out of the call
 * sites, where it would be far easier to misread as papering over a real mismatch.
 */
export function toRewardValueRecord(value: RewardValue): Record<string, unknown> {
  return { ...value } as Record<string, unknown>;
}
