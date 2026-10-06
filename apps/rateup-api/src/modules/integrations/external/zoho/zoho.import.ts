import prisma from "../../../../utils/prisma.js";
import { log } from "../../../../utils/logger.js";
import type { Prisma } from "../../../../../generated/prisma/client.js";
import {
  resolvePipelineForContact,
  setContactStage,
} from "../../../pipeline/pipelineLead/lead.service.js";
import { getValidZohoAccessToken, loadZohoIntegration } from "./zoho.auth.js";
import { getZohoRecords, type ZohoProduct } from "./zoho.client.js";
import { getZohoCredential, type ZohoRecord } from "./zoho.types.js";

/**
 * "Sync from Zoho" on the settings page: pulls contacts (CRM or Bigin) and CRM
 * leads into Rateup, matching on the linked id, then phone, then email. The
 * `fetch*` variants only preview what a sync would bring in.
 */

export async function fetchZohoContacts(orgId: string, product: ZohoProduct = "crm") {
  const integration = await loadZohoIntegration(orgId);

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
  const integration = await loadZohoIntegration(orgId, product);

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
  const integration = await loadZohoIntegration(orgId);

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
  const integration = await loadZohoIntegration(orgId);

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
  const integration = await loadZohoIntegration(orgId);

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
