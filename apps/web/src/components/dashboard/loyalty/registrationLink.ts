import { FRONTEND_URL } from "@/utils/constants.ts";

/**
 * The public page a customer joins from. The program is identified by its org, and a
 * referral code rides along as `refer_code` when a member shares their own link.
 */
export function loyaltyRegistrationUrl(orgId: string, referCode?: string | null): string {
  const base = `${FRONTEND_URL}/loyalty/${orgId}/register`;
  return referCode ? `${base}?refer_code=${encodeURIComponent(referCode)}` : base;
}
