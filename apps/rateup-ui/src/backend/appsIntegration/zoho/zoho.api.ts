import { axiosClient } from "@/backend/apiClient";

const ZOHO_BASE_URL = "/integration/external/zoho";

export async function getZohoContacts(
  orgId: string,
  product: "crm" | "bigin" = "crm",
) {
  return (
    await axiosClient.get(`${ZOHO_BASE_URL}/contacts`, {
      params: {
        orgId,
        product,
      },
    })
  ).data;
}

export async function syncZohoContacts(product: "crm" | "bigin" = "crm") {
  return (
    await axiosClient.post(`${ZOHO_BASE_URL}/contacts/sync?product=${product}`)
  ).data;
}

export async function getZohoLeads(orgId: string) {
  return (
    await axiosClient.get(`${ZOHO_BASE_URL}/leads`, {
      params: {
        orgId,
      },
    })
  ).data;
}

export async function getZohoUsers(
  orgId: string,
  product: "crm" | "bigin" = "crm",
) {
  return (
    await axiosClient.get(`${ZOHO_BASE_URL}/users`, {
      params: {
        orgId,
        product,
      },
    })
  ).data;
}

export async function getZohoPipelines(product: string) {
  return (
    await axiosClient.get(`${ZOHO_BASE_URL}/pipelines`, {
      params: {
        product,
      },
    })
  ).data;
}

export async function syncZohoLeads() {
  return (await axiosClient.post(`${ZOHO_BASE_URL}/leads/sync`)).data;
}

export async function unsubscribeZoho(orgId: string) {
  return (await axiosClient.post(`${ZOHO_BASE_URL}/unsubscribe/${orgId}`)).data;
}
