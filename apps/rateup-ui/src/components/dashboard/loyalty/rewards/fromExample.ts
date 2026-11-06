import type { RewardExamplePick } from "../giveback/RewardExamplePicker.tsx";
import { FALLBACK_POINTS_COST } from "../giveback/suggestPointsCost.ts";
import {
  readAmount,
  readItemName,
  readItemValue,
  readPercentage,
} from "../onboarding/rewardValue.ts";
import type { GiftFormValues, PointRewardFormValues } from "./schemas.ts";

/**
 * Turns a picked example into this editor's form values.
 *
 * The example catalog speaks the wizard's dialect (`{ type: "free_item", item_value }`); this
 * page speaks its own (`{ rewardType: "free-item", estimatedValue }`) and keeps each amount in
 * a separate form field. Converting here — rather than teaching the picker two vocabularies —
 * keeps one catalog, one pricing function, and one set of examples behind both surfaces.
 */
export function pointRewardFromExample(
  pick: RewardExamplePick,
  defaults: PointRewardFormValues,
): PointRewardFormValues {
  const base: PointRewardFormValues = {
    ...defaults,
    rewardType: rewardTypeFor(pick.kind),
    // A blank tile still carries its kind, so the right amount field is on screen.
    cashbackAmount: 0,
    discountPercentage: 0,
    estimatedValue: 0,
  };

  if (!pick.built) return base;

  const { built } = pick;
  const filled: PointRewardFormValues = {
    ...base,
    name: built.label,
    description: built.example.description,
    pointsCost: built.pointsCost ?? FALLBACK_POINTS_COST,
  };

  if (pick.kind === "free_item") {
    return { ...filled, estimatedValue: readItemValue(built.rewardValue) ?? 0 };
  }
  if (pick.kind === "discount_fixed") {
    return { ...filled, cashbackAmount: readAmount(built.rewardValue) ?? 0 };
  }
  return { ...filled, discountPercentage: readPercentage(built.rewardValue) ?? 0 };
}

/**
 * Free gifts are assigned rather than bought with points, so the points cost and the discount
 * shapes drop away — only the name, the description and what it is worth carry over.
 */
export function giftFromExample(pick: RewardExamplePick, defaults: GiftFormValues): GiftFormValues {
  if (!pick.built) return defaults;

  const { built } = pick;
  return {
    ...defaults,
    // The item's own name reads better on a gift than the example's headline.
    name: readItemName(built.rewardValue) || built.label,
    description: built.example.description,
    estimatedValue: readItemValue(built.rewardValue) ?? 0,
  };
}

function rewardTypeFor(kind: RewardExamplePick["kind"]): PointRewardFormValues["rewardType"] {
  if (kind === "free_item") return "free-item";
  if (kind === "discount_fixed") return "fixed-discount";
  return "percentage-discount";
}
