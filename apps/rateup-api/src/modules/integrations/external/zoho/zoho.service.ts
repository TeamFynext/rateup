import { integrationTriggerQueue } from "../../../../workers/bullmq/queues/index.js";
import prisma from "../../../../utils/prisma.js";
import { log } from "../../../../utils/logger.js";
import axios from "axios";
import {
  createZohoRecord,
  deleteZohoRecord,
  getZohoFieldMetadata,
  getZohoLayoutsMetadata,
  getZohoRecords,
  registerZohoWebhook,
  unsubscribeZohoWebhook,
  updateZohoRecord,
  ZohoProduct,
} from "./zoho.client.js";
import { isZohoTriggerEnabled } from "./zoho.utils.js";
import { recordIntegrationSyncActivity } from "../integrationActivity.js";
import { IntegratedApps } from "../../../../types/enums.js";
import {
  findBiginStageMapping,
  getZohoCredential,
  isStaleContactLinkError,
  isStaleRecordIdError,
  resolveCrmLeadStatus,
} from "./zoho.types.js";
import {
  moveLead,
  resolvePipelineForContact,
  setContactStage,
} from "../../../pipeline/pipelineLead/lead.service.js";
import { Prisma } from "../../../../../generated/prisma/client.js";
import type {
  StageMappingKey,
  ZohoBiginDealPayload,
  ZohoCredential,
  ZohoFieldMeta,
  ZohoLayoutMeta,
  ZohoLayoutSection,
  ZohoPickListValue,
  ZohoRecord,
  ZohoTriggerData,
  ZohoUser,
} from "./zoho.types.js";
import type { Integration } from "../../../../../generated/prisma/client.js";

export enum ZohoTriggers {
  CONTACT_CREATE = "contact_created",
  CONTACT_UPDATE = "contact_updated",
  CONTACT_DELETE = "contact_deleted",
  CONTACT_WEBHOOK = "contact_webhook",
  LEAD_WEBHOOK = "lead_webhook",
  LEAD_UPDATE = "lead_updated",
  LEAD_CREATE = "lead_created",
  BIGIN_CONTACT_CREATE = "bigin_contact_created",
  BIGIN_CONTACT_UPDATE = "bigin_contact_updated",
  BIGIN_CONTACT_DELETE = "bigin_contact_deleted",
  BIGIN_DEAL_CREATE = "bigin_deal_created",
  BIGIN_CONTACT_WEBHOOK = "bigin_contact_webhook",
  BIGIN_DEAL_WEBHOOK = "bigin_deal_webhook",
}

export interface ZohoPayload {
  trigger: ZohoTriggers;
  data: Record<string, unknown>;
  orgId: string;
  timestamp: string;
}

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

/**
 * Handles one queued Zoho trigger. Reached through `processIntegration` in
 * `../integrationDispatch.ts`, which owns the provider routing.
 */
