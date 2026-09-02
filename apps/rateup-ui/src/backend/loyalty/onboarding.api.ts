import { axiosClient } from "../apiClient";
import { LOYALTY_BASE } from "./base";
import type { LoyaltyProgram } from "./program.api";

/**
 * The guided loyalty setup wizard.
 *
 * Each step POSTs to its own endpoint and is written for real straight away, with the
 * programme held at `status: "draft"` until `activate`. A draft programme sends nothing —
 * the API gates every outbound notification and inbound keyword on `status === "active"` —
 * so a half-finished wizard is invisible to customers.
 */

export const ONBOARDING_STEPS = ["basics", "earning", "tiers", "rewards", "messages"] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type LoyaltyPresetKey = "cafe" | "retail" | "salon" | "gym" | "generic";

export interface PresetEarningRule {
  name: string;
  description: string;
  pointsPerUnit: number;
  multiplier?: number;
  bonusPoints?: number;
  allowedDays?: string[];
  isDefault: boolean;
  priority: number;
}

export interface PresetTier {
  name: string;
  threshold: number;
  multiplier: number;
  color: string;
  benefits_description?: string;
}

export interface PresetReward {
  name: string;
  description: string;
  pointsCost: number;
  rewardType: "point" | "coupon" | "assigned";
  rewardValue: Record<string, unknown>;
}

export interface PresetCommand {
  type: string;
  requestMessage: string;
  text: string;
}

export interface PresetEventTemplate {
  eventType: string;
  templateName: string;
  body: string;
  params: string[];
}

export interface LoyaltyPreset {
  key: LoyaltyPresetKey;
  label: string;
  description: string;
  matchIndustries: string[];
  basics: {
    currencyName: string;
    signupBonus: number;
    referralBonus: number;
    refereeBonus: number;
    /** Suggested typical spend in one visit — seeds the giveback estimate. */
    averageOrderValue: number;
  };
  earningRules: PresetEarningRule[];
  tiersEnabled: boolean;
  tiers: PresetTier[];
  rewards: PresetReward[];
  commands: PresetCommand[];
  eventTemplates: PresetEventTemplate[];
}

export interface PresetsResponse {
  presets: LoyaltyPreset[];
  /** Derived from the org's self-reported industry; only a starting point. */
  suggestedPresetKey: LoyaltyPresetKey;
}

/** Rows the wizard has already written, used to prefill a step the user returns to. */
export interface SavedOnboardingData {
  tiers: Array<{
    name: string;
    threshold: string | number;
    pointsMultiplier: string | number;
    color: string;
    benefitsDescription: string | null;
  }>;
  rules: Array<{
    name: string;
    description: string | null;
    pointsPerUnit: string | number;
    multiplier: string | number;
    bonusPoints: number | null;
    allowedDays: string[];
    isDefault: boolean;
    priority: number;
  }>;
  rewards: Array<{
    id: string;
    name: string;
    description: string | null;
    pointsCost: number;
    rewardType: string;
    rewardValue: Record<string, unknown>;
  }>;
  commands: Array<{ type: string; requestMessage: string | null; content: unknown }>;
  triggers: Array<{ eventType: string; enabled: boolean }>;
}

export interface OnboardingState {
  program: LoyaltyProgram | null;
  presetKey: LoyaltyPresetKey | null;
  lastCompletedStep: OnboardingStep | null;
  /**
   * What is already stored. A step the user has saved prefills from here rather than
   * from the preset, so stepping backwards never silently reverts their edits.
   */
  saved: SavedOnboardingData;
  counts: {
    tiers: number;
    rules: number;
    rewards: number;
    commands: number;
    triggers: number;
  };
}

export interface BasicsStepPayload {
  presetKey: LoyaltyPresetKey;
  name: string;
  currencyName: string;
  currencyCode: string;
  currencySymbol: string;
  defaultCountryCode?: string;
  whatsappSettingsId?: string;
  signupBonus: number;
  referralBonus: number;
  refereeBonus: number;
  averageOrderValue?: number | null;
}

export interface EarningStepPayload {
  rules: Array<{
    name: string;
    description?: string | null;
    pointsPerUnit: number;
    multiplier: number;
    bonusPoints: number;
    allowedDays: string[];
    isDefault: boolean;
    priority: number;
  }>;
}

export interface TiersStepPayload {
  tiersEnabled: boolean;
  tiers: Array<{
    name: string;
    threshold: number;
    pointsMultiplier: number;
    color: string;
    benefitsDescription?: string | null;
  }>;
}

export interface RewardsStepPayload {
  rewards: Array<{
    /** Absent for a reward being created; present to update that exact row. */
    id?: string;
    name: string;
    description?: string | null;
    pointsCost: number;
    rewardType: "point" | "coupon" | "assigned";
    rewardValue: Record<string, unknown>;
  }>;
}

export interface MessagesStepPayload {
  commands: Array<{ type: string; requestMessage: string; text: string }>;
  eventTemplates: Array<{ eventType: string; templateName: string; body: string }>;
}

/** A keyword that was already taken, so the wizard can ask for a different one. */
export interface SkippedCommand {
  requestMessage: string;
  reason: "keyword_taken_by_automation" | "keyword_taken_by_command";
}

/** Meta approval is asynchronous, so each template reports its own submission outcome. */
export interface EventTemplateResult {
  eventType: string;
  templateName: string;
  status: "pending" | "failed";
  error?: string;
}

export interface MessagesStepResponse {
  skipped: SkippedCommand[];
  eventTemplates: EventTemplateResult[];
}

export interface ActivateResponse {
  program: LoyaltyProgram;
  /** Non-blocking gaps worth telling the user about after launch. */
  warnings: string[];
}

const ONBOARDING_BASE = `${LOYALTY_BASE}/onboarding`;

export async function getLoyaltyPresets(): Promise<PresetsResponse> {
  return (await axiosClient.get(`${ONBOARDING_BASE}/presets`)).data;
}

export async function getLoyaltyOnboardingState(): Promise<OnboardingState> {
  return (await axiosClient.get(`${ONBOARDING_BASE}/state`)).data;
}

export async function applyBasicsStep(payload: BasicsStepPayload): Promise<LoyaltyProgram> {
  return (await axiosClient.post(`${ONBOARDING_BASE}/steps/basics`, payload)).data;
}

export async function applyEarningStep(payload: EarningStepPayload): Promise<unknown> {
  return (await axiosClient.post(`${ONBOARDING_BASE}/steps/earning`, payload)).data;
}

export async function applyTiersStep(payload: TiersStepPayload): Promise<unknown> {
  return (await axiosClient.post(`${ONBOARDING_BASE}/steps/tiers`, payload)).data;
}

export async function applyRewardsStep(payload: RewardsStepPayload): Promise<unknown> {
  return (await axiosClient.post(`${ONBOARDING_BASE}/steps/rewards`, payload)).data;
}

export async function applyMessagesStep(
  payload: MessagesStepPayload,
): Promise<MessagesStepResponse> {
  return (await axiosClient.post(`${ONBOARDING_BASE}/steps/messages`, payload)).data;
}

export async function activateLoyaltyProgram(): Promise<ActivateResponse> {
  return (await axiosClient.post(`${ONBOARDING_BASE}/activate`)).data;
}
