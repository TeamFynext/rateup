import { integrationTriggerQueue } from "../../../../utils/redisConnection.js";
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
import { IntegratedApps } from "../../../../types/enums.js";

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
  data: Record<string, any>;
  orgId: string;
  timestamp: string;
}

export async function processIntegration(job) {
  const { integrationName, triggerKey, data, orgId, rateupContactId } =
    job.data;

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

  switch (integrationName) {
    case "zapier":
      return;

    case "zoho":
      return processZoho(integration, triggerKey, data, orgId, rateupContactId);

    default:
      throw new Error(`Unsupported integration: ${integrationName}`);
  }
}

async function processZoho(
  integration: any,
  triggerKey: string,
  data: any,
  orgId: string,
  rateupContactId?: string,
) {
  const credential = integration.credential as any;
  const triggerSubscriptions = credential.triggerSubscriptions || [];
  const isSubscribed = triggerSubscriptions.some(
    (subscription: any) =>
      subscription.subscribed_field === triggerKey && subscription.active,
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
      const response = await createZohoRecord(
        accessToken,
        "Contacts",
        data,
        credential.api_domain,
      );
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
            (existingContact?.integrationIds as any) || {};
          await prisma.contact.update({
            where: {
              id: rateupContactId,
            },
            data: {
              integrationIds: {
                ...existingIntegrationIds,
                zoho: {
                  ...(existingIntegrationIds.zoho || {}),
                  contact: {
                    ...(existingIntegrationIds.zoho?.contact || {}),
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

      await deleteZohoRecord(
        accessToken,
        "Contacts",
        zohoContactId,
        credential.api_domain,
      );

      log.info("Zoho contact deleted successfully");
      return;
    }

    case ZohoTriggers.LEAD_CREATE: {
      log.info("Zoho lead create payload");
      const response = await createZohoRecord(
        accessToken,
        "Leads",
        data,
        credential.api_domain,
      );

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
            (existingContact?.integrationIds as any) || {};
          await prisma.contact.update({
            where: {
              id: rateupContactId,
            },
            data: {
              integrationIds: {
                ...existingIntegrationIds,
                zoho: {
                  ...(existingIntegrationIds.zoho || {}),
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

      await updateZohoRecord(
        accessToken,
        "Leads",
        zohoLeadId,
        payload,
        credential.api_domain,
      );

      log.info("Zoho lead updated successfully");

      return;
    }

    case ZohoTriggers.BIGIN_CONTACT_CREATE: {
      log.info("Bigin contact create payload");

      const contactPayload = {
        ...data,
        ...(credential?.bigin?.biginOwner
          ? { Owner: { id: credential.bigin.biginOwner } }
          : {}),
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
            (existingContact?.integrationIds as any) || {};
          await prisma.contact.update({
            where: {
              id: rateupContactId,
            },
            data: {
              integrationIds: {
                ...existingIntegrationIds,
                bigin: {
                  ...(existingIntegrationIds.bigin || {}),
                  contact: {
                    ...(existingIntegrationIds.bigin?.contact || {}),
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
        return;
      }

      const mappings = biginConfig?.lifecycleStageMappings || [];

      const mapping = mappings.find(
        (m: any) => m.lifecycleId === data.lifecycleId,
      );

      if (!mapping) {
        log.warn(
          "No Bigin lifecycle mapping found for lifecycle=%s",
          data.lifecycleId,
        );
      }

      let existingDealId: string | undefined = data.biginDealId || undefined;
      let biginContactId: string | undefined = undefined;
      if (rateupContactId) {
        const existingContact = await prisma.contact.findUnique({
          where: {
            id: rateupContactId,
          },
          select: {
            integrationIds: true,
          },
        });

        const existingIntegrationIds =
          (existingContact?.integrationIds as any) || {};
        biginContactId = existingIntegrationIds?.bigin?.contact?.id;
        const biginDealIdFromContact = existingIntegrationIds?.bigin?.deal?.id;

        if (!existingDealId && biginDealIdFromContact) {
          existingDealId = biginDealIdFromContact;
        }
      }

      const payload: any = {
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

      // If there is no Bigin contact but creating contacts is enabled, create one first
      const createContactEnabled = (triggerSubscriptions || []).some(
        (s: any) => s.subscribed_field === "bigin_contact_created" && s.active,
      );

      if (!biginContactId && createContactEnabled) {
        try {
          // Build a contact payload from available data
          const contactPayload: any = {};

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

          if (
            contactResponse?.data &&
            Array.isArray(contactResponse.data) &&
            contactResponse.data[0]
          ) {
            const createdContactId = contactResponse.data[0]?.details?.id;
            if (createdContactId) {
              biginContactId = createdContactId;

              // Update Rateup contact integrationIds if we have a Rateup contact id
              if (rateupContactId) {
                const existingContact = await prisma.contact.findUnique({
                  where: { id: rateupContactId },
                  select: { integrationIds: true },
                });

                const existingIntegrationIds =
                  (existingContact?.integrationIds as any) || {};

                await prisma.contact.update({
                  where: { id: rateupContactId },
                  data: {
                    integrationIds: {
                      ...existingIntegrationIds,
                      bigin: {
                        ...(existingIntegrationIds.bigin || {}),
                        contact: {
                          ...(existingIntegrationIds.bigin?.contact || {}),
                          id: createdContactId,
                        },
                      },
                    },
                  },
                });

                log.info("Created and linked Bigin contact to Rateup contact");
              }

              // attach to payload for deal creation
              payload.Contact_Name = { id: biginContactId };
            }
          }
        } catch (err: any) {
          log.error(
            "Failed creating Bigin contact before deal create => %o",
            err,
          );
        }
      }

      let response: any;

      try {
        if (existingDealId) {
          response = await updateZohoRecord(
            accessToken,
            "Pipelines",
            existingDealId,
            payload,
            credential.api_domain,
            "bigin",
          );

          log.info("Bigin deal updated");
        } else {
          response = await createZohoRecord(
            accessToken,
            "Pipelines",
            payload,
            credential.api_domain,
            "bigin",
          );

          log.info("Bigin deal created");
        }
      } catch (error: any) {
        console.log(
          "Bigin API error =>",
          JSON.stringify(error?.response?.data, null, 2),
        );
        throw error;
      }

      // Save deal id to Rateup contact
      if (
        !existingDealId &&
        response?.data &&
        Array.isArray(response.data) &&
        response.data[0]
      ) {
        const dealId = response.data[0]?.details?.id;

        if (dealId && rateupContactId) {
          const existingContact = await prisma.contact.findUnique({
            where: {
              id: rateupContactId,
            },
            select: {
              integrationIds: true,
            },
          });

          const existingIntegrationIds =
            (existingContact?.integrationIds as any) || {};
          await prisma.contact.update({
            where: {
              id: rateupContactId,
            },
            data: {
              integrationIds: {
                ...existingIntegrationIds,
                bigin: {
                  ...(existingIntegrationIds.bigin || {}),
                  deal: {
                    id: dealId,
                  },
                },
              },
            },
          });

          log.info("Updated contact with Bigin Deal ID");
        }
      }
      return;
    }
    default:
      throw new Error(`Unsupported Zoho trigger ${triggerKey}`);
  }
}

export async function getValidZohoAccessToken(
  integration: any,
): Promise<string> {
  const credential = integration.credential as any;
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
    log.error("Zoho token refresh failed => %o", error);

    throw new Error("Failed to refresh Zoho access token");
  }
}

export async function refreshZohoIntegrationCredential(integration: any) {
  const credential = integration.credential as any;
  const response = await refreshZohoToken(credential.refresh_token);
  const newAccessToken = response.access_token;
  const expiresIn = response.expires_in;
  let updatedCredential = {
    ...credential,
    access_token: newAccessToken,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };

  if (credential.supportedProducts?.crm) {
    try {
      if (credential.crmWebhook?.channelId) {
        try {
          await unsubscribeZohoWebhook({
            accessToken: newAccessToken,
            apiDomain: credential.api_domain,
            product: "crm",
            channelIds: [credential.crmWebhook.channelId],
          });

          log.info(
            "Old CRM webhook unsubscribed successfully for integration=%s",
            integration.id,
          );
        } catch (err) {
          log.warn("CRM webhook unsubscribe failed, continuing => %o", err);
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
        zohoWebhookSecret: credential.zohoWebhookSecret,
      });

      updatedCredential = {
        ...updatedCredential,

        crmWebhook: {
          product: "crm",
          channelId: crmWebhook.channelId,
          expiry:
            crmWebhook.response?.watch?.[0]?.details?.events?.[0]
              ?.channel_expiry || null,
        },
      };

      log.info(
        "CRM webhook re-registered successfully for integration=%s",
        integration.id,
      );
    } catch (err) {
      log.error(
        "Failed registering CRM webhook for integration=%s => %o",
        integration.id,
        err,
      );
    }
  }

  if (credential.supportedProducts?.bigin) {
    try {
      if (credential.biginWebhook?.channelId) {
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
        zohoWebhookSecret: credential.zohoWebhookSecret,
      });

      updatedCredential = {
        ...updatedCredential,
        biginWebhook: {
          product: "bigin",
          channelId: biginWebhook.channelId,
          expiry:
            biginWebhook.response?.watch?.[0]?.details?.events?.[0]
              ?.channel_expiry || null,
        },
      };
      log.info(
        "Bigin webhook re-registered successfully for integration=%s",
        integration.id,
      );
    } catch (err) {
      log.error(
        "Failed re-registering Bigin webhook for integration=%s => %o",
        integration.id,
        err,
      );
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
      log.error(
        "Zoho scheduled refresh failed for integration=%s => %o",
        integration.id,
        err,
      );
    }
  }
}

async function refreshZohoToken(refreshToken: string) {
  const response = await axios.post(
    "https://accounts.zoho.in/oauth/v2/token",
    null,
    {
      params: {
        refresh_token: refreshToken,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: "refresh_token",
      },
    },
  );

  return response.data;
}

export async function fetchZohoContacts(
  orgId: string,
  product: ZohoProduct = "crm",
) {
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

  const credential = integration.credential as any;

  const accessToken = await getValidZohoAccessToken(integration);

  const lastSyncAt =
    product === "bigin"
      ? credential.lastBiginSyncAt
      : credential.lastZohoSyncAt;

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

export async function syncZohoContacts(
  orgId: string,
  product: ZohoProduct = "crm",
) {
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

  const credential = integration.credential as any;

  const accessToken = await getValidZohoAccessToken(integration);

  const lastSyncAt =
    product === "bigin"
      ? credential.lastBiginSyncAt
      : credential.lastZohoSyncAt;

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
  contacts: any[],
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
        product === "bigin"
          ? ["bigin", "contact", "id"]
          : ["zoho", "contact", "id"];

      const orConditions: any[] = [
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
        (existingContact?.integrationIds as any) || {};

      const integrationIds = {
        ...existingIntegrationIds,
        ...(product === "bigin"
          ? {
              bigin: {
                ...(existingIntegrationIds.bigin || {}),
                contact: {
                  ...(existingIntegrationIds.bigin?.contact || {}),
                  id: zohoId,
                },
              },
            }
          : {
              zoho: {
                ...(existingIntegrationIds.zoho || {}),
                contact: {
                  ...(existingIntegrationIds.zoho?.contact || {}),
                  id: zohoId,
                },
              },
            }),
      };

      const contactData = {
        name,
        email: zohoContact.Email || "",
        phone: zohoContact.Phone || "",
        source:
          existingContact?.source || (product === "bigin" ? "BIGIN" : "ZOHO"),
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
        const createdContact = await prisma.contact.create({
          data: {
            ...contactData,
            orgId,
          },
        });

        log.info("Created Rateup contact from %s", product);
      }
    } catch (error) {
      log.error("Failed syncing %s contact => %o", product, error);
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

  const credential = integration.credential as any;
  const accessToken = await getValidZohoAccessToken(integration);
  const response = await getZohoRecords(
    accessToken,
    "Leads",
    credential.api_domain,
    {
      fields:
        "First_Name,Last_Name,Email,Phone,Description,Lead_Status,Modified_Time",
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

  const credential = integration.credential as any;
  const accessToken = await getValidZohoAccessToken(integration);
  const response = await getZohoRecords(
    accessToken,
    "Leads",
    credential.api_domain,
    {
      fields:
        "First_Name,Last_Name,Email,Phone,Description,Lead_Status,Modified_Time",
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
export async function syncZohoLeadsToRateup(leads: any[], orgId: string) {
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

  const credential = integration.credential as any;
  const leadLifecycleMappings = credential?.crm?.leadLifecycleMappings || [];

  // Build mapping object
  const lifecycleMap = new Map<string, string>();

  for (const mapping of leadLifecycleMappings) {
    if (mapping?.zohoLeadStatus && mapping?.lifecycleId) {
      lifecycleMap.set(
        mapping.zohoLeadStatus.trim().toLowerCase(),
        mapping.lifecycleId,
      );
    }
  }

  for (const zohoLead of leads) {
    try {
      const zohoId = zohoLead.id;
      const firstName = zohoLead.First_Name || "";
      const lastName = zohoLead.Last_Name || "";
      const name = `${firstName} ${lastName}`.trim();
      const leadStatus = (zohoLead.Lead_Status || "")
        .toString()
        .trim()
        .toLowerCase();
      const mappedLifecycleId = lifecycleMap.get(leadStatus) || null;
      const orConditions: any[] = [
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
        ...((existingContact?.integrationIds as any) || {}),

        zoho: {
          ...((existingContact?.integrationIds as any)?.zoho || {}),

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
        lifecycleId: mappedLifecycleId || existingContact?.lifecycleId || null,
      };

      if (existingContact) {
        await prisma.contact.update({
          where: {
            id: existingContact.id,
          },
          data: contactData,
        });
      } else {
        await prisma.contact.create({
          data: {
            ...contactData,
            orgId,
          },
        });
      }
    } catch (error) {
      log.error("Failed syncing Zoho lead => %o", error);
    }
  }

  log.info("Zoho leads sync completed");
}

export async function updateZohoLeadQueue(
  orgId: string,
  zohoLeadId: string,
  fields: Record<string, any>,
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

export async function fetchZohoPipelineMeta(
  orgId: string,
  product: ZohoProduct = "bigin",
) {
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

  const credential = integration.credential as any;
  const accessToken = await getValidZohoAccessToken(integration);

  // FETCH BOTH
  const [layoutResponse, fieldResponse] = await Promise.all([
    getZohoLayoutsMetadata(
      accessToken,
      "Pipelines",
      credential.api_domain,
      product,
    ),

    getZohoFieldMetadata(
      accessToken,
      "Pipelines",
      credential.api_domain,
      product,
    ),
  ]);

  // LAYOUTS
  const excludedFields = [
    "Deal_Name",
    "Stage",
    "Pipeline",
    "Sub_Pipeline",
    "Contact_Name",
  ];

  const pipelines =
    layoutResponse.layouts?.map((layout: any) => {
      // GET REQUIRED FIELDS
      const requiredFields =
        layout.sections
          ?.flatMap((section: any) => section.fields || [])
          ?.filter(
            (field: any) =>
              (field.required || field.system_mandatory) &&
              !excludedFields.includes(field.api_name),
          )
          ?.map((field: any) => ({
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
    (field: any) =>
      field.api_name === "Sub_Pipeline" && field.data_type === "picklist",
  );

  // STAGE FIELD
  const stageField = fields.find(
    (field: any) =>
      field.api_name === "Stage" && field.data_type === "picklist",
  );

  // SUB PIPELINES
  const subPipelines =
    subPipelineField?.pick_list_values
      ?.filter((pipeline: any) => pipeline.actual_value !== "-None-")
      .map((pipeline: any) => ({
        id: String(pipeline.id),
        name: pipeline.display_value,
        value: pipeline.actual_value,
      })) || [];

  // STAGES
  const stages =
    stageField?.pick_list_values
      ?.filter((stage: any) => stage.actual_value !== "-None-")
      .map((stage: any) => ({
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
  zohoRecord: any;
  credential: any;
}) {
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
    log.warn("No contact found for Zoho record => %s", zohoRecord.id);
    return null;
  }

  const updateData: any = {};

  if (module === "Contacts" || module === "Leads") {
    updateData.name = zohoRecord.Full_Name || null;
    updateData.email = zohoRecord.Email || null;
    updateData.phone = zohoRecord.Phone || zohoRecord.Mobile || null;
    updateData.other = zohoRecord.Description || null;
    updateData.source = zohoRecord.Lead_Source || null;
    updateData.external_id = zohoRecord.id;
    updateData.profilePic = zohoRecord.Record_Image || null;
    updateData.dob = zohoRecord.Date_of_Birth
      ? new Date(zohoRecord.Date_of_Birth)
      : null;
  }

  if (product === "crm" && module === "Leads") {
    const leadStatus = zohoRecord.Lead_Status;
    const mappings = credential?.crm?.leadLifecycleMappings || [];
    const matchedMapping = mappings.find(
      (m: any) => m.zohoLeadStatus === leadStatus,
    );
    if (matchedMapping?.lifecycleId) {
      updateData.lifecycleId = matchedMapping.lifecycleId;
      log.info("Mapped CRM Lead Status to lifecycle");
    }
  }

  if (product === "bigin" && module === "Deals") {
    const stageName = zohoRecord.Stage;
    const mappings = credential?.bigin?.pipeline?.lifecycleStageMappings || [];
    const matchedMapping = mappings.find(
      (m: any) => m.biginStageName === stageName,
    );
    if (matchedMapping?.lifecycleId) {
      updateData.lifecycleId = matchedMapping.lifecycleId;
      log.info("Mapped Bigin stage to lifecycle");
    }
  }

  const updatedContact = await prisma.contact.update({
    where: {
      id: existingContact.id,
    },
    data: updateData,
  });
  log.info("Synced contact from Zoho");
  return updatedContact;
}

export async function fetchZohoUsers(
  orgId: string,
  product: ZohoProduct = "bigin",
) {
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

  const credential = integration.credential as any;
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
    response?.users?.map((user: any) => ({
      id: String(user.id),
      name:
        user.full_name ||
        `${user.first_name || ""} ${user.last_name || ""}`.trim(),
      email: user.email,
      status: user.status,
      zuid: user.zuid,
    })) || [];

  return {
    success: true,
    users,
  };
}
