import axios from "axios";

import prisma from "../../../../utils/prisma.js";
import { log } from "../../../../utils/logger.js";
import { recordIntegrationSyncActivity } from "../integrationActivity.js";
import { createZohoRecord, deleteZohoRecord, updateZohoRecord } from "./zoho.client.js";
import {
  findBiginStageMapping,
  isStaleContactLinkError,
  isStaleRecordIdError,
  ZohoTriggers,
  type ZohoBiginDealPayload,
  type ZohoJobContext,
  type ZohoRecord,
  type ZohoTriggerData,
} from "./zoho.types.js";

/**
 * Zoho Bigin, outbound: contacts, and the deal that follows a lead across the
 * board. Zoho CRM's half is `zoho.crm.ts`.
 */

export const ZOHO_BIGIN_TRIGGERS: readonly string[] = [
  ZohoTriggers.BIGIN_CONTACT_CREATE,
  ZohoTriggers.BIGIN_CONTACT_UPDATE,
  ZohoTriggers.BIGIN_CONTACT_DELETE,
  ZohoTriggers.BIGIN_DEAL_CREATE,
];

/**
 * Where a trigger's Bigin ids live.
 *
 * The contact wins whenever there is one — that is where the lifecycle flow kept
 * them and where the rest of the app looks. A lead added straight on the board
 * has no contact, so it holds its own; without that it would open a fresh deal
 * on every stage change instead of moving the one it already has.
 */
interface BiginIdHolder {
  kind: "contact" | "lead";
  id: string;
}

function resolveBiginIdHolder(
  rateupContactId?: string,
  rateupLeadId?: string,
): BiginIdHolder | null {
  if (rateupContactId) return { kind: "contact", id: rateupContactId };
  if (rateupLeadId) return { kind: "lead", id: rateupLeadId };
  return null;
}

async function readBiginIds(holder: BiginIdHolder | null): Promise<ContactIntegrationIds> {
  if (!holder) return {};
  const row =
    holder.kind === "contact"
      ? await prisma.contact.findUnique({
          where: { id: holder.id },
          select: { integrationIds: true },
        })
      : await prisma.lead.findUnique({
          where: { id: holder.id },
          select: { integrationIds: true },
        });
  return (row?.integrationIds as ContactIntegrationIds | null) ?? {};
}

/**
 * Drops a Bigin id that Bigin no longer recognises, so the next sync recreates
 * the record instead of failing on the same dead reference forever.
 */
async function forgetBiginId(holder: BiginIdHolder | null, which: "contact" | "deal") {
  if (!holder) return;
  const existing = await readBiginIds(holder);
  if (!existing.bigin?.[which]?.id) return;

  const { [which]: _gone, ...restOfBigin } = existing.bigin;
  const integrationIds = { ...existing, bigin: restOfBigin };

  if (holder.kind === "contact") {
    await prisma.contact.update({ where: { id: holder.id }, data: { integrationIds } });
  } else {
    await prisma.lead.update({ where: { id: holder.id }, data: { integrationIds } });
  }
}

/** Merges into `bigin` rather than replacing it, so contact and deal ids coexist. */
async function writeBiginIds(
  holder: BiginIdHolder | null,
  patch: { contactId?: string; dealId?: string },
) {
  if (!holder) return;
  const existing = await readBiginIds(holder);
  const integrationIds = {
    ...existing,
    bigin: {
      ...existing.bigin,
      ...(patch.contactId && { contact: { ...existing.bigin?.contact, id: patch.contactId } }),
      ...(patch.dealId && { deal: { ...existing.bigin?.deal, id: patch.dealId } }),
    },
  };

  if (holder.kind === "contact") {
    await prisma.contact.update({ where: { id: holder.id }, data: { integrationIds } });
  } else {
    await prisma.lead.update({ where: { id: holder.id }, data: { integrationIds } });
  }
}

