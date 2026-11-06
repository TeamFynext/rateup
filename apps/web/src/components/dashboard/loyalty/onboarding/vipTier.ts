import type { SavedOnboardingData, TiersStepPayload } from "@/backend/loyalty/onboarding.api";

import type { VipTierFormValues } from "./schemas.ts";

/**
 * The tiers step writes the whole ladder: everyone starts in the base at zero spend, and
 * up to two tiers sit above it, lowest first. The base always earns at 1×; each upper tier
 * earns at whatever multiplier the merchant set (1× by default). A window of 0 months means
 * lifetime spend, which the API spells as `null`.
 */
export function toTiersPayload(values: VipTierFormValues): TiersStepPayload {
  return {
    tiersEnabled: values.tiersEnabled,
    tiers: [
      {
        id: values.base.id,
        name: values.base.name.trim(),
        threshold: 0,
        pointsMultiplier: 1,
        color: values.base.color.toLowerCase(),
        benefitsDescription: null,
      },
      ...[...values.upper]
        .sort((a, b) => a.threshold - b.threshold)
        .map((tier) => ({
          id: tier.id,
          name: tier.name.trim(),
          threshold: tier.threshold,
          pointsMultiplier: tier.pointsMultiplier,
          color: tier.color.toLowerCase(),
          benefitsDescription: tier.benefitsDescription?.trim() || null,
        })),
    ],
    qualificationWindowMonths:
      values.qualificationWindowMonths > 0 ? values.qualificationWindowMonths : null,
    // The whole desired ladder is in the payload, so anything else stored was removed.
    deleteMissing: true,
  };
}

/** The saved tier the VIP-only rewards are gated on: the highest one above zero spend. */
export function findVipTier<T extends SavedOnboardingData["tiers"][number]>(
  tiers: readonly T[],
): T | undefined {
  return [...tiers]
    .filter((tier) => Number(tier.threshold) > 0)
    .sort((a, b) => Number(b.threshold) - Number(a.threshold))[0];
}

/**
 * Saved tiers the payload would remove, with their member counts — so the step can ask
 * before the API refuses. Matching mirrors the API: by id first, then by name.
 */
export function removedTiers<T extends SavedOnboardingData["tiers"][number]>(
  saved: readonly T[],
  values: VipTierFormValues,
): T[] {
  const rows = [values.base, ...values.upper];
  const keptIds = new Set(rows.map((row) => row.id).filter(Boolean));
  const keptNames = new Set(rows.map((row) => row.name.trim().toLowerCase()));
  return saved.filter(
    (tier) => !keptIds.has(tier.id) && !keptNames.has(tier.name.trim().toLowerCase()),
  );
}
