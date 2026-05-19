import axios from "axios";

export function createZohoAxios(
  accessToken: string,
  baseUrl = "https://www.zohoapis.in",
) {
  return axios.create({
    baseURL: baseUrl,
    timeout: 10000,
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

export async function createZohoContact(
  accessToken: string,
  data: Record<string, any>,
  baseUrl?: string,
) {
  const client = createZohoAxios(accessToken, baseUrl);
  const response = await client.post("/crm/v8/Contacts", {
    data: [data],
  });
  return response.data;
}

export async function updateZohoContact(
  accessToken: string,
  contactId: string,
  data: Record<string, any>,
  baseUrl?: string,
) {
  const client = createZohoAxios(accessToken, baseUrl);
  const response = await client.put(`/crm/v8/Contacts/${contactId}`, {
    data: [data],
  });
  return response.data;
}

export async function getZohoContacts(
  accessToken: string,
  baseUrl?: string,
  params?: Record<string, any>,
  modifiedSince?: string,
) {
  const client = createZohoAxios(accessToken, baseUrl);
  const response = await client.get("/crm/v8/Contacts", {
    params: {
      fields: "First_Name,Last_Name,Email,Phone,Description,Modified_Time",
      per_page: 200,
      ...params,
    },

    headers: modifiedSince
      ? {
          "If-Modified-Since": modifiedSince,
        }
      : undefined,
  });

  return response.data;
}

export async function deleteZohoContact(
  accessToken: string,
  contactId: string,
  baseUrl?: string,
) {
  const client = createZohoAxios(accessToken, baseUrl);
  const response = await client.delete(`/crm/v8/Contacts/${contactId}`);
  return response.data;
}

export async function getZohoLeads(
  accessToken: string,
  baseUrl?: string,
  params?: Record<string, any>,
  modifiedSince?: string,
) {
  const client = createZohoAxios(accessToken, baseUrl);

  const response = await client.get("/crm/v8/Leads", {
    params: {
      fields: "First_Name,Last_Name,Email,Phone,Description,Modified_Time",

      per_page: 200,

      ...params,
    },

    headers: modifiedSince
      ? {
          "If-Modified-Since": modifiedSince,
        }
      : undefined,
  });

  return response.data;
}
