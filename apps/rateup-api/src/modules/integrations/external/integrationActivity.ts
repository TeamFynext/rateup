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

const ACTIVITY_TYPES: IntegrationActivityType[] = [
  "INTEGRATION_SYNCED",
  "INTEGRATION_SKIPPED",
  "INTEGRATION_RECEIVED",
];

/**
 * The `integrationName`s each provider writes, keyed by provider, so an
 * integration's page can find its own entries. Entries name the product the
 * person recognises ("Zoho Bigin"), not the provider key — the timeline shows
 * that name as-is — so one provider can own several.
 */
export const ACTIVITY_NAMES: Readonly<Partial<Record<string, readonly string[]>>> = {
  zoho: ["Zoho CRM", "Zoho Bigin"],
  getlead: ["GetLead"],
};

/** How far back the Sync activity panel looks. It is a recent-health view, not an archive. */
const ACTIVITY_WINDOW_DAYS = 30;

/**
 * The most recent sync entries one provider left on this org's leads, newest
 * first, for the integration page's Sync activity panel.
 *
 * Bounded by type and by the last 30 days so the `(type, createdAt)` index
 * does the work; the org is reached through the lead's pipeline, since a lead
 * carries no org of its own.
 */
export async function listIntegrationActivity(orgId: string, provider: string, limit = 25) {
  const names = ACTIVITY_NAMES[provider];
  if (!names?.length) return [];

  const since = new Date(Date.now() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await prisma.leadActivity.findMany({
    where: {
      type: { in: ACTIVITY_TYPES },
      createdAt: { gte: since },
      lead: { pipeline: { orgId } },
      OR: names.map((name) => ({ details: { path: ["integrationName"], equals: name } })),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      details: true,
      createdAt: true,
      lead: { select: { id: true, name: true, pipelineId: true } },
    },
  });
  return rows;
}
