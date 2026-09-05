import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";

/**
 * Timeline entry types for integration syncs.
 *
 * Deliberately provider-neutral, with the provider named in
 * `details.integrationName`. A `ZOHO_SYNCED` / `GETLEAD_SYNCED` / … per provider
 * would mean a new UI case for every integration added, all rendering the same
 * sentence with a different noun.
 */
export type IntegrationActivityType =
  | "INTEGRATION_SYNCED"
  | "INTEGRATION_SKIPPED"
  /** A change the CRM pushed to us, rather than one we pushed out. */
  | "INTEGRATION_RECEIVED";

/**
 * Puts a sync outcome on the lead's timeline.
 *
 * Syncs run in a worker with no request and no user, so `recordAuditEvent` is
 * unavailable — but `LeadActivity.userId` is nullable, which is exactly this
 * system-generated case.
 *
 * Never allowed to fail its caller. By the time this runs the push has already
 * reached the CRM; throwing would fail the job, and the retry would push the same
 * record a second time. A lost timeline entry is much cheaper than a duplicate.
 *
 * Does nothing without a lead to hang the entry on: contact-level syncs have no
 * timeline of their own.
 */
export async function recordIntegrationSyncActivity(
  rateupLeadId: string | undefined,
  type: IntegrationActivityType,
  integrationName: string,
  details: LeadActivityDetails = {},
) {
  if (!rateupLeadId) return;

  try {
    await prisma.leadActivity.create({
      data: {
        leadId: rateupLeadId,
        userId: null,
        type,
        details: { automated: true, integrationName, ...details },
      },
    });
  } catch (error) {
    log.error(
      "Failed to record %s activity for %s on lead %s: %s",
      type,
      integrationName,
      rateupLeadId,
      error,
    );
  }
}
