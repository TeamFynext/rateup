import type { LoyaltyPresetKey } from "@/backend/loyalty/onboarding.api";

import { FALLBACK_POINTS_COST } from "../giveback/suggestPointsCost.ts";
import {
  buildExample,
  rewardExamplesFor,
  type BuildExampleContext,
  type RewardExample,
} from "./rewardExamples.ts";
import { toRewardValueRecord } from "./rewardValue.ts";
import type { RewardFormRow } from "./schemas.ts";

/**
 * What a fresh programme's Rewards step opens with: two rewards for everyone and, when
 * there is a VIP tier, two VIP-only ones — a free item and a cash-off in each group, the
 * VIP pair worth more. Built from the same catalog as "Add a reward", so they are priced
 * to the merchant's own order value and earn rate rather than to a preset's guess.
 */
export function buildStarterRewards(
  presetKey: LoyaltyPresetKey,
  context: BuildExampleContext,
  vipTierId: string | undefined,
): RewardFormRow[] {
  const examples = rewardExamplesFor(presetKey);
  const freeItems = [...examples.free_item].sort(
    (a, b) => (a.aovMultiple ?? 0) - (b.aovMultiple ?? 0),
  );
  const cashOffs = [...examples.discount_fixed].sort(
    (a, b) => (a.aovMultiple ?? 0) - (b.aovMultiple ?? 0),
  );

  // Everyone: the modest end of each list. VIP: the generous end.
  const baseFree = freeItems[0];
  const baseCash = cashOffs[0];
  const vipFree = freeItems[freeItems.length - 1];
  const vipCash = cashOffs[Math.min(1, cashOffs.length - 1)];

  const rows: RewardFormRow[] = [];
  const push = (example: RewardExample | undefined, tiers: string[], vipLabel: boolean) => {
    if (!example) return;
    const row = toRow(example, context, tiers);
    if (!row) return;
    // Names are unique per programme; a VIP twin of the same example gets its own name.
    if (vipLabel && rows.some((existing) => existing.name === row.name)) {
      row.name = `VIP ${row.name.charAt(0).toLowerCase()}${row.name.slice(1)}`;
    }
    rows.push(row);
  };

  push(baseFree, [], false);
  push(baseCash, [], false);
  if (vipTierId) {
    push(vipFree, [vipTierId], true);
    push(vipCash, [vipTierId], true);
  }
  return rows;
}

function toRow(
  example: RewardExample,
  context: BuildExampleContext,
  availableForTiers: string[],
): RewardFormRow | null {
  const built = buildExample(example, context);
  if (!built) return null;
  return {
    name: built.label,
    description: built.example.description,
    pointsCost: built.pointsCost ?? FALLBACK_POINTS_COST,
    rewardType: "point",
    rewardValue: toRewardValueRecord(built.rewardValue),
    stockQuantity: null,
    availableForTiers,
  };
}
