import { timingSafeEqual } from "node:crypto";

import type { Integration, Prisma } from "../../../../../generated/prisma/client.js";
import prisma from "../../../../utils/prisma.js";
import { log } from "../../../../utils/logger.js";
import { IntegratedApps } from "../../../../types/enums.js";
import { integrationTriggerQueue } from "../../../../workers/bullmq/queues/index.js";
import {
  moveLead,
  resolvePipelineForContact,
  setContactStage,
} from "../../../pipeline/pipelineLead/lead.service.js";
import { LEADS_PIPELINE_TYPE } from "../../../pipeline/pipelineTypes.js";
import type { ProviderJobData } from "../../providers/integrationProvider.types.js";
import {
  InboundWebhookRejected,
  type InboundWebhookRequest,
} from "../../shared/inboundWebhookContract.js";
import { getValidZohoAccessToken } from "./zoho.auth.js";
import { getZohoRecordById } from "./zoho.client.js";
import { isZohoTriggerEnabled } from "./zoho.utils.js";
import {
  getZohoCredential,
  ZOHO_INBOUND,
  ZohoTriggers,
  type ZohoCredential,
  type ZohoInboundJobData,
  type ZohoProductName,
  type ZohoRecord,
  type ZohoWebhookPayload,
} from "./zoho.types.js";

/**
 * Zoho → Rateup. Zoho notifies the integration's address on the shared
 * receiver when a subscribed record changes; {@link handleZohoInbound} checks
 * the notification and queues it, and {@link processZohoInboundJob} fetches the
 * record and applies it — so Zoho gets its 200 quickly, and a sync that fails
 * is retried rather than lost.
 */

/** The switch that governs each module's inbound sync, per product. */
const INBOUND_TRIGGER: Record<ZohoProductName, Record<string, ZohoTriggers>> = {
  crm: { Contacts: ZohoTriggers.CONTACT_WEBHOOK, Leads: ZohoTriggers.LEAD_WEBHOOK },
  bigin: { Contacts: ZohoTriggers.BIGIN_CONTACT_WEBHOOK, Deals: ZohoTriggers.BIGIN_DEAL_WEBHOOK },
};

/** Where each module's record id is kept on a Rateup contact. */
const LINK_PATH: Record<ZohoProductName, Record<string, string[]>> = {
  crm: { Contacts: ["zoho", "contact", "id"], Leads: ["zoho", "lead", "id"] },
  bigin: { Contacts: ["bigin", "contact", "id"], Deals: ["bigin", "deal", "id"] },
};

/** Which of the integration's channels a notification came in on. */
function productOfChannel(
  credential: ZohoCredential,
  channelId: unknown,
): ZohoProductName | undefined {
  if (channelId === undefined || channelId === null) return undefined;
  const id = String(channelId);
  if (credential.crmWebhook?.channelId === id) return "crm";
  if (credential.biginWebhook?.channelId === id) return "bigin";
  return undefined;
}

