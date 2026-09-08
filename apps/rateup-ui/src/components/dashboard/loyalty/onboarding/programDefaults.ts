import type { LoyaltyPreset, OnboardingState } from "@/backend/loyalty/onboarding.api";

import type {
  BasicsFormInput,
  EarningFormInput,
  MessagesFormInput,
  RewardsFormInput,
  TiersFormInput,
} from "./schemas.ts";

/**
 * What each editor form starts from.
 *
 * Two screens mount the same step forms — the setup wizard and the Program page's
 * section editors — and both must read back exactly what is stored. A step the user has
 * saved prefills from the stored rows; only a step never saved falls back to the preset.
 * Keeping the rules here, as pure functions, is what stops the two screens drifting.
 */

export function buildBasicsDefaults(
  state: OnboardingState,
  preset: LoyaltyPreset,
): BasicsFormInput {
  const program = state.program;
  return {
    name: program?.name ?? preset.label,
    currencyName: program?.currencyName ?? preset.basics.currencyName,
    currencyCode: program?.currencyCode ?? "INR",
    currencySymbol: program?.currencySymbol ?? "₹",
    averageOrderValue: program?.averageOrderValue ?? preset.basics.averageOrderValue,
  };
}

export function buildEarningDefaults(
  state: OnboardingState,
  preset: LoyaltyPreset,
): EarningFormInput {
  const saved = state.saved;
  return {
    rules: saved.rules.length
      ? saved.rules.map((rule) => ({
          id: rule.id,
          name: rule.name,
          description: rule.description ?? "",
          status: rule.status === "inactive" ? "inactive" : "active",
          pointsPerUnit: Number(rule.pointsPerUnit),
          multiplier: Number(rule.multiplier),
          bonusPoints: rule.bonusPoints ?? 0,
          allowedDays: rule.allowedDays ?? [],
          minPurchaseAmount:
            rule.minPurchaseAmount === null || rule.minPurchaseAmount === undefined
              ? undefined
              : Number(rule.minPurchaseAmount),
          applicableToTiers: rule.applicableToTiers ?? [],
          isDefault: rule.isDefault,
          priority: rule.priority,
        }))
      : preset.earningRules.map((rule) => ({
          name: rule.name,
          description: rule.description,
          status: "active" as const,
          pointsPerUnit: rule.pointsPerUnit,
          multiplier: rule.multiplier ?? 1,
          bonusPoints: rule.bonusPoints ?? 0,
          allowedDays: rule.allowedDays ?? [],
          applicableToTiers: [],
          isDefault: rule.isDefault,
          priority: rule.priority,
        })),
  };
}

export function buildTiersDefaults(state: OnboardingState, preset: LoyaltyPreset): TiersFormInput {
  const saved = state.saved;
  return {
    tiersEnabled: state.program?.tiersEnabled ?? preset.tiersEnabled,
    tiers: saved.tiers.length
      ? saved.tiers.map((tier) => ({
          id: tier.id,
          name: tier.name,
          threshold: Number(tier.threshold),
          pointsMultiplier: Number(tier.pointsMultiplier),
          color: tier.color,
          benefitsDescription: tier.benefitsDescription ?? "",
        }))
      : preset.tiers.map((tier) => ({
          name: tier.name,
          threshold: tier.threshold,
          pointsMultiplier: tier.multiplier,
          color: tier.color,
          benefitsDescription: tier.benefits_description ?? "",
        })),
  };
}

export function buildRewardsDefaults(
  state: OnboardingState,
  preset: LoyaltyPreset,
): RewardsFormInput {
  const saved = state.saved;
  const program = state.program;
  return {
    // Programme columns rather than reward rows, but this is the step that edits them.
    signupBonus: program?.signupBonus ?? preset.basics.signupBonus,
    referralBonus: program?.referralBonus ?? preset.basics.referralBonus,
    refereeBonus: program?.refereeBonus ?? preset.basics.refereeBonus,
    rewards: saved.rewards.length
      ? saved.rewards.map((reward) => ({
          // Carried so the API updates this row rather than forking a new reward on rename.
          id: reward.id,
          name: reward.name,
          description: reward.description ?? "",
          pointsCost: reward.pointsCost,
          rewardType: normaliseRewardType(reward.rewardType),
          rewardValue: reward.rewardValue ?? {},
          stockQuantity: reward.stockQuantity ?? null,
          availableForTiers: reward.availableForTiers ?? [],
        }))
      : preset.rewards.map((reward) => ({
          name: reward.name,
          description: reward.description,
          pointsCost: reward.pointsCost,
          rewardType: reward.rewardType,
          rewardValue: reward.rewardValue,
          stockQuantity: null,
          availableForTiers: [],
        })),
  };
}

export function buildMessagesDefaults(
  state: OnboardingState,
  preset: LoyaltyPreset,
): MessagesFormInput {
  const saved = state.saved;
  const savedCommandText = new Map(
    saved.commands.map((command) => [command.type, richTextToPlainText(command.content)]),
  );

  return {
    commands: preset.commands.map((command) => ({
      type: command.type,
      requestMessage:
        saved.commands.find((c) => c.type === command.type)?.requestMessage ??
        command.requestMessage,
      text: savedCommandText.get(command.type) || command.text,
    })),
    eventTemplates: preset.eventTemplates.map((template) => ({
      eventType: template.eventType,
      templateName: template.templateName,
      body: template.body,
      enabled: true,
    })),
  };
}

/**
 * Reward status casing is uppercase on the API but `rewardType` is lowercase; a stored
 * row could still carry an unexpected value, so narrow it back to the form's union.
 */
export function normaliseRewardType(value: string): "point" | "coupon" | "assigned" {
  return value === "coupon" || value === "assigned" ? value : "point";
}

/**
 * `LoyaltyWaCommand.content` is a rich-text document. The wizard edits plain text, so a
 * saved command is flattened one line per top-level block — the same shape the API's
 * `richTextToPlainText` produces when it sends the reply.
 */
export function richTextToPlainText(content: unknown): string {
  const collect = (node: unknown): string => {
    if (!node || typeof node !== "object") return "";
    const record = node as { text?: unknown; content?: unknown };
    if (typeof record.text === "string") return record.text;
    return Array.isArray(record.content) ? record.content.map(collect).join("") : "";
  };

  if (typeof content === "string") return content;
  const nodes = Array.isArray(content)
    ? content
    : ((content as { content?: unknown })?.content ?? []);

  return Array.isArray(nodes)
    ? nodes
        .map(collect)
        .filter((line) => line.length > 0)
        .join("\n")
    : "";
}