export async function processZoho(
  integration: Integration,
  triggerKey: string,
  data: ZohoTriggerData,
  orgId: string,
  rateupContactId?: string,
  rateupLeadId?: string,
) {
  const credential = getZohoCredential(integration);
  const triggerSubscriptions = credential.triggerSubscriptions || [];
  const isSubscribed = triggerSubscriptions.some(
    (subscription) => subscription.subscribed_field === triggerKey && subscription.active,
  );

  if (!isSubscribed) {
    log.info("Zoho trigger %s is not subscribed", triggerKey);

    return;
  }
  const accessToken = await getValidZohoAccessToken(integration);
  log.info("Processing Zoho trigger=%s", triggerKey);

  switch (triggerKey) {
    case ZohoTriggers.CONTACT_CREATE: {
      log.info("Zoho create payload => %o", data);
      const response = await createZohoRecord(accessToken, "Contacts", data, credential.api_domain);
      log.info("Zoho contact created successfully");

      // Extract the Zoho contact ID from response and update Rateup contact
      if (response?.data && Array.isArray(response.data) && response.data[0]) {
        const zohoContactData = response.data[0];
        const zohoContactId = zohoContactData.details?.id;

        if (zohoContactId && rateupContactId) {
          // Update the Rateup contact with the Zoho contact ID
          const existingContact = await prisma.contact.findUnique({
            where: {
              id: rateupContactId,
            },
            select: {
              integrationIds: true,
            },
          });

          const existingIntegrationIds =
            (existingContact?.integrationIds as ContactIntegrationIds | null) ?? {};
          await prisma.contact.update({
            where: {
              id: rateupContactId,
            },
            data: {
              integrationIds: {
                ...existingIntegrationIds,
                zoho: {
                  ...existingIntegrationIds.zoho,
                  contact: {
                    ...existingIntegrationIds.zoho?.contact,
                    id: zohoContactId,
                  },
                },
              },
            },
          });
          log.info("Updated contact with Zoho ID ");
        }
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

      if (response?.data && Array.isArray(response.data) && response.data[0]) {
        const zohoLeadData = response.data[0];
        const zohoLeadId = zohoLeadData.details?.id;

        if (zohoLeadId && rateupContactId) {
          const existingContact = await prisma.contact.findUnique({
            where: {
              id: rateupContactId,
            },
            select: {
              integrationIds: true,
            },
          });

          const existingIntegrationIds =
            (existingContact?.integrationIds as ContactIntegrationIds | null) ?? {};
          await prisma.contact.update({
            where: {
              id: rateupContactId,
            },
            data: {
              integrationIds: {
                ...existingIntegrationIds,
                zoho: {
                  ...existingIntegrationIds.zoho,
                  lead: {
                    id: zohoLeadId,
                  },
                },
              },
            },
          });

          log.info("Updated contact with Zoho Lead ID");
        }
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
        const biginContactData = response.data[0];
        const biginContactId = biginContactData.details?.id;
        if (biginContactId && rateupContactId) {
          const existingContact = await prisma.contact.findUnique({
            where: {
              id: rateupContactId,
            },
            select: {
              integrationIds: true,
            },
          });

          const existingIntegrationIds =
            (existingContact?.integrationIds as ContactIntegrationIds | null) ?? {};
          await prisma.contact.update({
            where: {
              id: rateupContactId,
            },
            data: {
              integrationIds: {
                ...existingIntegrationIds,
                bigin: {
                  ...existingIntegrationIds.bigin,
                  contact: {
                    ...existingIntegrationIds.bigin?.contact,
                    id: biginContactId,
                  },
                },
              },
            },
          });

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

    case ZohoTriggers.BIGIN_DEAL_CREATE: {
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
      const createContactEnabled = (triggerSubscriptions || []).some(
        (s) => s.subscribed_field === "bigin_contact_created" && s.active,
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
      return;
    }
    default:
      throw new Error(`Unsupported Zoho trigger ${triggerKey}`);
  }
}

export async function getValidZohoAccessToken(integration: Integration): Promise<string> {
  const credential = getZohoCredential(integration);
  const expiresAt = new Date(credential.expires_at);
  const refreshBuffer = 5 * 60 * 1000;
  const shouldRefresh = Date.now() >= expiresAt.getTime() - refreshBuffer;
  // token still valid
  if (!shouldRefresh) {
    return credential.access_token;
  }

  log.info("Refreshing Zoho access token for integration=%s", integration.id);

  try {
    const response = await refreshZohoToken(credential.refresh_token);
    const newAccessToken = response.access_token;
    const expiresIn = response.expires_in;

    const updatedCredential = {
      ...credential,
      access_token: newAccessToken,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };

    await prisma.integration.update({
      where: {
        id: integration.id,
      },
      data: {
        credential: updatedCredential,
      },
    });
    log.info("Zoho access token refreshed successfully");

    return newAccessToken;
  } catch (error) {
    log.error({ err: error }, "Zoho token refresh failed");

    throw new Error("Failed to refresh Zoho access token");
  }
}

export async function refreshZohoIntegrationCredential(integration: Integration) {
  const credential = getZohoCredential(integration);
  const response = await refreshZohoToken(credential.refresh_token);
  const newAccessToken = response.access_token;
  const expiresIn = response.expires_in;
  let updatedCredential = {
    ...credential,
    access_token: newAccessToken,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };

  // Set when the integration is first connected (zoho.controller.ts). Without
  // it Zoho has no way to authenticate the callbacks, so re-registration is
  // skipped rather than sent with an undefined token as it was previously.
  const zohoWebhookSecret = credential.zohoWebhookSecret;
  if (credential.supportedProducts?.crm && !zohoWebhookSecret) {
    log.warn(
      "No zohoWebhookSecret on integration=%s; skipping CRM webhook re-registration",
      integration.id,
    );
  }
  if (credential.supportedProducts?.bigin && !zohoWebhookSecret) {
    log.warn(
      "No zohoWebhookSecret on integration=%s; skipping Bigin webhook re-registration",
      integration.id,
    );
  }

  if (credential.supportedProducts?.crm && zohoWebhookSecret) {
    try {
      if (credential.crmWebhook?.channelId) {
        try {
          await unsubscribeZohoWebhook({
            accessToken: newAccessToken,
            apiDomain: credential.api_domain,
            product: "crm",
            channelIds: [credential.crmWebhook.channelId],
          });

          log.info("Old CRM webhook unsubscribed successfully for integration=%s", integration.id);
        } catch (err) {
          log.warn({ err }, "CRM webhook unsubscribe failed, continuing");
        }
      }

      // ALWAYS REGISTER NEW WEBHOOK

      const crmWebhook = await registerZohoWebhook({
        accessToken: newAccessToken,
        apiDomain: credential.api_domain,
        product: "crm",
        events: [
          "Contacts.create",
          "Contacts.edit",
          "Contacts.delete",
          "Leads.create",
          "Leads.edit",
          "Leads.delete",
        ],
        zohoWebhookSecret,
      });

      updatedCredential = {
        ...updatedCredential,

        crmWebhook: {
          product: "crm",
          channelId: crmWebhook.channelId,
          expiry: crmWebhook.response?.watch?.[0]?.details?.events?.[0]?.channel_expiry || null,
        },
      };

      log.info("CRM webhook re-registered successfully for integration=%s", integration.id);
    } catch (err) {
      log.error({ err }, "Failed registering CRM webhook for integration=%s", integration.id);
    }
  }

  if (credential.supportedProducts?.bigin && zohoWebhookSecret) {
    try {
      if (credential.biginWebhook?.channelId) {
        // Guarded like the CRM branch above, and for a reason that bites: Zoho
        // refuses to unsubscribe a channel that has already expired. Letting that
        // throw skipped the re-registration below, so an expired webhook could
        // never come back — every renewal failed on the very expiry it was meant
        // to fix, and inbound stayed dead until someone reconnected by hand.
        try {
          await unsubscribeZohoWebhook({
            accessToken: newAccessToken,
            apiDomain: credential.api_domain,
            product: "bigin",
            channelIds: [credential.biginWebhook.channelId],
          });

          log.info(
            "Old Bigin webhook unsubscribed successfully for integration=%s",
            integration.id,
          );
        } catch (err) {
          log.warn({ err }, "Bigin webhook unsubscribe failed, continuing to re-register");
        }
      }

      const biginWebhook = await registerZohoWebhook({
        accessToken: newAccessToken,
        apiDomain: credential.api_domain,
        product: "bigin",
        events: [
          "Contacts.create",
          "Contacts.edit",
          "Contacts.delete",
          "Deals.create",
          "Deals.edit",
          "Deals.delete",
        ],
        zohoWebhookSecret,
      });

      updatedCredential = {
        ...updatedCredential,
        biginWebhook: {
          product: "bigin",
          channelId: biginWebhook.channelId,
          expiry: biginWebhook.response?.watch?.[0]?.details?.events?.[0]?.channel_expiry || null,
        },
      };
      log.info("Bigin webhook re-registered successfully for integration=%s", integration.id);
    } catch (err) {
      log.error({ err }, "Failed re-registering Bigin webhook for integration=%s", integration.id);
    }
  }

  await prisma.integration.update({
    where: {
      id: integration.id,
    },
    data: {
      credential: updatedCredential,
    },
  });

  return updatedCredential;
}

export async function refreshZohoTokensAndWebhooks() {
  const integrations = await prisma.integration.findMany({
    where: {
      name: "zoho",
      active: true,
    },
  });

  for (const integration of integrations) {
    try {
      await refreshZohoIntegrationCredential(integration);
    } catch (err) {
      log.error({ err, integrationId: integration.id }, "Zoho scheduled refresh failed");
    }
  }
}

async function refreshZohoToken(refreshToken: string) {
  const response = await axios.post("https://accounts.zoho.in/oauth/v2/token", null, {
    params: {
      refresh_token: refreshToken,
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      grant_type: "refresh_token",
    },
  });

  return response.data;
}

export async function fetchZohoContacts(orgId: string, product: ZohoProduct = "crm") {
  const integration = await prisma.integration.findUnique({
    where: {
      orgid_integration_name_unique: {
        orgId,
        name: "zoho",
      },
    },
  });

  if (!integration) {
    throw new Error("Zoho integration not found");
  }

  const credential = getZohoCredential(integration);

  const accessToken = await getValidZohoAccessToken(integration);

  const lastSyncAt = product === "bigin" ? credential.lastBiginSyncAt : credential.lastZohoSyncAt;

  const response = await getZohoRecords(
    accessToken,
    "Contacts",
    credential.api_domain,
    {
      fields: "First_Name,Last_Name,Email,Phone,Description,Modified_Time",
    },
    lastSyncAt,
    product,
  );

  return {
    contacts: response.data || [],
    lastSyncAt,
  };
}

export async function syncZohoContacts(orgId: string, product: ZohoProduct = "crm") {
  const integration = await prisma.integration.findUnique({
    where: {
      orgid_integration_name_unique: {
        orgId,
        name: "zoho",
      },
    },
  });

  if (!integration) {
    throw new Error(`${product} integration not found`);
  }

  const credential = getZohoCredential(integration);

  const accessToken = await getValidZohoAccessToken(integration);

  const lastSyncAt = product === "bigin" ? credential.lastBiginSyncAt : credential.lastZohoSyncAt;

  const response = await getZohoRecords(
    accessToken,
    "Contacts",
    credential.api_domain,
    {
      fields: "First_Name,Last_Name,Email,Phone,Description,Modified_Time",
    },
    lastSyncAt,
    product,
  );

  const contacts = response.data || [];

  await syncZohoContactsToRateup(contacts, orgId, product);

  await prisma.integration.update({
    where: {
      id: integration.id,
    },
    data: {
      credential: {
        ...credential,
        ...(product === "bigin"
          ? {
              lastBiginSyncAt: new Date().toISOString(),
            }
          : {
              lastZohoSyncAt: new Date().toISOString(),
            }),
      },
    },
  });

  return contacts;
}

export async function syncZohoContactsToRateup(
  contacts: ZohoRecord[],
  orgId: string,
  product: ZohoProduct = "crm",
) {
  for (const zohoContact of contacts) {
    try {
      const zohoId = zohoContact.id;

      const firstName = zohoContact.First_Name || "";

      const lastName = zohoContact.Last_Name || "";

      const name = `${firstName} ${lastName}`.trim();

      const integrationPath =
        product === "bigin" ? ["bigin", "contact", "id"] : ["zoho", "contact", "id"];

      const orConditions: Prisma.ContactWhereInput[] = [
        {
          integrationIds: {
            path: integrationPath,
            equals: zohoId,
          },
        },
      ];

      if (zohoContact.Phone) {
        orConditions.push({
          phone: zohoContact.Phone,
        });
      }

      if (zohoContact.Email) {
        orConditions.push({
          email: zohoContact.Email,
        });
      }

      const existingContact = await prisma.contact.findFirst({
        where: {
          orgId,
          OR: orConditions,
        },
      });

      const existingIntegrationIds =
        (existingContact?.integrationIds as ContactIntegrationIds | null) ?? {};

      const integrationIds = {
        ...existingIntegrationIds,
        ...(product === "bigin"
          ? {
              bigin: {
                ...existingIntegrationIds.bigin,
                contact: {
                  ...existingIntegrationIds.bigin?.contact,
                  id: zohoId,
                },
              },
            }
          : {
              zoho: {
                ...existingIntegrationIds.zoho,
                contact: {
                  ...existingIntegrationIds.zoho?.contact,
                  id: zohoId,
                },
              },
            }),
      };

      const contactData = {
        name,
        email: zohoContact.Email || "",
        phone: zohoContact.Phone || "",
        source: existingContact?.source || (product === "bigin" ? "BIGIN" : "ZOHO"),
        integrationIds,
        notes: zohoContact.Description || "",
      };

      if (existingContact) {
        await prisma.contact.update({
          where: {
            id: existingContact.id,
          },
          data: contactData,
        });

        log.info("Updated Rateup contact from %s", product);
      } else {
        await prisma.contact.create({
          data: {
            ...contactData,
            orgId,
          },
        });

        log.info("Created Rateup contact from %s", product);
      }
    } catch (error) {
      log.error({ err: error, product }, "Failed syncing contact");
    }
  }

  log.info("%s contacts sync completed", product);
}

export async function fetchZohoLeads(orgId: string) {
  const integration = await prisma.integration.findUnique({
    where: {
      orgid_integration_name_unique: {
        orgId,
        name: "zoho",
      },
    },
  });

  if (!integration) {
    throw new Error("Zoho integration not found");
  }

  const credential = getZohoCredential(integration);
  const accessToken = await getValidZohoAccessToken(integration);
  const response = await getZohoRecords(
    accessToken,
    "Leads",
    credential.api_domain,
    {
      fields: "First_Name,Last_Name,Email,Phone,Description,Lead_Status,Modified_Time",
    },
    credential.lastZohoLeadSyncAt,
    "crm",
  );

  return {
    leads: response.data || [],
    lastSyncAt: credential.lastZohoLeadSyncAt,
  };
}

export async function syncZohoLeads(orgId: string) {
  const integration = await prisma.integration.findUnique({
    where: {
      orgid_integration_name_unique: {
        orgId,
        name: "zoho",
      },
    },
  });

  if (!integration) {
    throw new Error("Zoho integration not found");
  }

  const credential = getZohoCredential(integration);
  const accessToken = await getValidZohoAccessToken(integration);
  const response = await getZohoRecords(
    accessToken,
    "Leads",
    credential.api_domain,
    {
      fields: "First_Name,Last_Name,Email,Phone,Description,Lead_Status,Modified_Time",
    },
    undefined,
    "crm",
  );
  const leads = response.data || [];
  await syncZohoLeadsToRateup(leads, orgId);
  await prisma.integration.update({
    where: {
      id: integration.id,
    },
    data: {
      credential: {
        ...credential,
        lastZohoLeadSyncAt: new Date().toISOString(),
      },
    },
  });

  return leads;
}
export async function syncZohoLeadsToRateup(leads: ZohoRecord[], orgId: string) {
  const integration = await prisma.integration.findUnique({
    where: {
      orgid_integration_name_unique: {
        orgId,
        name: "zoho",
      },
    },
  });

  if (!integration) {
    throw new Error("Zoho integration not found");
  }

  const credential = getZohoCredential(integration);
  const leadLifecycleMappings = credential?.crm?.leadLifecycleMappings || [];

  // Zoho lead status -> the pipeline column it means.
  const stageMap = new Map<string, string>();

  for (const mapping of leadLifecycleMappings) {
    if (mapping?.zohoLeadStatus && mapping?.stageId) {
      stageMap.set(mapping.zohoLeadStatus.trim().toLowerCase(), mapping.stageId);
    }
  }

  // Resolved once: every imported lead lands on the same org's board.
  const pipelineId = stageMap.size > 0 ? await resolvePipelineForContact(orgId) : null;

  for (const zohoLead of leads) {
    try {
      const zohoId = zohoLead.id;
      const firstName = zohoLead.First_Name || "";
      const lastName = zohoLead.Last_Name || "";
      const name = `${firstName} ${lastName}`.trim();
      const leadStatus = (zohoLead.Lead_Status || "").toString().trim().toLowerCase();
      const mappedStageId = stageMap.get(leadStatus) || null;
      const orConditions: Prisma.ContactWhereInput[] = [
        {
          integrationIds: {
            path: ["zoho", "lead", "id"],
            equals: zohoId,
          },
        },
      ];

      if (zohoLead.Phone) {
        orConditions.push({
          phone: zohoLead.Phone,
        });
      }

      if (zohoLead.Email) {
        orConditions.push({
          email: zohoLead.Email,
        });
      }

      const existingContact = await prisma.contact.findFirst({
        where: {
          orgId,
          OR: orConditions,
        },
      });

      const integrationIds = {
        ...((existingContact?.integrationIds as ContactIntegrationIds | null) ?? {}),

        zoho: {
          ...((existingContact?.integrationIds as ContactIntegrationIds | null) ?? {}).zoho,

          lead: {
            id: zohoId,
          },
        },
      };

      const contactData = {
        name,
        email: zohoLead.Email || "",
        phone: zohoLead.Phone || "",
        source: existingContact?.source || "ZOHO_LEAD",
        integrationIds,
        notes: zohoLead.Description || "",
        // The lifecycle is left exactly as it was. The import writes the stage
        // instead, and it does so below, once the contact has an id.
        lifecycleId: existingContact?.lifecycleId || null,
      };

      const contact = existingContact
        ? await prisma.contact.update({
            where: {
              id: existingContact.id,
            },
            data: contactData,
          })
        : await prisma.contact.create({
            data: {
              ...contactData,
              orgId,
            },
          });

      if (mappedStageId && pipelineId) {
        // Inbound, so no outbound echo — see `applyInboundStage`.
        await setContactStage({
          contactId: contact.id,
          pipelineId,
          stageId: mappedStageId,
          source: "MANUAL",
          channel: "NONE",
          syncIntegrations: false,
        });
      }
    } catch (error) {
      log.error({ err: error }, "Failed syncing Zoho lead");
    }
  }

  log.info("Zoho leads sync completed");
}

export async function updateZohoLeadQueue(
  orgId: string,
  zohoLeadId: string,
  fields: Record<string, unknown>,
) {
  await integrationTriggerQueue.add("zoho-lead-update", {
    integrationName: "zoho",
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
      where: { orgid_integration_name_unique: { orgId, name: "zoho" } },
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

export async function fetchZohoPipelineMeta(orgId: string, product: ZohoProduct = "bigin") {
  const integration = await prisma.integration.findUnique({
    where: {
      orgid_integration_name_unique: {
        orgId,
        name: "zoho",
      },
    },
  });

  if (!integration) {
    throw new Error("Zoho integration not found");
  }

  const credential = getZohoCredential(integration);
  const accessToken = await getValidZohoAccessToken(integration);

  // FETCH BOTH
  const [layoutResponse, fieldResponse] = await Promise.all([
    getZohoLayoutsMetadata(accessToken, "Pipelines", credential.api_domain, product),

    getZohoFieldMetadata(accessToken, "Pipelines", credential.api_domain, product),
  ]);

  // LAYOUTS
  const excludedFields = ["Deal_Name", "Stage", "Pipeline", "Sub_Pipeline", "Contact_Name"];

  const pipelines =
    layoutResponse.layouts?.map((layout: ZohoLayoutMeta) => {
      // GET REQUIRED FIELDS
      const requiredFields =
        layout.sections
          ?.flatMap((section: ZohoLayoutSection) => section.fields || [])
          ?.filter(
            (field: ZohoFieldMeta) =>
              (field.required || field.system_mandatory) &&
              !excludedFields.includes(field.api_name ?? ""),
          )
          ?.map((field: ZohoFieldMeta) => ({
            id: String(field.id),
            apiName: field.api_name,
            label: field.display_label,
            dataType: field.data_type,
            required: field.required,
            systemMandatory: field.system_mandatory,
          })) || [];

      return {
        id: String(layout.id),
        name: layout.display_label,
        apiName: layout.name,
        requiredFields,
      };
    }) || [];

  // FIELDS
  const fields = fieldResponse.fields || [];

  // SUB PIPELINE FIELD
  const subPipelineField = fields.find(
    (field: ZohoFieldMeta) => field.api_name === "Sub_Pipeline" && field.data_type === "picklist",
  );

  // STAGE FIELD
  const stageField = fields.find(
    (field: ZohoFieldMeta) => field.api_name === "Stage" && field.data_type === "picklist",
  );

  // SUB PIPELINES
  const subPipelines =
    subPipelineField?.pick_list_values
      ?.filter((pipeline: ZohoPickListValue) => pipeline.actual_value !== "-None-")
      .map((pipeline: ZohoPickListValue) => ({
        id: String(pipeline.id),
        name: pipeline.display_value,
        value: pipeline.actual_value,
      })) || [];

  // STAGES
  const stages =
    stageField?.pick_list_values
      ?.filter((stage: ZohoPickListValue) => stage.actual_value !== "-None-")
      .map((stage: ZohoPickListValue) => ({
        id: String(stage.id),
        name: stage.display_value,
        value: stage.actual_value,
      })) || [];

  return {
    success: true,
    pipelines,
    subPipelines,
    stages,
  };
}

export async function getIntegrationByZohoChannelId(channelId: string) {
  const normalizedChannelId = String(channelId);
  const integration = await prisma.integration.findFirst({
    where: {
      name: IntegratedApps.zoho,
      active: true,
      OR: [
        {
          credential: {
            path: ["crmWebhook", "channelId"],
            equals: normalizedChannelId,
          },
        },
        {
          credential: {
            path: ["biginWebhook", "channelId"],
            equals: normalizedChannelId,
          },
        },
      ],
    },
  });

  return integration;
}

export async function syncContactFromZohoRecord({
  orgId,
  product,
  module,
  zohoRecord,
  credential,
}: {
  orgId: string;
  product: "crm" | "bigin";
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

  let requiredTrigger: string | null = null;

  if (product === "crm" && module === "Contacts") {
    requiredTrigger = ZohoTriggers.CONTACT_WEBHOOK;
  }
  if (product === "crm" && module === "Leads") {
    requiredTrigger = ZohoTriggers.LEAD_WEBHOOK;
  }
  if (product === "bigin" && module === "Contacts") {
    requiredTrigger = ZohoTriggers.BIGIN_CONTACT_WEBHOOK;
  }
  if (product === "bigin" && module === "Deals") {
    requiredTrigger = ZohoTriggers.BIGIN_DEAL_WEBHOOK;
  }
  if (requiredTrigger && !isZohoTriggerEnabled(credential, requiredTrigger)) {
    log.info("Zoho trigger disabled => %s", requiredTrigger);
    return null;
  }

  let integrationPath: string[] = [];

  if (product === "crm") {
    if (module === "Contacts") {
      integrationPath = ["zoho", "contact", "id"];
    }
    if (module === "Leads") {
      integrationPath = ["zoho", "lead", "id"];
    }
  }
  if (product === "bigin") {
    if (module === "Contacts") {
      integrationPath = ["bigin", "contact", "id"];
    }
    if (module === "Deals") {
      integrationPath = ["bigin", "deal", "id"];
    }
  }
  const existingContact = await prisma.contact.findFirst({
    where: {
      orgId,
      integrationIds: {
        path: integrationPath,
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
 * `syncIntegrations: false` for the same reason as everywhere else inbound —
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
      pipeline: { orgId },
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

export async function fetchZohoUsers(orgId: string, product: ZohoProduct = "bigin") {
  const integration = await prisma.integration.findUnique({
    where: {
      orgid_integration_name_unique: {
        orgId,
        name: "zoho",
      },
    },
  });

  if (!integration) {
    throw new Error("Zoho integration not found");
  }

  const credential = getZohoCredential(integration);
  const accessToken = await getValidZohoAccessToken(integration);
  const response = await getZohoRecords(
    accessToken,
    "users",
    credential.api_domain,
    {
      type: "ActiveUsers",
    },
    undefined,
    product,
  );

  const users =
    response?.users?.map((user: ZohoUser) => ({
      id: String(user.id),
      name: user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim(),
      email: user.email,
      status: user.status,
      zuid: user.zuid,
    })) || [];

  return {
    success: true,
    users,
  };
}
