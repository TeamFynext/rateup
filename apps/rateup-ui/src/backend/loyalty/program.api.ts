import type { JSONContent } from "@tiptap/react";

import { axiosClient } from "../apiClient";

/** The join message: plain text, or the editor's document nodes. */
export type ReferralMessageTemplate = string | unknown[] | JSONContent;

export interface LoyaltyProgram {
  id: string;
  orgId: string;
  /** The programme's own name, e.g. "Kettle Rewards". */
  name: string;
  /** The business behind it, e.g. "Kettle & Co". Null on programmes set up before it was asked. */
  businessName?: string | null;
  status: "draft" | "active" | "paused";
  currencyName: string;
  currencyCode: string;
  currencySymbol: string;
  signupBonus: number;
  referralBonus: number;
  referralBonusType?: "points" | "gift";
  referralRewardId?: string;
  refereeBonus: number;
  refereeBonusType?: "points" | "gift";
  refereeRewardId?: string;
  newCustomerBonus?: number;
  tiersEnabled: boolean;
  tierResetPeriod?: "never" | "yearly" | "monthly" | null;
  defaultCountryCode?: string;
  /** Typical spend in one visit; null when the merchant never set it. */
  averageOrderValue?: number | null;
  /** Which starter pack the setup wizard used, if it ran. Picks example vocabulary. */
  onboardingPresetKey?: string | null;
  /** The last wizard step saved; what "Continue setup" resumes from. */
  onboardingStep?: string | null;
  /** When the programme was first activated — the "live since" date. */
  onboardingCompletedAt?: string | null;
  referralMessageTemplate?: ReferralMessageTemplate;
  enablePointsExpiration?: boolean;
  pointsExpirationMonths?: number;
  pointsActivityAlerts?: boolean;
  autoApproveAdjustments?: boolean;
  emailNotifications?: boolean;
  whatsappNotifications?: boolean;
  /** Inside an open 24-hour chat, send a notification's text as a plain message. */
  sendTextInSession?: boolean;
  enableShopifyOrderPoints?: boolean;
  /** Months of trailing spend that count towards a tier; null = lifetime. */
  tierQualificationWindowMonths?: number | null;
  /* ── Venue & branding profile ── */
  timezone?: string | null;
  logoUrl?: string | null;
  brandColor?: string | null;
  heroImageUrl?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  /** Print materials (QR card, brochure) — narrowed with `parseMaterials` on the UI. */
  materials?: unknown;
  createdAt: Date;
  updatedAt: Date;
  whatsappSettingsId?: string;
}

export interface LoyaltyProgramInput {
  name: string;
  status?: "draft" | "active" | "paused";
  currencyName?: string;
  currencyCode?: string;
  currencySymbol?: string;
  signupBonus?: number;
  referralBonus?: number;
  referralBonusType?: "points" | "gift";
  referralRewardId?: string;
  refereeBonus?: number;
  refereeBonusType?: "points" | "gift";
  refereeRewardId?: string;
  newCustomerBonus?: number;
  tiersEnabled?: boolean;
  tierResetPeriod?: "never" | "yearly" | "monthly" | null;
  defaultCountryCode?: string;
  /** Typical spend in one visit; null when the merchant never set it. */
  averageOrderValue?: number | null;
  /** Which starter pack the setup wizard used, if it ran. Picks example vocabulary. */
  onboardingPresetKey?: string | null;
  referralMessageTemplate?: ReferralMessageTemplate;
  pointsExpirationMonths?: number;
  autoApproveAdjustments?: boolean;
  emailNotifications?: boolean;
  whatsappNotifications?: boolean;
  sendTextInSession?: boolean;
  enableShopifyOrderPoints?: boolean;
  programActive?: boolean;
  pointsActivityAlerts?: boolean;
  enablePointsExpiration?: boolean;
  whatsappSettingsId?: string;
  /** The Materials page's document; null clears it. */
  materials?: Record<string, unknown> | null;
}

export interface LoyaltyProgramUpdateInput extends Partial<LoyaltyProgramInput> {}

/**
 * Get the current loyalty program
 */
export const getLoyaltyProgram = async (): Promise<LoyaltyProgram> => {
  const response = await axiosClient.get("/loyalty/program");
  return response.data;
};

/**
 * Create a new loyalty program
 */
export const createLoyaltyProgram = async (
  programData: LoyaltyProgramInput,
): Promise<LoyaltyProgram> => {
  const response = await axiosClient.post("/loyalty/program", programData);
  return response.data;
};

/**
 * Update an existing loyalty program
 */
export const updateLoyaltyProgram = async (
  programId: string,
  programData: LoyaltyProgramUpdateInput,
): Promise<LoyaltyProgram> => {
  const response = await axiosClient.put(`/loyalty/program/${programId}`, programData);
  return response.data;
};

/**
 * Reset all points in a loyalty program
 */
export const resetLoyaltyProgramPoints = async (programId: string): Promise<void> => {
  await axiosClient.post(`/loyalty/program/${programId}/reset-points`);
};

/**
 * Delete a loyalty program
 */
export const deleteLoyaltyProgram = async (
  programId: string,
  force: boolean = false,
): Promise<void> => {
  await axiosClient.delete(`/loyalty/program/${programId}?force=${force}`);
};
