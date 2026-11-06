/**
 * Rewards on the wizard fall into bands: for everyone, or from a given tier up. The band is
 * read off `availableForTiers` — empty means everyone; a list naming tiers (by id, or by
 * name for rows the older editor wrote) puts the reward in the band of the lowest tier it
 * names, since "Silver and Gold" is "Silver and above".
 */

/** "base", or the id of the tier the band starts at. */
export type RewardGroup = string;
export const BASE_GROUP: RewardGroup = "base";

export interface RewardGroupRow {
  availableForTiers?: string[];
}

export interface TierRef {
  id: string;
  name: string;
  /** Spend that unlocks it; the bands are ordered by it. */
  threshold: number;
  color?: string;
}

/** Lowest first, so "this tier and above" is a suffix of the list. */
export function orderTiers<T extends TierRef>(tiers: readonly T[]): T[] {
  return [...tiers].sort((a, b) => a.threshold - b.threshold);
}

export function rewardGroupOf(row: RewardGroupRow, tiers: readonly TierRef[]): RewardGroup {
  const gated = row.availableForTiers ?? [];
  if (gated.length === 0 || tiers.length === 0) return BASE_GROUP;
  const names = new Set(gated.map((tier) => tier.trim().toLowerCase()));
  const lowest = orderTiers(tiers).find(
    (tier) => gated.includes(tier.id) || names.has(tier.name.trim().toLowerCase()),
  );
  return lowest ? lowest.id : BASE_GROUP;
}

/** Indices into the rewards field array, split by band, in their original order. */
export function groupRewardIndices(
  rows: readonly RewardGroupRow[],
  tiers: readonly TierRef[],
): Record<RewardGroup, number[]> {
  const groups: Record<RewardGroup, number[]> = { [BASE_GROUP]: [] };
  for (const tier of tiers) groups[tier.id] = [];
  rows.forEach((row, index) => groups[rewardGroupOf(row, tiers)].push(index));
  return groups;
}

/**
 * What `availableForTiers` should hold for a reward added into a band: that tier and every
 * tier above it, so a Silver perk is also a Gold perk. Everyone's band is unrestricted.
 */
export function tiersForGroup(group: RewardGroup, tiers: readonly TierRef[]): string[] {
  if (group === BASE_GROUP) return [];
  const ordered = orderTiers(tiers);
  const start = ordered.findIndex((tier) => tier.id === group);
  return start === -1 ? [] : ordered.slice(start).map((tier) => tier.id);
}
