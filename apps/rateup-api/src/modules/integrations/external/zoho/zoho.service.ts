import { integrationTriggerQueue } from "../../../../utils/redisConnection.js";
import prisma from "../../../../utils/prisma.js";
import { log } from "../../../../utils/logger.js";
import axios from "axios";
import {
  createZohoContact,
  deleteZohoContact,
  getZohoContacts,
  getZohoLeads,
  updateZohoContact,
} from "./zoho.client.js";

export enum ZohoTriggers {
  CONTACT_CREATE = "contact_created",
  CONTACT_UPDATE = "contact_updated",
  CONTACT_DELETE = "contact_deleted",
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
          await prisma.contact.update({
            where: {
              id: rateupContactId,
            },
            data: {
              integrationIds: {
                zoho: {
                  id: zohoContactId,
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

export async function fetchZohoContacts(orgId: string) {
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
  const params: Record<string, any> = {};

  if (credential.lastZohoSyncAt) {
    params.modified_since = credential.lastZohoSyncAt;
  }

  const response = await getZohoContacts(
    accessToken,
    credential.api_domain,
    {},
    credential.lastZohoSyncAt,
  );

  return {
    contacts: response.data || [],
    lastSyncAt: credential.lastZohoSyncAt,
  };
}

export async function syncZohoContacts(orgId: string) {
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
  const response = await getZohoContacts(accessToken, credential.api_domain);
  const contacts = response.data || [];
  await syncZohoContactsToRateup(contacts, orgId);

  await prisma.integration.update({
    where: {
      id: integration.id,
    },

    data: {
      credential: {
        ...credential,
        lastZohoSyncAt: new Date().toISOString(),
      },
    },
  });
  return contacts;
}

export async function syncZohoContactsToRateup(contacts: any[], orgId: string) {
  for (const zohoContact of contacts) {
    try {
      const zohoId = zohoContact.id;
      const firstName = zohoContact.First_Name || "";
      const lastName = zohoContact.Last_Name || "";
      const name = `${firstName} ${lastName}`.trim();
      const orConditions: any[] = [
        {
          integrationIds: {
            path: ["zoho", "id"],
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

      const integrationIds = {
        ...((existingContact?.integrationIds as any) || {}),

        zoho: {
          id: zohoId,
        },
      };

      const contactData = {
        name,
        email: zohoContact.Email || "",
        phone: zohoContact.Phone || "",
        source: existingContact?.source || "ZOHO",
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

        log.info("Updated Rateup contact from Zoho => %s", existingContact.id);
      } else {
        const createdContact = await prisma.contact.create({
          data: {
            ...contactData,
            orgId,
          },
        });

        log.info("Created Rateup contact from Zoho => %s", createdContact.id);
      }
    } catch (error) {
      log.error("Failed syncing Zoho contact => %o", error);
    }
  }

  log.info("Zoho contacts sync completed");
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
  for (const zohoLead of leads) {
    try {
      const zohoId = zohoLead.id;

      const firstName = zohoLead.First_Name || "";

      const lastName = zohoLead.Last_Name || "";

      const name = `${firstName} ${lastName}`.trim();

      const existingContact = await prisma.contact.findFirst({
        where: {
          orgId,

          OR: [
            {
              integrationIds: {
                path: ["zoho", "id"],

                equals: zohoId,
              },
            },

            zohoLead.Phone
              ? {
                  phone: zohoLead.Phone,
                }
              : {},

            zohoLead.Email
              ? {
                  email: zohoLead.Email,
                }
              : {},
          ],
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
