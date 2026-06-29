import axios from "axios";
import { log } from "./logger.js";

export const hubApiClient = axios.create({
  baseURL: "https://api.hubapi.com",
  timeout: 8000,
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${process.env.HUB_SPOT_PRIVATE_APP_ACCESS_TOKEN}`,
  },
});

interface hubSpotContact {
  email: string;
  firstname: string;
  phone?: string;
  company: string;
  joined_date: Date;
}

export async function createHubSpotContact(_data: hubSpotContact, _hubSpotCompanyId: string) {
  try {
    if (!process.env.HUB_SPOT_PRIVATE_APP_ACCESS_TOKEN) return false;
  } catch (e) {
    log.error("error creating hubspot contact %o", e);
  }
}

interface hubSpotCompany {
  name: string;
  joined_date: Date;
  owner_email: string;
}

export async function createHubSpotCompany(data: hubSpotCompany) {
  try {
    if (!process.env.HUB_SPOT_PRIVATE_APP_ACCESS_TOKEN) return false;
    const res = (
      await hubApiClient.post("/crm/v3/objects/companies", {
        properties: data,
      })
    ).data;
    return res?.id;
  } catch (e) {
    log.error("error creating hubspot company %o", e);
  }
}

export async function getHubSpotCompanyByOwnerEmail(owner_email: string) {
  try {
    if (!process.env.HUB_SPOT_PRIVATE_APP_ACCESS_TOKEN) return false;
    const res = (
      await hubApiClient.get(`/crm/v3/objects/companies/${owner_email}?idProperty=owner_email`)
    ).data;
    return res?.id;
  } catch (e) {
    log.error("error getting hubspot company %o", e);
  }
}
