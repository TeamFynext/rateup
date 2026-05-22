import { integrationTriggerQueue } from "../../../../utils/redisConnection.js";
import prisma from "../../../../utils/prisma.js";
import { log } from "../../../../utils/logger.js";
import axios from "axios";
import {
  createZohoContact,
  createZohoLead,
  deleteZohoContact,
  getZohoContacts,
  getZohoLeads,
  updateZohoContact,
  updateZohoLead,
  ZohoProduct,
} from "./zoho.client.js";

export enum ZohoTriggers {
  CONTACT_CREATE = "contact_created",
  CONTACT_UPDATE = "contact_updated",
  CONTACT_DELETE = "contact_deleted",
  LEAD_UPDATE = "lead_updated",
  LEAD_CREATE = "lead_created",
  BIGIN_CONTACT_CREATE = "bigin_contact_created",
  BIGIN_CONTACT_UPDATE = "bigin_contact_updated",
  BIGIN_CONTACT_DELETE = "bigin_contact_deleted",
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
    throw new Error(`Integration not found or inactive: ${integrationName}`);
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
      const response = await createZohoContact(
        accessToken,
        data,
        credential.api_domain,
      );
      log.info("Zoho contact created successfully => %o", response);

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
          log.info(
            "Updated contact %s with Zoho ID %s",
            rateupContactId,
            zohoContactId,
          );
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

      await updateZohoContact(
        accessToken,
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

      await deleteZohoContact(
        accessToken,
        zohoContactId,
        credential.api_domain,
      );

      log.info("Zoho contact deleted successfully");
      return;
    }

    case ZohoTriggers.LEAD_CREATE: {
      log.info("Zoho lead create payload => %o", data);
      const response = await createZohoLead(
        accessToken,
        data,
        credential.api_domain,
      );

      log.info("Zoho lead created successfully => %o", response);

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

          log.info(
            "Updated contact %s with Zoho Lead ID %s",
            rateupContactId,
            zohoLeadId,
          );
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

      await updateZohoLead(
        accessToken,
        zohoLeadId,
        payload,
        credential.api_domain,
      );

      log.info("Zoho lead updated successfully");

      return;
    }

    case ZohoTriggers.BIGIN_CONTACT_CREATE: {
      log.info("Bigin contact create payload => %o", data);

      const response = await createZohoContact(
        accessToken,
        data,
        credential.api_domain,
        "bigin",
      );

      log.info("Bigin contact created successfully => %o", response);

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

          log.info(
            "Updated contact %s with Bigin Contact ID %s",
            rateupContactId,
            biginContactId,
          );
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

      await updateZohoContact(
        accessToken,
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

      await deleteZohoContact(
        accessToken,
        biginContactId,
        credential.api_domain,
        "bigin",
      );
      log.info("Bigin contact deleted successfully");
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

export async function addZohoContactToQueue(contact: any, orgId: string) {
  const [firstName, ...rest] = (contact.name || "Unknown").split(" ");

  const zohoContactPayload = {
    Last_Name: rest.join(" ") || firstName,
    First_Name: firstName,
    Email: contact.email,
    Phone: contact.phone,
    Description: `
    Source: ${contact.source}
    PSID: ${contact.psid || ""}
    IGSID: ${contact.igsId || ""}
    Rateup Contact ID: ${contact.id}
    `,
  };

  await integrationTriggerQueue.add("zoho-contact-create", {
    integrationName: "zoho",
    triggerKey: ZohoTriggers.CONTACT_CREATE,
    orgId,
    data: zohoContactPayload,
    rateupContactId: contact.id,
  });

  // Also enqueue Bigin contact create so Bigin-enabled integrations receive the event
  await integrationTriggerQueue.add("zoho-bigin-contact-create", {
    integrationName: "zoho",
    triggerKey: ZohoTriggers.BIGIN_CONTACT_CREATE,
    orgId,
    data: zohoContactPayload,
    rateupContactId: contact.id,
  });
}

export function buildZohoContactPayload(contact: any) {
  const [firstName, ...rest] = (contact.name || "Unknown").split(" ");
  return {
    First_Name: firstName,
    Last_Name: rest.join(" ") || firstName,
    Email: contact.email || "",
    Phone: contact.phone || "",
    Description: `
      Source: ${contact.source}
      PSID: ${contact.psid || ""}
      IGSID: ${contact.igsId || ""}
      Rateup Contact ID: ${contact.id}
    `,
  };
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

  const response = await getZohoContacts(
    accessToken,
    credential.api_domain,
    {},
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

  const response = await getZohoContacts(
    accessToken,
    credential.api_domain,
    {},
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

        log.info(
          "Updated Rateup contact from %s => %s",
          product,
          existingContact.id,
        );
      } else {
        const createdContact = await prisma.contact.create({
          data: {
            ...contactData,
            orgId,
          },
        });

        log.info(
          "Created Rateup contact from %s => %s",
          product,
          createdContact.id,
        );
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
  const response = await getZohoLeads(
    accessToken,
    credential.api_domain,
    {},
    credential.lastZohoLeadSyncAt,
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
  const response = await getZohoLeads(accessToken, credential.api_domain);
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
  const lifecycles = await prisma.lifecycle.findMany({
    where: {
      orgId,
    },
  });

  const lifecycleMap = new Map(
    lifecycles.map((lifecycle) => [
      lifecycle.name.trim().toLowerCase(),
      lifecycle.id,
    ]),
  );

  for (const zohoLead of leads) {
    try {
      const zohoId = zohoLead.id;
      const firstName = zohoLead.First_Name || "";
      const lastName = zohoLead.Last_Name || "";
      const name = `${firstName} ${lastName}`.trim();
      const leadStatus = String(zohoLead.Lead_Status || "")
        .trim()
        .toLowerCase();

      const orConditions: any[] = [
        {
          integrationIds: {
            path: ["zoho", "id"],
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
          id: zohoId,
          module: "Leads",
        },
      };

      const contactData = {
        name,
        email: zohoLead.Email || "",
        phone: zohoLead.Phone || "",
        source: existingContact?.source || "ZOHO_LEAD",
        integrationIds,
        notes: zohoLead.Description || "",
        lifecycleId:
          lifecycleMap.get(leadStatus) || existingContact?.lifecycleId || null,
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

export function buildZohoLeadPayload(contact: any) {
  const [firstName, ...rest] = (contact.name || "Unknown").split(" ");
  return {
    First_Name: firstName,
    Last_Name: rest.join(" ") || firstName,
    Email: contact.email || "",
    Phone: contact.phone || "",
    Lead_Status: contact.leadStatus || "New",
    Description: `
      Source: ${contact.source}
      PSID: ${contact.psid || ""}
      IGSID: ${contact.igsId || ""}
      Rateup Contact ID: ${contact.id}
    `,
  };
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
