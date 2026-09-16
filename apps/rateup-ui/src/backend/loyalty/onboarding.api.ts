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

export const ONBOARDING_STEPS = ["profile", "earning", "tiers", "rewards", "messages"] as const;

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
    id: string;
    name: string;
    threshold: string | number;
    pointsMultiplier: string | number;
    color: string;
    benefitsDescription: string | null;
  }>;
  rules: Array<{
    id: string;
    name: string;
    description: string | null;
    status?: string;
    pointsPerUnit: string | number;
    multiplier: string | number;
    bonusPoints: number | null;
    allowedDays: string[];
    minPurchaseAmount?: string | number | null;
    applicableToTiers?: string[];
    validFrom?: string | null;
    validUntil?: string | null;
    isDefault: boolean;
    priority: number;
  }>;
  rewards: Array<{
    id: string;
    name: string;
    description: string | null;
    status?: string;
    pointsCost: number;
    rewardType: string;
    rewardValue: Record<string, unknown>;
    stockQuantity?: number | null;
    stockRedeemed?: number;
    availableForTiers?: string[];
  }>;
  commands: Array<{
    id?: string;
    type: string;
    requestMessage: string | null;
    content: unknown;
    responseType?: string;
    waTemplateId?: string | null;
  }>;
  triggers: Array<{
    id?: string;
    eventType: string;
    enabled: boolean;
    waTemplateId?: string | null;
    triggerDays?: number | null;
    rewardId?: string | null;
    /** Meta's name and verdict for the template this trigger sends, when it has one. */
    templateName?: string | null;
    templateStatus?: string | null;
  }>;
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
    /** The three the sidebar badges show, so the nav needs this one request. */
    members?: number;
    pendingApprovals?: number;
    templatesPending?: number;
  };
}

/**
 * The venue & branding profile — strictly operational: who and where the business is, and
 * the assets a wallet pass or web widget is generated from. Absent = keep what is stored,
 * `null` = clear it. The business-type preset is inferred server-side from the org's
 * industry, so it is no longer sent.
 */
export interface ProfileStepPayload {
  /** The starter pack the later steps are seeded from. Absent = keep the stored one. */
  presetKey?: LoyaltyPresetKey;
  name: string;
  businessName?: string | null;
  /** Asked on the earning step now; still accepted here. Absent = keep. */
  currencyName?: string;
  currencyCode: string;
  currencySymbol: string;
  timezone?: string;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  logoUrl?: string | null;
  brandColor?: string | null;
  heroImageUrl?: string | null;
  defaultCountryCode?: string;
  whatsappSettingsId?: string;
  /** Still accepted for the Program page's section editor; the wizard leaves it out. */
  averageOrderValue?: number | null;
}

export interface EarningStepPayload {
  /** What the programme calls its points. Absent leaves the stored name alone. */
  currencyName?: string;
  rules: Array<{
    /** Present to update that exact row, so a rename does not fork a second rule. */
    id?: string;
    name: string;
    description?: string | null;
    /** Absent = active. */
    status?: "active" | "inactive";
    pointsPerUnit: number;
    multiplier: number;
    bonusPoints: number;
    allowedDays: string[];
    minPurchaseAmount?: number | null;
    /** Absent = leave the stored tier restriction alone. */
    applicableToTiers?: string[];
    isDefault: boolean;
    priority: number;
  }>;
  /** True from the Program editor, whose payload is the whole desired list. */
  deleteMissing?: boolean;
  /**
   * Typical spend in one visit. Edited beside the earn rate because that is where the
   * giveback estimate first needs it; absent leaves the stored value alone.
   */
  averageOrderValue?: number | null;
}

export interface TiersStepPayload {
  tiersEnabled: boolean;
  tiers: Array<{
    id?: string;
    name: string;
    threshold: number;
    pointsMultiplier: number;
    color: string;
    benefitsDescription?: string | null;
  }>;
  /**
   * Months of trailing spend that count towards a tier. Null = lifetime spend; absent =
   * leave the stored window alone.
   */
  qualificationWindowMonths?: number | null;
  deleteMissing?: boolean;
  /** A removed tier that still has members needs this, or the API refuses with 409. */
  downgradeCustomers?: boolean;
}

/** What the tiers step hands back: the saved ladder and who moved when it was re-checked. */
export interface TiersStepResult {
  tiers: SavedOnboardingData["tiers"];
  /** Every active member is re-placed against the new ladder as part of the save. */
  moves: { evaluated: number; promoted: number; demoted: number };
}

export interface RewardsStepPayload {
  /**
   * Points paid for joining and for a referral. Stored on the programme, edited on this
   * step alongside the rewards they are budgeted against.
   */
  signupBonus: number;
  referralBonus: number;
  refereeBonus: number;
  rewards: Array<{
    /** Absent for a reward being created; present to update that exact row. */
    id?: string;
    name: string;
    description?: string | null;
    pointsCost: number;
    rewardType: "point" | "coupon" | "assigned";
    rewardValue: Record<string, unknown>;
    /** Absent = leave stored stock alone; null = unlimited. */
    stockQuantity?: number | null;
    /** Absent = leave the stored tier restriction alone. */
    availableForTiers?: string[];
  }>;
}

export interface MessagesStepPayload {
  commands: Array<{
    type: string;
    requestMessage: string;
    text: string;
    /** A template for customers who have never messaged; the text still goes out inside a chat. */
    waTemplateId?: string | null;
  }>;
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
  status: "pending" | "approved" | "rejected" | "failed";
  templateId?: string;
  /** A template of that name already existed and was pointed at, not resubmitted. */
  reused?: boolean;
  /** An existing template's text was changed in place; Meta reviews it again. */
  edited?: boolean;
  /** The text became a new template (`…_v2`) because Meta would not take an edit. */
  versioned?: boolean;
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

export async function applyProfileStep(payload: ProfileStepPayload): Promise<LoyaltyProgram> {
  return (await axiosClient.post(`${ONBOARDING_BASE}/steps/profile`, payload)).data;
}

export async function applyEarningStep(payload: EarningStepPayload): Promise<unknown> {
  return (await axiosClient.post(`${ONBOARDING_BASE}/steps/earning`, payload)).data;
}

export async function applyTiersStep(payload: TiersStepPayload): Promise<TiersStepResult> {
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
