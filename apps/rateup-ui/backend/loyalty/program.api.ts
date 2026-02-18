import { axiosClient } from "../apiClient";

export interface LoyaltyProgram {
  id: string;
  orgId: string;
  name: string;
  status: "draft" | "active" | "paused";
  currencyName: string;
  currencyCode: string;
  currencySymbol: string;
  signupBonus: number;
  referralBonus: number;
  refereeBonus: number;
  newCustomerBonus?: number;
  tiersEnabled: boolean;
  tierResetPeriod?: "never" | "yearly" | "monthly" | null;
  defaultCountryCode?: string;
  referralMessageTemplate?: string;
  enablePointsExpiration?: boolean;
  pointsExpirationMonths?: number;
  customerNotifications?: boolean;
  autoApproveAdjustments?: boolean;
  emailNotifications?: boolean;
  whatsappNotifications?: boolean;
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
  refereeBonus?: number;
  newCustomerBonus?: number;
  tiersEnabled?: boolean;
  tierResetPeriod?: "never" | "yearly" | "monthly" | null;
  defaultCountryCode?: string;
  referralMessageTemplate?: string;
  pointsExpirationMonths?: number;
  customerNotifications?: boolean;
  autoApproveAdjustments?: boolean;
  emailNotifications?: boolean;
  whatsappNotifications?: boolean;
  programActive?: boolean;
  pointsActivityAlerts?: boolean;
  enablePointsExpiration?: boolean;
  whatsappSettingsId?: string;
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
  const response = await axiosClient.put(
    `/loyalty/program/${programId}`,
    programData,
  );
  return response.data;
};

/**
 * Reset all points in a loyalty program
 */
export const resetLoyaltyProgramPoints = async (
  programId: string,
): Promise<void> => {
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
