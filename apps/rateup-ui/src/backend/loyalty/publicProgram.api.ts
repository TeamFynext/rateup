import { axiosClient } from "../apiClient";
import { PUBLIC_LOYALTY_BASE } from "./base";

/**
 * What the public join page may know about a programme before anyone signs in: enough to
 * brand the page and to say what joining is worth. Nothing here identifies a customer.
 */
export interface PublicLoyaltyProgram {
  name: string;
  businessName: string | null;
  currencyName: string;
  logoUrl: string | null;
  brandColor: string | null;
  heroImageUrl: string | null;
  signupBonus: number;
  status: "draft" | "active" | "paused";
  /** The business's WhatsApp number, digits only, for a `wa.me` link. Null when none. */
  whatsappNumber: string | null;
}

export async function getPublicLoyaltyProgram(orgId: string): Promise<PublicLoyaltyProgram> {
  return (await axiosClient.get(`${PUBLIC_LOYALTY_BASE}/programs/${encodeURIComponent(orgId)}`))
    .data;
}
