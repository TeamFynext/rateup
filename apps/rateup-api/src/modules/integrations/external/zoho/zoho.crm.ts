import prisma from "../../../../utils/prisma.js";
import { log } from "../../../../utils/logger.js";
import { IntegratedApps } from "../../../../types/enums.js";
import { integrationTriggerQueue } from "../../../../workers/bullmq/queues/index.js";
import { recordIntegrationSyncActivity } from "../integrationActivity.js";
import { createZohoRecord, deleteZohoRecord, updateZohoRecord } from "./zoho.client.js";
import {
  getZohoCredential,
  resolveCrmLeadStatus,
  ZohoTriggers,
  type StageMappingKey,
  type ZohoJobContext,
  type ZohoTriggerData,
} from "./zoho.types.js";

/**
 * Zoho CRM, outbound: the contact and lead jobs, and the lead status push the
 * board's stage mapping drives. Bigin's half is `zoho.bigin.ts`.
 */

export const ZOHO_CRM_TRIGGERS: readonly string[] = [
  ZohoTriggers.CONTACT_CREATE,
  ZohoTriggers.CONTACT_UPDATE,
  ZohoTriggers.CONTACT_DELETE,
  ZohoTriggers.LEAD_CREATE,
  ZohoTriggers.LEAD_UPDATE,
];

/** The id of the record a Zoho create returned, if it returned one. */
function createdRecordId(response: { data?: unknown } | undefined): string | undefined {
  const rows = response?.data;
  if (!Array.isArray(rows) || !rows[0]) return undefined;
  return (rows[0] as { details?: { id?: string } }).details?.id;
}

/** Keeps a created CRM record's id on the Rateup contact, beside the ids already there. */
async function linkToContact(contactId: string, kind: "contact" | "lead", zohoId: string) {
  const existing = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { integrationIds: true },
  });
  const integrationIds = (existing?.integrationIds as ContactIntegrationIds | null) ?? {};
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      integrationIds: {
        ...integrationIds,
        zoho: { ...integrationIds.zoho, [kind]: { ...integrationIds.zoho?.[kind], id: zohoId } },
      },
    },
  });
}

/** Runs one of the {@link ZOHO_CRM_TRIGGERS} jobs. */
export async function processZohoCrmJob(
  { credential, accessToken, rateupContactId }: ZohoJobContext,
  triggerKey: string,
  data: ZohoTriggerData,
) {
  switch (triggerKey) {
    case ZohoTriggers.CONTACT_CREATE: {
      log.info("Zoho create payload => %o", data);
      const response = await createZohoRecord(accessToken, "Contacts", data, credential.api_domain);
      log.info("Zoho contact created successfully");

      const zohoContactId = createdRecordId(response);
      if (zohoContactId && rateupContactId) {
        await linkToContact(rateupContactId, "contact", zohoContactId);
        log.info("Updated contact with Zoho ID ");
      }
      return;
    }

    case ZohoTriggers.CONTACT_UPDATE: {
      const { zohoContactId, ...payload } = data;
      if (!zohoContactId) {
        log.warn("No Zoho contact id found for update");
        return;
      }
      await updateZohoRecord(
        accessToken,
        "Contacts",
        zohoContactId,
        payload,
        credential.api_domain,
      );
      log.info("Zoho contact updated successfully");
      return;
    }

    case ZohoTriggers.CONTACT_DELETE: {
      const zohoContactId = data.zohoContactId;
      if (!zohoContactId) {
        log.warn("No Zoho contact id found");
        return;
      }
      await deleteZohoRecord(accessToken, "Contacts", zohoContactId, credential.api_domain);
      log.info("Zoho contact deleted successfully");
      return;
    }

    case ZohoTriggers.LEAD_CREATE: {
      log.info("Zoho lead create payload");
      const response = await createZohoRecord(accessToken, "Leads", data, credential.api_domain);
      log.info("Zoho lead created successfully");

      const zohoLeadId = createdRecordId(response);
      if (zohoLeadId && rateupContactId) {
        await linkToContact(rateupContactId, "lead", zohoLeadId);
        log.info("Updated contact with Zoho Lead ID");
      }
      return;
    }

    case ZohoTriggers.LEAD_UPDATE: {
      const { zohoLeadId, ...payload } = data;
      if (!zohoLeadId) {
        log.warn("No Zoho lead id found for update");
        return;
      }
      await updateZohoRecord(accessToken, "Leads", zohoLeadId, payload, credential.api_domain);
      log.info("Zoho lead updated successfully");
      return;
    }

    default:
      throw new Error(`Unsupported Zoho CRM trigger ${triggerKey}`);
  }
}

