import axios from "axios";

export type ZohoProduct = "crm" | "bigin";

function getZohoApiPath(product: ZohoProduct = "crm") {
  switch (product) {
    case "crm":
      return "/crm/v8";
    case "bigin":
      return "/bigin/v2";
    default:
      throw new Error(`Unsupported Zoho product: ${product}`);
  }
}

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
  product: ZohoProduct = "crm",
) {
  const client = createZohoAxios(accessToken, baseUrl);
  const response = await client.post(`${getZohoApiPath(product)}/Contacts`, {
    data: [data],
  });
  return response.data;
}

export async function updateZohoContact(
  accessToken: string,
  contactId: string,
  data: Record<string, any>,
  baseUrl?: string,
  product: ZohoProduct = "crm",
) {
  const client = createZohoAxios(accessToken, baseUrl);
  const response = await client.put(
    `${getZohoApiPath(product)}/Contacts/${contactId}`,
    {
      data: [data],
    },
  );
  return response.data;
}

export async function getZohoContacts(
  accessToken: string,
  baseUrl?: string,
  params?: Record<string, any>,
  modifiedSince?: string,
  product: ZohoProduct = "crm",
) {
  const client = createZohoAxios(accessToken, baseUrl);
  const response = await client.get(`${getZohoApiPath(product)}/Contacts`, {
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
  product: ZohoProduct = "crm",
) {
  const client = createZohoAxios(accessToken, baseUrl);
  const response = await client.delete(
    `${getZohoApiPath(product)}/Contacts/${contactId}`,
  );
  return response.data;
}

export async function createZohoLead(
  accessToken: string,
  data: Record<string, any>,
  baseUrl?: string,
) {
  const client = createZohoAxios(accessToken, baseUrl);
  const response = await client.post("/crm/v8/Leads", {
    data: [data],
  });
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
      fields:
        "First_Name,Last_Name,Email,Phone,Description,Lead_Status,Modified_Time",
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

export async function updateZohoLead(
  accessToken: string,
  leadId: string,
  data: Record<string, any>,
  baseUrl?: string,
) {
  const client = createZohoAxios(accessToken, baseUrl);
  const response = await client.put(`/crm/v8/Leads/${leadId}`, {
    data: [data],
  });
  return response.data;
}