/** Runs one of the {@link ZOHO_BIGIN_TRIGGERS} jobs. */
export async function processZohoBiginJob(
  context: ZohoJobContext,
  triggerKey: string,
  data: ZohoTriggerData,
) {
  const { credential, accessToken, rateupContactId } = context;

  switch (triggerKey) {
    case ZohoTriggers.BIGIN_CONTACT_CREATE: {
      log.info("Bigin contact create payload");

      const contactPayload = {
        ...data,
        ...(credential?.bigin?.biginOwner ? { Owner: { id: credential.bigin.biginOwner } } : {}),
      };

      const response = await createZohoRecord(
        accessToken,
        "Contacts",
        contactPayload,
        credential.api_domain,
        "bigin",
      );

      log.info("Bigin contact created successfully");

      if (response?.data && Array.isArray(response.data) && response.data[0]) {
        const biginContactId = response.data[0].details?.id;
        if (biginContactId && rateupContactId) {
          await writeBiginIds(
            { kind: "contact", id: rateupContactId },
            { contactId: biginContactId },
          );
          log.info("Updated contact with Bigin Contact ID ");
        }
      }
      return;
    }

    case ZohoTriggers.BIGIN_CONTACT_UPDATE: {
      const { biginContactId, ...payload } = data;

      if (!biginContactId) {
        log.warn("No Bigin contact id found for update");
        return;
      }

      await updateZohoRecord(
        accessToken,
        "Contacts",
        biginContactId,
        payload,
        credential.api_domain,
        "bigin",
      );

      log.info("Bigin contact updated successfully");
      return;
    }

    case ZohoTriggers.BIGIN_CONTACT_DELETE: {
      const biginContactId = data.biginContactId;

      if (!biginContactId) {
        log.warn("No Bigin contact id found");
        return;
      }

      await deleteZohoRecord(
        accessToken,
        "Contacts",
        biginContactId,
        credential.api_domain,
        "bigin",
      );
      log.info("Bigin contact deleted successfully");
      return;
    }

    case ZohoTriggers.BIGIN_DEAL_CREATE:
      return syncBiginDeal(context, data);

    default:
      throw new Error(`Unsupported Zoho Bigin trigger ${triggerKey}`);
  }
}

/**
 * Creates or moves the Bigin deal for a contact or board lead, on the stage its
 * column maps to.
 */
