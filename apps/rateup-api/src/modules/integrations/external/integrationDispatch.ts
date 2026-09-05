import type { Job } from "bullmq";

import prisma from "../../../utils/prisma.js";
import { processGetLead } from "./getlead/getlead.service.js";
import type { GetLeadSource } from "./getlead/getlead.utils.js";
import { processZoho } from "./zoho/zoho.service.js";
import type { ZohoTriggerData } from "./zoho/zoho.types.js";

interface BaseIntegrationJob {
  triggerKey: string;
  orgId: string;
  rateupContactId?: string;
  /** Set by the pipeline's stage sync; see `syncLeadStageToIntegrations`. */
  rateupLeadId?: string;
}

/**
 * A job on `integrationTriggerQueue`, discriminated on the provider so each one
 * gets its own payload shape rather than a widening pile of optional fields.
 */
export type IntegrationJobData =
  | (BaseIntegrationJob & { integrationName: "zoho" | "zapier"; data: ZohoTriggerData })
  | (BaseIntegrationJob & { integrationName: "getlead"; data: GetLeadSource });

/**
 * Routes a queued trigger to the provider that should handle it.
 *
 * Lives outside every provider directory on purpose: it used to sit in
 * `zoho.service.ts`, which meant adding a second provider would have made the
 * Zoho module import that provider. This is the extension point new integrations
 * hang off — add a `case` here and a `process<Provider>` in that provider's
 * service.
 *
 * A trigger for an org that never connected the provider, or that has since
 * deactivated it, is silently dropped: the enqueueing side fans out to every
 * provider without checking, so "not connected" is the ordinary case, not a
 * failure.
 */
export async function processIntegration(job: Job<IntegrationJobData>) {
  const { integrationName, triggerKey, orgId, rateupContactId, rateupLeadId } = job.data;

  const integration = await prisma.integration.findUnique({
    where: {
      orgid_integration_name_unique: {
        orgId,
        name: integrationName,
      },
    },
  });

  if (!integration || !integration.active) {
    return;
  }

  // Switched on `job.data` rather than the destructured copy so the payload
  // narrows with the provider.
  switch (job.data.integrationName) {
    case "zapier":
      return;

    case "zoho":
      return processZoho(
        integration,
        triggerKey,
        job.data.data,
        orgId,
        rateupContactId,
        rateupLeadId,
      );

    case "getlead":
      return processGetLead(
        integration,
        triggerKey,
        job.data.data,
        orgId,
        rateupContactId,
        rateupLeadId,
      );

    default:
      throw new Error(`Unsupported integration: ${integrationName}`);
  }
}
