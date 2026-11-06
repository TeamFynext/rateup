import type { LoyaltyEarningRule, Prisma } from "../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import type {
  InstagramMentionRuleKind,
  LoyaltyEarningRuleConditions,
  LoyaltyEarningRuleTrigger,
} from "../../../types/loyalty.js";
import type { InstagramMentionRuleInput } from "./earningRule.schema.js";

/**
 * Earning rules that pay for something other than a purchase.
 *
 * They live in `LoyaltyEarningRule` like every other rule, marked by `conditions.trigger`,
 * and `bonusPoints` is the flat award. Everything that reasons about purchases — the
 * engine, the rule list the Program page / cashier / wizard edit, the giveback estimate —
 * must never see them: a mention rule matched against a purchase would pay its bonus on
 * every sale. Hence the JS filter rather than a JSON-path `where`: `NOT (conditions->trigger
 * = …)` is NULL, not true, for rows without the key, and would hide every purchase rule.
 */

type Db = Prisma.TransactionClient | typeof prisma;

interface RuleLike {
  conditions?: unknown;
}

export const INSTAGRAM_MENTION_TRIGGER: LoyaltyEarningRuleTrigger = "instagram_mention";

export const ALL_MENTION_KINDS: readonly InstagramMentionRuleKind[] = ["STORY", "MEDIA", "COMMENT"];

export const DEFAULT_MENTION_COOLDOWN_DAYS = 7;

export function ruleTrigger(rule: RuleLike): LoyaltyEarningRuleTrigger | null {
  const conditions = rule.conditions;
  if (!conditions || typeof conditions !== "object" || Array.isArray(conditions)) return null;
  const trigger = (conditions as LoyaltyEarningRuleConditions).trigger;
  return typeof trigger === "string" && trigger.length > 0 ? trigger : null;
}

/** A rule that prices purchases: everything without a `trigger`. */
export function isPurchaseRule(rule: RuleLike): boolean {
  return ruleTrigger(rule) === null;
}

export function onlyPurchaseRules<T extends RuleLike>(rules: readonly T[]): T[] {
  return rules.filter(isPurchaseRule);
}

export interface InstagramMentionRuleConfig {
  /** Null until the option is first saved. */
  id: string | null;
  enabled: boolean;
  pointsPerMention: number;
  mentionKinds: InstagramMentionRuleKind[];
  cooldownDays: number;
}

export function toInstagramMentionConfig(
  rule: Pick<LoyaltyEarningRule, "id" | "status" | "bonusPoints" | "conditions"> | null,
): InstagramMentionRuleConfig {
  if (!rule) {
    return {
      id: null,
      enabled: false,
      pointsPerMention: 10,
      mentionKinds: [...ALL_MENTION_KINDS],
      cooldownDays: DEFAULT_MENTION_COOLDOWN_DAYS,
    };
  }
  const conditions = (rule.conditions ?? {}) as LoyaltyEarningRuleConditions;
  const kinds = (conditions.mentionKinds ?? []).filter((k) => ALL_MENTION_KINDS.includes(k));
  return {
    id: rule.id,
    enabled: rule.status === "active",
    pointsPerMention: rule.bonusPoints ?? 0,
    mentionKinds: kinds.length > 0 ? kinds : [...ALL_MENTION_KINDS],
    cooldownDays:
      typeof conditions.cooldownDays === "number" && conditions.cooldownDays >= 0
        ? conditions.cooldownDays
        : DEFAULT_MENTION_COOLDOWN_DAYS,
  };
}

/** The programme's Instagram-mention rule, whatever its status. One per programme. */
export async function findInstagramMentionRule(
  programId: string,
  db: Db = prisma,
): Promise<LoyaltyEarningRule | null> {
  const rules = await db.loyaltyEarningRule.findMany({
    where: { programId },
    orderBy: { createdAt: "asc" },
  });
  return rules.find((rule) => ruleTrigger(rule) === INSTAGRAM_MENTION_TRIGGER) ?? null;
}

/** Writes the option. The row is created on first save and updated in place afterwards. */
export async function saveInstagramMentionRule(
  programId: string,
  input: InstagramMentionRuleInput,
): Promise<InstagramMentionRuleConfig> {
  const conditions: LoyaltyEarningRuleConditions = {
    trigger: INSTAGRAM_MENTION_TRIGGER,
    mentionKinds: [...new Set(input.mentionKinds)],
    cooldownDays: input.cooldownDays,
  };
  const data = {
    status: input.enabled ? "active" : "inactive",
    bonusPoints: input.pointsPerMention,
    conditions,
  };
  const existing = await findInstagramMentionRule(programId);
  const saved = existing
    ? await prisma.loyaltyEarningRule.update({ where: { id: existing.id }, data })
    : await prisma.loyaltyEarningRule.create({
        data: {
          ...data,
          programId,
          name: "Mention us on Instagram",
          description: "Points for tagging the business in a story, post or comment.",
          // Never a purchase rate: these two only matter if the engine ever read the row.
          pointsPerUnit: 0,
          multiplier: 1,
          isDefault: false,
          priority: 0,
          applicableToTiers: [],
        },
      });
  return toInstagramMentionConfig(saved);
}
