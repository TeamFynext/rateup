import { z } from "zod";

import type { SavedOnboardingData } from "@/backend/loyalty/onboarding.api";
import type { LoyaltyProgram } from "@/backend/loyalty/program.api";

import { earnPairFromRate } from "../earning-rules/parts/earnRate.ts";
import { formatMoney, singularPoints } from "../giveback/format.ts";
import { orderTiers, rewardGroupOf, type TierRef } from "../onboarding/rewardGroups.ts";
import {
  readAmount,
  readItemName,
  readPercentage,
  readRewardValueType,
} from "../onboarding/rewardValue.ts";

/**
 * The print materials a merchant designs on the Materials page: the QR card's copy and
 * the rewards brochure. Stored as one JSON document on `LoyaltyProgram.materials`; the API
 * only keeps it, so the shape — and its tolerance for older documents — is decided here.
 */

export interface QrCardDesign {
  headline: string;
  subline: string;
  showHero: boolean;
  footnote: string;
}

export interface BrochureRewardLine {
  rewardId: string;
  include: boolean;
  blurb: string;
}

export interface BrochureDesign {
  title: string;
  tagline: string;
  earnLine: string;
  rewards: BrochureRewardLine[];
  terms: string;
  showPoweredBy: boolean;
}

/** A type alias, not an interface, so it satisfies the API client's `Record<string, unknown>`. */
export type LoyaltyMaterials = {
  version: 1;
  qr: QrCardDesign;
  brochure: BrochureDesign;
};

/* ── reading what is stored ─────────────────────────────────────────────────── */

const qrSchema = z
  .object({
    headline: z.string(),
    subline: z.string(),
    showHero: z.boolean(),
    footnote: z.string(),
  })
  .partial();

const lineSchema = z.object({
  rewardId: z.string(),
  include: z.boolean(),
  blurb: z.string(),
});

const brochureSchema = z
  .object({
    title: z.string(),
    tagline: z.string(),
    earnLine: z.string(),
    rewards: z.array(lineSchema),
    terms: z.string(),
    showPoweredBy: z.boolean(),
  })
  .partial();

const storedSchema = z.object({
  version: z.literal(1),
  qr: qrSchema.optional(),
  brochure: brochureSchema.optional(),
});

/** A stored document, every field optional — `buildMaterialsDefaults` fills the gaps. */
export type StoredMaterials = z.infer<typeof storedSchema>;

/**
 * Reads the stored document leniently: a field this version does not know is ignored, a
 * field it expects but cannot find is left for the defaults. Anything else (a different
 * version, junk) is treated as nothing stored.
 */
