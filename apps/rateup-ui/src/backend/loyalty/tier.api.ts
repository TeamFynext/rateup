import { axiosClient } from "../apiClient";

export interface LoyaltyTier {
  id: string;
  programId: string;
  name: string;
  threshold: number;
  pointsMultiplier: number;
  color: string;
  benefitsDescription?: string | null;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltyTierInput {
  name: string;
  threshold?: number;
  pointsMultiplier?: number;
  color?: string;
  benefitsDescription?: string | null;
  priority?: number;
}

export interface LoyaltyTierUpdateInput extends Partial<LoyaltyTierInput> {}

const LOYALTY_ROUTES_BASE = "/loyalty/tiers";
/**
 * Get all loyalty tiers
 */
export const getLoyaltyTiers = async (): Promise<LoyaltyTier[]> => {
  const response = await axiosClient.get(LOYALTY_ROUTES_BASE);
  return response.data;
};

/**
 * Get a single loyalty tier by ID
 */
export const getLoyaltyTierById = async (
  tierId: string,
): Promise<LoyaltyTier> => {
  const response = await axiosClient.get(`${LOYALTY_ROUTES_BASE}/${tierId}`);
  return response.data;
};

/**
 * Create a new loyalty tier
 */
export const createLoyaltyTier = async (
  tierData: LoyaltyTierInput,
): Promise<LoyaltyTier> => {
  const response = await axiosClient.post(LOYALTY_ROUTES_BASE, tierData);
  return response.data;
};

/**
 * Update an existing loyalty tier
 */
export const updateLoyaltyTier = async (
  tierId: string,
  tierData: LoyaltyTierUpdateInput,
): Promise<LoyaltyTier> => {
  const response = await axiosClient.put(
    `${LOYALTY_ROUTES_BASE}/${tierId}`,
    tierData,
  );
  return response.data;
};

/**
 * Delete a loyalty tier
 */
export const deleteLoyaltyTier = async (tierId: string): Promise<void> => {
  await axiosClient.delete(`${LOYALTY_ROUTES_BASE}/${tierId}`);
};