async function syncBiginDeal(
  { credential, accessToken, rateupContactId, rateupLeadId }: ZohoJobContext,
  data: ZohoTriggerData,
) {
  const triggerSubscriptions = credential.triggerSubscriptions || [];
  const biginConfig = credential?.bigin?.pipeline;

  if (!biginConfig) {
    log.warn("No Bigin pipeline config found");
    await recordIntegrationSyncActivity(rateupLeadId, "INTEGRATION_SKIPPED", "Zoho Bigin", {
      skipReason: "NOT_CONFIGURED",
    });
    return;
  }

  const mappings = biginConfig?.lifecycleStageMappings || [];

  const mapping = findBiginStageMapping(mappings, data);

  if (!mapping) {
    log.warn(
      "No Bigin stage mapping found for stage=%s lifecycle=%s",
      data.stageId,
      data.lifecycleId,
    );
  }

  const idHolder = resolveBiginIdHolder(rateupContactId, rateupLeadId);
  const storedIds = await readBiginIds(idHolder);

  let existingDealId: string | undefined = data.biginDealId || storedIds.bigin?.deal?.id;
  let biginContactId: string | undefined = storedIds.bigin?.contact?.id;

  const payload: ZohoBiginDealPayload = {
    Deal_Name: data.name || data.email || data.phone,
    Lead_Source: data.source || "Rateup",
    Layout: {
      id: biginConfig?.selectedPipeline?.id,
    },
    Pipeline: biginConfig?.selectedPipeline?.name,
    Sub_Pipeline: biginConfig?.selectedSubPipeline?.name,
    Stage: mapping?.biginStageName,
  };

  // DYNAMIC REQUIRED FIELD MAPPINGS
  const requiredFieldMappings = biginConfig?.requiredFieldMappings || {};

  Object.entries(requiredFieldMappings).forEach(([fieldApiName, value]) => {
    // DATE FIELD HANDLING
    if (fieldApiName === "Closing_Date") {
      const days = Number(value);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      payload[fieldApiName] = futureDate.toISOString().split("T")[0];
    } else {
      payload[fieldApiName] = value;
    }
  });

  if (biginContactId) {
    payload.Contact_Name = {
      id: biginContactId,
    };
  }

  if (credential?.bigin?.biginOwner) {
    payload.Owner = { id: credential.bigin.biginOwner };
  }

  // Bigin makes Contact_Name mandatory on a deal, so a deal always needs a
  // contact behind it. One is created when there is none — or when the one
  // we had turns out to be deleted, further down.
  const createContactEnabled = triggerSubscriptions.some(
    (s) => s.subscribed_field === ZohoTriggers.BIGIN_CONTACT_CREATE && s.active,
  );

  const createBiginContact = async () => {
    const contactPayload: ZohoRecord = {};

    const nameVal = data.name || data.Full_Name || data.fullName || "";
    if (nameVal) {
      const parts = String(nameVal).trim().split(" ").filter(Boolean);
      // SINGLE WORD NAME
      if (parts.length === 1) {
        contactPayload.Last_Name = parts[0];
      } else {
        contactPayload.First_Name = parts.shift() || "";
        contactPayload.Last_Name = parts.join(" ");
      }
    } else {
      // FALLBACK
      contactPayload.Last_Name = data.phone || "Unknown";
    }

    contactPayload.Email = data.email || data.Email || "";
    contactPayload.Phone = data.phone || data.Phone || "";
    if (credential?.bigin?.biginOwner) {
      contactPayload.Owner = { id: credential.bigin.biginOwner };
    }

    const contactResponse = await createZohoRecord(
      accessToken,
      "Contacts",
      contactPayload,
      credential.api_domain,
      "bigin",
    );

    const createdContactId = Array.isArray(contactResponse?.data)
      ? contactResponse.data[0]?.details?.id
      : undefined;
    if (!createdContactId) return undefined;

    biginContactId = createdContactId;
    payload.Contact_Name = { id: createdContactId };
    await writeBiginIds(idHolder, { contactId: createdContactId });
    if (idHolder) log.info("Linked Bigin contact to the Rateup %s", idHolder.kind);
    return createdContactId;
  };

  if (!biginContactId && createContactEnabled) {
    try {
      await createBiginContact();
    } catch (err) {
      log.error({ err }, "Failed creating Bigin contact before deal create");
    }
  }

  let response: Awaited<ReturnType<typeof createZohoRecord>> | undefined;

  const writeDeal = () =>
    existingDealId
      ? updateZohoRecord(
          accessToken,
          "Pipelines",
          existingDealId,
          payload,
          credential.api_domain,
          "bigin",
        )
      : createZohoRecord(accessToken, "Pipelines", payload, credential.api_domain, "bigin");

  // Records deleted in Bigin leave dead ids here, and Bigin rejects the write
  // because of them — so a stage change would be lost over a record the user
  // tidied away months ago. Each dead reference is dropped and the write
  // retried: a missing deal becomes a new one, a missing contact link is left
  // off. Both can be dead at once, hence a loop rather than a single retry;
  // it is bounded by the number of remedies, and each one is applied at most
  // once because forgetting the id also removes the condition that triggers it.
  for (let remediesLeft = 2; ; remediesLeft--) {
    try {
      response = await writeDeal();
      log.info(existingDealId ? "Bigin deal updated" : "Bigin deal created");
      break;
    } catch (error) {
      if (remediesLeft > 0 && existingDealId && isStaleRecordIdError(error)) {
        log.warn("Bigin no longer has that deal; creating a new one");
        await forgetBiginId(idHolder, "deal");
        existingDealId = undefined;
        continue;
      }

      // Contact_Name is mandatory on a Bigin deal, so a dead contact link
      // cannot simply be dropped — the deal would be refused for a missing
      // field instead. The dead id is forgotten and a fresh contact created
      // to put in its place.
      if (remediesLeft > 0 && payload.Contact_Name && isStaleContactLinkError(error)) {
        log.warn("Bigin no longer has that contact; creating a new one");
        delete payload.Contact_Name;
        biginContactId = undefined;
        await forgetBiginId(idHolder, "contact");

        if (!createContactEnabled) {
          log.error(
            "Cannot recreate the Bigin contact: the bigin_contact_created trigger is off, " +
              "and Bigin requires a contact on every deal",
          );
          throw error;
        }

        await createBiginContact();
        continue;
      }

      log.error(
        "Bigin API error => %s",
        JSON.stringify(axios.isAxiosError(error) ? error.response?.data : error),
      );
      throw error;
    }
  }

  // Remember the new deal, so the next stage change moves this one rather
  // than opening another.
  const wasCreate = !existingDealId;
  let syncedDealId = existingDealId;
  if (!existingDealId && response?.data && Array.isArray(response.data) && response.data[0]) {
    const dealId = response.data[0]?.details?.id;

    if (dealId) {
      syncedDealId = dealId;
      await writeBiginIds(idHolder, { dealId });
      if (idHolder) log.info("Stored the Bigin deal id on the Rateup %s", idHolder.kind);
    }
  }

  // An unmapped column still writes the deal, just with no Stage — the same
  // user-facing outcome as GetLead refusing a status, so it reads the same on
  // the timeline: synced, but the stage did not follow.
  await recordIntegrationSyncActivity(rateupLeadId, "INTEGRATION_SYNCED", "Zoho Bigin", {
    ...(syncedDealId && { externalId: syncedDealId }),
    externalCreated: wasCreate,
    ...(!mapping && { statusRejected: true }),
    ...(mapping?.biginStageName && { toStageName: mapping.biginStageName }),
  });
}
