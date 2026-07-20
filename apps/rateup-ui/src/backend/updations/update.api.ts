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

export interface MigrateFreePlanFeaturesResult {
  message: string;
  updated: number;
}

export async function migrateFreePlanFeatures() {
  return await axiosClient.put<MigrateFreePlanFeaturesResult>(
    `${baseUrl}/migrate-free-plan-features`,
    null,
    { timeout: 60000 },
  );
}

export interface MigrateNonFreePlanFeaturesResult {
  message: string;
  updated: number;
  skipped: number;
}

export async function migrateNonFreePlanFeatures() {
  return await axiosClient.put<MigrateNonFreePlanFeaturesResult>(
    `${baseUrl}/migrate-non-free-plan-features`,
    null,
    { timeout: 120000 },
  );
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

export interface BackfillConversationsResult {
  message: string;
  applied: boolean;
  scannedContacts: number;
  conversationsCreated: number;
  messagesLinked: number;
  assigneesBackfilled: number;
  /** False when the server hit its time budget with work left; call again to continue. */
  done: boolean;
}

/**
 * Dry run unless `apply` is true. The server works for ~20s per call and returns
 * `done: false` if more remains — the API caps every request at 30s, so a full
 * backfill takes several calls. Callers must loop until `done`.
 */
export async function backfillConversations(apply = false) {
  return await axiosClient.put<BackfillConversationsResult>(
    `${baseUrl}/backfill-conversations?apply=${apply}`,
    null,
    { timeout: 30000 },
  );
}
