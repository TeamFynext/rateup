// For New Migrations and Updations

import { axiosClient } from "../apiClient";

const baseUrl = "/public/update";

export async function migrateWaTemplateToWhatsappPhoneId() {
  return await axiosClient.put(`${baseUrl}/migrate-wa-template-to-whatsapp-phone-id`, null, {
    timeout: 60000,
  });
}

export async function syncTeamFeatures() {
  return await axiosClient.put(`${baseUrl}/sync-team-features`, null, {
    timeout: 60000,
  });
}

export async function migrateLoyaltyTierPriority() {
  return await axiosClient.put(`${baseUrl}/migrate-loyalty-tier-priority`, null, {
    timeout: 60000,
  });
}

export async function seedInboxStats() {
  return await axiosClient.put(`${baseUrl}/seed-inbox-stats`, null, {
    timeout: 60000,
  });
}

export interface ReconcileInboxStatusResult {
  message: string;
  applied: boolean;
  scanned: number;
  mismatched: number;
  repaired: number;
  skippedReopenPending: number;
}

/** Dry run unless `apply` is true; only then are the repairs written. */
export async function reconcileInboxStatus(apply = false) {
  return await axiosClient.put<ReconcileInboxStatusResult>(
    `${baseUrl}/reconcile-inbox-status?apply=${apply}`,
    null,
    { timeout: 60000 },
  );
}