export function parseMaterials(raw: unknown): StoredMaterials | null {
  const result = storedSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/* ── defaults from the programme ────────────────────────────────────────────── */

export interface MaterialsContext {
  program: Pick<LoyaltyProgram, "name" | "currencyName" | "currencyCode" | "currencySymbol">;
  rules: SavedOnboardingData["rules"];
  rewards: SavedOnboardingData["rewards"];
  /** What the QR pre-types into the WhatsApp chat. */
  joinKeyword: string;
}

/** Only rewards that cost points belong on a brochure; coupons and assigned gifts do not. */
export function brochureRewards(
  rewards: SavedOnboardingData["rewards"],
): SavedOnboardingData["rewards"] {
  return [...rewards]
    .filter(
      (reward) =>
        reward.rewardType.toLowerCase() === "point" &&
        (reward.status ?? "ACTIVE").toUpperCase() !== "INACTIVE",
    )
    .sort((a, b) => a.pointsCost - b.pointsCost);
}

/**
 * "₹150 spent = 1 point" — the default rule read the way merchants say it. Empty when the
 * programme has no rule yet, so the brochure line is simply blank rather than wrong.
 */
export function defaultEarnLine(context: MaterialsContext): string {
  const rule = context.rules.find((r) => r.isDefault) ?? context.rules[0];
  if (!rule) return "";
  const rate = Number(rule.pointsPerUnit) * (Number(rule.multiplier) || 1);
  const pair = earnPairFromRate(rate);
  if (pair.points <= 0) return "";
  const { currencyCode, currencySymbol, currencyName } = context.program;
  const unit = pair.points === 1 ? singularPoints(currencyName) : currencyName;
  return `${formatMoney(pair.spend, currencyCode, currencySymbol)} spent = ${pair.points} ${unit}`;
}

/** One line a customer would want to read, written from what the reward is. */
export function autoBlurb(
  reward: SavedOnboardingData["rewards"][number],
  program: MaterialsContext["program"],
): string {
  const value = reward.rewardValue;
  switch (readRewardValueType(value)) {
    case "free_item": {
      const item = readItemName(value) || reward.name;
      return `Get ${item} on us`;
    }
    case "discount_fixed": {
      const amount = readAmount(value);
      return amount === undefined
        ? reward.name
        : `${formatMoney(amount, program.currencyCode, program.currencySymbol)} off your bill`;
    }
    case "discount_percentage": {
      const pct = readPercentage(value);
      return pct === undefined ? reward.name : `${pct}% off your bill`;
    }
    default:
      return reward.name;
  }
}

/** "PTS" for points; a merchant's own unit ("Beans") goes on the card as it is, in caps. */
export function pointsLabelOf(pointsName: string): string {
  return pointsName.trim().toLowerCase() === "points" ? "PTS" : pointsName.trim().toUpperCase();
}

/**
 * What the editors open with: the stored design laid over what the programme suggests.
 * The brochure's reward list is reconciled against the rewards that exist now — a new
 * reward is appended with an auto blurb, a deleted one disappears, and every blurb the
 * merchant wrote is kept.
 */
export function buildMaterialsDefaults(
  context: MaterialsContext,
  stored: StoredMaterials | null,
): LoyaltyMaterials {
  const { program, joinKeyword } = context;
  const storedLines = new Map(
    (stored?.brochure?.rewards ?? []).map((line) => [line.rewardId, line] as const),
  );

  const rewards: BrochureRewardLine[] = brochureRewards(context.rewards).map((reward) => {
    const kept = storedLines.get(reward.id);
    return {
      rewardId: reward.id,
      include: kept?.include ?? true,
      blurb: kept?.blurb.trim() ? kept.blurb : autoBlurb(reward, program),
    };
  });

  return {
    version: 1,
    qr: {
      headline: stored?.qr?.headline ?? `Scan to join ${program.name}`,
      subline: stored?.qr?.subline ?? `Earn ${program.currencyName} on every visit`,
      showHero: stored?.qr?.showHero ?? true,
      footnote: stored?.qr?.footnote ?? `Just send “${joinKeyword}”`,
    },
    brochure: {
      title: stored?.brochure?.title ?? program.name,
      tagline: stored?.brochure?.tagline ?? "Get rewarded on every purchase",
      earnLine: stored?.brochure?.earnLine ?? defaultEarnLine(context),
      rewards,
      terms: stored?.brochure?.terms ?? "Minimum purchase may apply. Offers cannot be combined.",
      showPoweredBy: stored?.brochure?.showPoweredBy ?? true,
    },
  };
}

/** A tier as the brochure names it beside a reward that only that tier (and up) can redeem. */
export interface BrochureTier {
  id: string;
  name: string;
  color: string;
  /** Spend that unlocks it — printed as the condition under the tier's rewards. */
  threshold: number;
}

export interface BrochureRow {
  points: number;
  blurb: string;
  /** Null for a reward every member can redeem. */
  tier: BrochureTier | null;
}

/** The saved ladder as the brochure needs it: tiers above the base, lowest first. */
export function brochureTiers(tiers: SavedOnboardingData["tiers"]): Array<TierRef & BrochureTier> {
  return orderTiers(
    tiers
      .filter((tier) => Number(tier.threshold) > 0)
      .map((tier) => ({
        id: tier.id,
        name: tier.name,
        color: tier.color,
        threshold: Number(tier.threshold),
      })),
  );
}

/**
 * The rows the brochure prints: included lines with the reward's cost beside the blurb,
 * cheapest first, and the tier a gated reward starts at so the card can mark it.
 */
export function brochureRows(
  design: Pick<BrochureDesign, "rewards">,
  rewards: SavedOnboardingData["rewards"],
  tiers: SavedOnboardingData["tiers"] = [],
): BrochureRow[] {
  const byId = new Map(rewards.map((reward) => [reward.id, reward] as const));
  const ladder = brochureTiers(tiers);
  const tierById = new Map(ladder.map((tier) => [tier.id, tier] as const));
  return design.rewards
    .filter((line) => line.include)
    .flatMap((line) => {
      const reward = byId.get(line.rewardId);
      if (!reward) return [];
      const group = rewardGroupOf(reward, ladder);
      const tier = tierById.get(group);
      return [
        {
          points: reward.pointsCost,
          blurb: line.blurb || reward.name,
          tier: tier
            ? { id: tier.id, name: tier.name, color: tier.color, threshold: tier.threshold }
            : null,
        },
      ];
    })
    .sort((a, b) => a.points - b.points);
}