function tokenMatches(given: string, expected: string | undefined) {
  if (!expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The provider's `handleInbound`. Zoho authenticates a notification with the
 * token the channel was registered with, so a wrong one is refused; the
 * channel id says which product it is about.
 *
 * Deletes are ignored: there is no record left to fetch, and Rateup has never
 * removed a contact because Zoho did.
 */
export async function handleZohoInbound(integration: Integration, request: InboundWebhookRequest) {
  const payload = (request.body ?? {}) as ZohoWebhookPayload;
  const credential = getZohoCredential(integration);

  // `token` is the shared webhook secret — everything else is safe to show.
  // Printed before the checks below so a rejected notification is still
  // visible; that is usually the one you want to look at.
  const { token, ...notification } = payload;
  log.info("Zoho webhook in => %s", JSON.stringify(notification));

  if (!token || !tokenMatches(token, credential.zohoWebhookSecret)) {
    throw new InboundWebhookRejected("token mismatch");
  }
  const product = productOfChannel(credential, payload.channel_id);
  if (!product) throw new InboundWebhookRejected("unknown channel");

  // Bigin's deals module is "Pipelines" by API name; the channel subscribes to it
  // as "Deals", and a notification may name it either way.
  const module =
    product === "bigin" && payload.module === "Pipelines" ? "Deals" : (payload.module ?? "");
  const trigger = INBOUND_TRIGGER[product][module];
  if (!trigger) {
    log.warn("Unsupported Zoho %s module => %s", product, module);
    return;
  }
  if (payload.operation === "delete") return;
  // Checked again when the job runs; this only saves fetching a record nobody wants.
  if (!isZohoTriggerEnabled(credential, trigger)) {
    log.info("Zoho trigger disabled => %s", trigger);
    return;
  }

  for (const recordId of payload.ids ?? []) {
    await integrationTriggerQueue.add(`zoho-inbound-${product}-${module}`, {
      integrationName: IntegratedApps.zoho,
      triggerKey: ZOHO_INBOUND,
      orgId: integration.orgId ?? "",
      data: { product, module, recordId: String(recordId) },
    } satisfies ProviderJobData<ZohoInboundJobData>);
  }
}

/**
 * The integration a notification belongs to, from its channel id. Only the
 * old receiver needs it: its address does not carry the integration's id.
 */
export function findIntegrationByZohoChannel(channelId: string) {
  const normalizedChannelId = String(channelId);
  return prisma.integration.findFirst({
    where: {
      name: IntegratedApps.zoho,
      active: true,
      OR: [
        { credential: { path: ["crmWebhook", "channelId"], equals: normalizedChannelId } },
        { credential: { path: ["biginWebhook", "channelId"], equals: normalizedChannelId } },
      ],
    },
  });
}

/** Fetches the record a notification named and syncs it onto its Rateup contact. */
export async function processZohoInboundJob(
  integration: Integration,
  job: ProviderJobData<ZohoInboundJobData>,
) {
  const { product, module, recordId } = job.data;
  const credential = getZohoCredential(integration);
  const accessToken = await getValidZohoAccessToken(integration);

  const response = await getZohoRecordById(
    accessToken,
    module,
    recordId,
    credential.api_domain,
    product,
  );
  const record: ZohoRecord | undefined = response.data?.[0];

  await syncContactFromZohoRecord({
    orgId: job.orgId,
    product,
    module,
    zohoRecord: record ?? {},
    credential,
  });
}

export async function syncContactFromZohoRecord({
  orgId,
  product,
  module,
  zohoRecord,
  credential,
}: {
  orgId: string;
  product: ZohoProductName;
  module: string;
  zohoRecord: ZohoRecord;
  /** Only the lifecycle-mapping config and the trigger list are read here. */
  credential: Pick<ZohoCredential, "crm" | "bigin" | "triggerSubscriptions">;
}) {
  // The fields that decide what happens next, so a sync that does nothing can be
  // read without turning on trace for the whole record.
  log.info(
    "Zoho record => %s/%s id=%s stage=%s leadStatus=%s name=%s",
    product,
    module,
    zohoRecord.id,
    zohoRecord.Stage ?? "-",
    zohoRecord.Lead_Status ?? "-",
    zohoRecord.Deal_Name ?? zohoRecord.Full_Name ?? "-",
  );

  const requiredTrigger = INBOUND_TRIGGER[product]?.[module];
  if (requiredTrigger && !isZohoTriggerEnabled(credential, requiredTrigger)) {
    log.info("Zoho trigger disabled => %s", requiredTrigger);
    return null;
  }

  const existingContact = await prisma.contact.findFirst({
    where: {
      orgId,
      integrationIds: {
        path: LINK_PATH[product]?.[module] ?? [],
        equals: zohoRecord.id,
      },
    },
    include: {
      Lifecycle: true,
    },
  });

  if (!existingContact) {
    // A deal opened for a board-only lead keeps its Bigin ids on the lead, since
    // there is no contact to hold them. Nothing on the contact side can match it,
    // so the lead is moved directly.
    if (product === "bigin" && module === "Deals") {
      const handled = await applyInboundStageToLead(
        orgId,
        String(zohoRecord.id),
        typeof zohoRecord.Stage === "string" ? zohoRecord.Stage : undefined,
        credential,
      );
      if (handled) return null;
    }

    log.warn("No contact found for Zoho record => %s", zohoRecord.id);
    return null;
  }

  const updateData: Prisma.ContactUncheckedUpdateInput = {};

  if (module === "Contacts" || module === "Leads") {
    updateData.name = zohoRecord.Full_Name || null;
    updateData.email = zohoRecord.Email || null;
    updateData.phone = zohoRecord.Phone || zohoRecord.Mobile || null;
    updateData.other = zohoRecord.Description || null;
    updateData.source = zohoRecord.Lead_Source || null;
    updateData.external_id = zohoRecord.id;
    updateData.profilePic = zohoRecord.Record_Image || null;
    updateData.dob = zohoRecord.Date_of_Birth ? new Date(zohoRecord.Date_of_Birth) : null;
  }

  // Which pipeline column Zoho is telling us this contact is on. Applied after
  // the contact row is written, because the stage lives on a lead rather than on
  // the contact.
  let inboundStageId: string | undefined;

  if (product === "crm" && module === "Leads") {
    const leadStatus = zohoRecord.Lead_Status;
    const mappings = credential?.crm?.leadLifecycleMappings || [];
    const matchedMapping = mappings.find((m) => m.zohoLeadStatus === leadStatus);
    if (matchedMapping?.stageId) {
      inboundStageId = matchedMapping.stageId;
      log.info("Mapped CRM lead status %s to column %s", leadStatus, matchedMapping.stageName);
    } else {
      log.warn("CRM lead status %s maps to no column; leaving the lead where it is", leadStatus);
    }
  }

  if (product === "bigin" && module === "Deals") {
    const stageName = zohoRecord.Stage;
    const mappings = credential?.bigin?.pipeline?.lifecycleStageMappings || [];
    const matchedMapping = mappings.find((m) => m.biginStageName === stageName);
    if (matchedMapping?.stageId) {
      inboundStageId = matchedMapping.stageId;
      log.info("Mapped Bigin stage %s to column %s", stageName, matchedMapping.stageName);
    } else {
      // The quiet failure worth seeing: the webhook arrived and was understood,
      // but the Bigin stage is not one the org mapped, so nothing moves.
      log.warn("Bigin stage %s maps to no column; leaving the lead where it is", stageName);
    }
  }

  const updatedContact = await prisma.contact.update({
    where: {
      id: existingContact.id,
    },
    data: updateData,
  });

  if (inboundStageId) {
    await applyInboundStage(updatedContact.orgId, updatedContact.id, inboundStageId);
  }

  log.info("Synced contact from Zoho");
  return updatedContact;
}

/**
 * Moves a board-only lead when its Bigin deal changes stage.
 *
 * The contact-side lookup cannot find these: the deal id lives on the lead, so
 * without this a Bigin stage change on such a deal was silently dropped.
 *
 * `moveLead(..., false)` for the same reason as everywhere else inbound —
 * moving the lead here must not push the move straight back to Bigin.
 *
 * Returns whether a lead was found, so the caller can tell "handled" from
 * "nothing in Rateup matches this record".
 */
async function applyInboundStageToLead(
  orgId: string,
  biginDealId: string,
  biginStageName: string | undefined,
  // Only the mapping is read here, so the narrower shape the webhook path has is
  // enough — it does not carry the OAuth fields.
  credential: Pick<ZohoCredential, "bigin">,
): Promise<boolean> {
  const lead = await prisma.lead.findFirst({
    where: {
      pipeline: { orgId, type: LEADS_PIPELINE_TYPE },
      integrationIds: { path: ["bigin", "deal", "id"], equals: biginDealId },
    },
    select: { id: true, stageId: true },
  });
  if (!lead) return false;

  const mappings = credential?.bigin?.pipeline?.lifecycleStageMappings || [];
  const stageId = mappings.find((m) => m.biginStageName === biginStageName)?.stageId;
  if (!stageId) {
    log.info("Bigin stage %s maps to no column; leaving the lead where it is", biginStageName);
    return true;
  }
  if (stageId === lead.stageId) return true;

  await moveLead(lead.id, stageId, null, false);
  log.info("Moved a board-only lead from its Bigin deal");
  return true;
}

/**
 * Puts a contact on the column Zoho named. `syncIntegrations: false` is the
 * important half: without it the resulting move would enqueue an outbound update
 * back to Zoho, which would come back as another webhook, and so on.
 *
 * A mapping naming a column that has since been deleted resolves to nothing and
 * is skipped, the same way an unmapped status is.
 */
async function applyInboundStage(orgId: string, contactId: string, stageId: string) {
  const pipelineId = await resolvePipelineForContact(orgId);
  if (!pipelineId) return;

  await setContactStage({
    contactId,
    pipelineId,
    stageId,
    source: "MANUAL",
    channel: "NONE",
    syncIntegrations: false,
  });
}
