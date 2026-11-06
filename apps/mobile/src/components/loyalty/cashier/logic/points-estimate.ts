import type { LoyaltyEarningRule } from "@/api/loyalty/loyalty.type";

/**
 * What a purchase is about to earn, so staff can read it out before touching the button.
 *
 * Mirrors the server's `EarningRulesEngine` — first active rule by priority whose
 * validity window, days, time range and spend bounds match, then the tier multiplier —
 * minus the two things a browser cannot know (per-customer usage caps and the JSON
 * `conditions`). It is labelled an estimate; the receipt shows the server's real figure.
 */

export interface EarnEstimate {
  points: number;
  basePoints: number;
  rule: LoyaltyEarningRule;
  tierMultiplier: number;
}

export interface EarnEstimateInput {
  amount: number;
  rules: LoyaltyEarningRule[];
  tier: { pointsMultiplier: number | string } | null;
  tiersEnabled: boolean;
  now?: Date;
}

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function withinDays(rule: LoyaltyEarningRule, now: Date): boolean {
  const days = rule.allowedDays ?? [];
  if (days.length === 0) return true;
  const code = DAY_CODES[now.getDay()];
  return days.some((d) => d.toLowerCase().startsWith(code));
}

function withinTime(rule: LoyaltyEarningRule, now: Date): boolean {
  const ranges = rule.allowedTimeRanges ?? [];
  if (ranges.length === 0) return true;
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return ranges.some((range) => range.start <= hhmm && hhmm <= range.end);
}

function withinValidity(rule: LoyaltyEarningRule, now: Date): boolean {
  if (rule.validFrom && new Date(rule.validFrom) > now) return false;
  if (rule.validUntil && new Date(rule.validUntil) < now) return false;
  return true;
}

function withinSpend(rule: LoyaltyEarningRule, amount: number): boolean {
  if (rule.minPurchaseAmount != null && amount < Number(rule.minPurchaseAmount)) return false;
  if (rule.maxPurchaseAmount != null && amount > Number(rule.maxPurchaseAmount)) return false;
  return true;
}

export function pickRule(
  rules: LoyaltyEarningRule[],
  amount: number,
  now: Date,
  tierId?: string | null,
): LoyaltyEarningRule | null {
  const active = rules.filter((r) => (r.status ?? "active") === "active");
  const sorted = [...active].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  const match = sorted.find(
    (rule) =>
      withinValidity(rule, now) &&
      withinDays(rule, now) &&
      withinTime(rule, now) &&
      withinSpend(rule, amount) &&
      ((rule.applicableToTiers ?? []).length === 0 ||
        (tierId != null && (rule.applicableToTiers ?? []).includes(tierId))),
  );
  return match ?? active.find((r) => r.isDefault) ?? null;
}

export function estimateEarn(
  input: EarnEstimateInput & { tierId?: string | null },
): EarnEstimate | null {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const now = input.now ?? new Date();
  const rule = pickRule(input.rules, amount, now, input.tierId);
  if (!rule) return null;

  const tierMultiplier =
    input.tiersEnabled && input.tier ? Number(input.tier.pointsMultiplier) || 1 : 1;
  const basePoints = amount * Number(rule.pointsPerUnit ?? 0) * Number(rule.multiplier ?? 1);
  const points = Math.floor((basePoints + Number(rule.bonusPoints ?? 0)) * tierMultiplier);

  return { points, basePoints: Math.floor(basePoints), rule, tierMultiplier };
}
