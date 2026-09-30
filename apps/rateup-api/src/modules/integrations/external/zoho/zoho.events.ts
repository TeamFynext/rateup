import prisma from "../../../../utils/prisma.js";
import { integrationTriggerQueue } from "../../../../workers/bullmq/queues/index.js";
import { LEADS_PIPELINE_TYPE } from "../../../pipeline/pipelineTypes.js";
import type {
  ContactRecord,
  IntegrationEvent,
  IntegrationEventOf,
} from "../../events/integrationEvent.types.js";
import type { IntegrationEventContext } from "../../providers/integrationProvider.types.js";
import { pushCrmLeadStatus, ZohoTriggers } from "./zoho.service.js";
import {
  addZohoContactToQueue,
  buildZohoContactPayload,
  buildZohoLeadPayload,
} from "./zoho.utils.js";

/**
 * Translates Rateup's integration events into the Zoho CRM / Bigin jobs that
 * `processZoho` runs.
 *
 * The jobs and payloads are exactly what the contact and lead services used to
 * enqueue themselves; only who builds them moved. `processZoho` still decides
 * per trigger whether the org subscribed to it.
 */
export async function handleZohoEvent(event: IntegrationEvent, { orgId }: IntegrationEventContext) {
  switch (event.type) {
    case "contact.created":
      return onContactCreated(orgId, event);
    case "contact.updated":
      return onContactUpdated(orgId, event);
    case "contact.deleted":
      return onContactDeleted(orgId, event);
    case "lead.created":
    case "lead.stage_changed":
      return onLeadStage(orgId, event);
    default:
      return;
  }
}

function integrationIdsOf(contact: { integrationIds?: unknown }) {
  return (contact.integrationIds as ContactIntegrationIds | null | undefined) ?? {};
}

/** The Bigin deal fields, from whichever record the event carries. */
function biginDealData(contact: ContactRecord) {
  return {
    name: contact.name,
    source: contact.source,
    email: contact.email,
    phone: contact.phone,
    notes: contact.notes,
    lifecycleId: contact.lifecycleId,
  };
}

async function onContactCreated(orgId: string, event: IntegrationEventOf<"contact.created">) {
  const { contact, lifecycleName } = event;

  // A Zoho contact and a Bigin contact.
  await addZohoContactToQueue(contact, orgId);

  await integrationTriggerQueue.add("zoho-lead-create", {
    integrationName: "zoho",
    triggerKey: ZohoTriggers.LEAD_CREATE,
    orgId,
    data: buildZohoLeadPayload({ ...contact, leadStatus: lifecycleName }),
    rateupContactId: contact.id,
  });

  if (contact.lifecycleId) {
    await integrationTriggerQueue.add("bigin-deal-create", {
      integrationName: "zoho",
      triggerKey: ZohoTriggers.BIGIN_DEAL_CREATE,
      orgId,
      data: biginDealData(contact),
      rateupContactId: contact.id,
    });
  }
}

async function onContactUpdated(orgId: string, event: IntegrationEventOf<"contact.updated">) {
  const { contact, changed } = event;
  const ids = integrationIdsOf(contact);
  const details = changed.includes("details");

  if (details) {
    await integrationTriggerQueue.add("zoho-contact-update", {
      integrationName: "zoho",
      triggerKey: ZohoTriggers.CONTACT_UPDATE,
      orgId,
      data: {
        zohoContactId: ids.zoho?.contact?.id,
        ...buildZohoContactPayload(contact),
      },
    });
    await integrationTriggerQueue.add("zoho-bigin-contact-update", {
      integrationName: "zoho",
      triggerKey: ZohoTriggers.BIGIN_CONTACT_UPDATE,
      orgId,
      data: {
        biginContactId: ids.bigin?.contact?.id,
        ...buildZohoContactPayload(contact),
      },
    });
  }

  if (!changed.includes("lifecycle") || !contact.lifecycleId) return;

  // The lifecycle is reported rather than written straight into `Lead_Status`:
  // the org's mapping decides which Zoho status it means.
  const zohoLeadId = ids.zoho?.lead?.id;
  if (zohoLeadId) {
    const lifecycle = await prisma.lifecycle.findUnique({
      where: { id: contact.lifecycleId },
      select: { name: true },
    });
    if (lifecycle) {
      // A details change rides along, minus the status the mapping governs.
      const { Lead_Status: _mapped, ...payload } = buildZohoLeadPayload(contact);
      await pushCrmLeadStatus(
        orgId,
        zohoLeadId,
        { lifecycleId: contact.lifecycleId, lifecycleName: lifecycle.name },
        details ? payload : {},
      );
    }
  }

  await integrationTriggerQueue.add("zoho-bigin-deal-update", {
    integrationName: "zoho",
    triggerKey: ZohoTriggers.BIGIN_DEAL_CREATE,
    orgId,
    data: biginDealData(contact),
    rateupContactId: contact.id,
  });
}

async function onContactDeleted(orgId: string, event: IntegrationEventOf<"contact.deleted">) {
  const ids = integrationIdsOf(event.contact);

  // Queued even when the contact was never mirrored; `processZoho` skips a
  // delete with no id.
  await integrationTriggerQueue.add("zoho-contact-delete", {
    integrationName: "zoho",
    triggerKey: ZohoTriggers.CONTACT_DELETE,
    orgId,
    data: { zohoContactId: ids.zoho?.contact?.id },
  });
  await integrationTriggerQueue.add("zoho-bigin-contact-delete", {
    integrationName: "zoho",
    triggerKey: ZohoTriggers.BIGIN_CONTACT_DELETE,
    orgId,
    data: { biginContactId: ids.bigin?.contact?.id },
  });
}

/**
 * The outbound half of the Zoho stage mapping: the board column drives the CRM
 * lead status and the Bigin deal stage.
 *
 * A lead with no contact still syncs. It carries its own name, phone and email,
 * which is everything Bigin needs; only `rateupContactId` is omitted, so the deal
 * is matched by the lead instead.
 */
async function onLeadStage(
  orgId: string,
  event: IntegrationEventOf<"lead.created" | "lead.stage_changed">,
) {
  const { lead, stage, contact, origin } = event;
  // Zoho made this change itself; pushing it back would loop.
  if (origin === "integration") return;
  // The stage mappings are about the sales funnel alone.
  if (stage.pipelineType !== LEADS_PIPELINE_TYPE) return;

  // Through the org's mapping, not the column's own name: `Lead_Status` is a
  // Zoho picklist, so a column the org did not map is a value the CRM rejects.
  const zohoLeadId = contact ? integrationIdsOf(contact).zoho?.lead?.id : undefined;
  if (zohoLeadId) {
    await pushCrmLeadStatus(
      orgId,
      zohoLeadId,
      { stageId: stage.id, stageName: stage.name },
      {},
      // So the CRM push lands on this lead's timeline.
      lead.id,
    );
  }

  await integrationTriggerQueue.add("zoho-bigin-deal-update", {
    integrationName: "zoho",
    triggerKey: ZohoTriggers.BIGIN_DEAL_CREATE,
    orgId,
    data: {
      name: contact?.name ?? lead.name,
      source: contact?.source ?? lead.source,
      email: contact?.email ?? lead.email,
      phone: contact?.phone ?? lead.phone,
      notes: contact?.notes ?? null,
      stageId: stage.id,
    },
    // The handler keeps the Bigin ids on the contact when there is one and falls
    // back to the lead for board-only cards, so the same deal is matched and
    // moved rather than recreated.
    rateupLeadId: lead.id,
    ...(contact && { rateupContactId: contact.id }),
  });
}