export async function updateZohoLeadQueue(
  orgId: string,
  zohoLeadId: string,
  fields: Record<string, unknown>,
) {
  await integrationTriggerQueue.add("zoho-lead-update", {
    integrationName: IntegratedApps.zoho,
    triggerKey: ZohoTriggers.LEAD_UPDATE,
    orgId,
    data: {
      zohoLeadId,
      ...fields,
    },
  });
}

/**
 * Tells Zoho CRM a lead changed column, through the org's status mapping.
 *
 * The one place `Lead_Status` is pushed from. Both callers — the board's
 * {@link import("../../../pipeline/pipelineLead/lead.service.js").moveLead} fan-out
 * and the contact write paths — used to enqueue the Rateup name directly, so
 * neither respected the mapping the org configured in the "Lead Status Mapping"
 * dialog even though the inbound sync has always read it.
 *
 * Silently does nothing when the column maps to no status: that is a
 * configuration gap, not a failure of the move that triggered it.
 */
export async function pushCrmLeadStatus(
  orgId: string,
  zohoLeadId: string,
  key: StageMappingKey,
  extraFields: Record<string, unknown> = {},
  /**
   * The Rateup lead this move came from, so the outcome can be put on its
   * timeline. Optional because the contact write paths also call this, and a
   * contact has no timeline of its own.
   */
  rateupLeadId?: string,
) {
  // Resolving the mapping means a database read, and this sits inside a fan-out
  // that also feeds Bigin. Its own guard, so a Zoho lookup that fails does not
  // take the other integrations down with it.
  let leadStatus: string | null;
  try {
    const integration = await prisma.integration.findUnique({
      where: { orgid_integration_name_unique: { orgId, name: IntegratedApps.zoho } },
    });
    if (!integration) return;

    const credential = getZohoCredential(integration);
    leadStatus = resolveCrmLeadStatus(credential?.crm?.leadLifecycleMappings || [], key);
  } catch (error) {
    log.error(error, "Failed to read the Zoho lead status mapping");
    return;
  }

  if (!leadStatus) {
    log.warn(
      "Column %s maps to no Zoho lead status; leaving the CRM lead's status alone",
      key.stageName ?? key.lifecycleName ?? key.stageId ?? key.lifecycleId,
    );
    // The status is the only field the mapping governs. A caller that also had
    // name or phone changes to push still gets them out — dropping those too
    // would turn a mapping gap into a contact that stops syncing entirely.
    if (Object.keys(extraFields).length > 0)
      await updateZohoLeadQueue(orgId, zohoLeadId, extraFields);

    // Recorded as a partial rather than a clean sync: the lead reached the CRM
    // but its status did not, which is a mapping the org has to fix. Previously
    // this was a warn line nobody outside the logs would ever see.
    await recordIntegrationSyncActivity(rateupLeadId, "INTEGRATION_SYNCED", "Zoho CRM", {
      externalId: zohoLeadId,
      externalCreated: false,
      statusRejected: true,
    });
    return;
  }

  await updateZohoLeadQueue(orgId, zohoLeadId, { ...extraFields, Lead_Status: leadStatus });
  await recordIntegrationSyncActivity(rateupLeadId, "INTEGRATION_SYNCED", "Zoho CRM", {
    externalId: zohoLeadId,
    externalCreated: false,
    toStageName: leadStatus,
  });
}
