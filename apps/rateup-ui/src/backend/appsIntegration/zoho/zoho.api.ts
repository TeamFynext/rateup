import { axiosClient } from "@/backend/apiClient";

const ZOHO_BASE_URL = "/integration/external/zoho";

export async function getZohoContacts(orgId: string) {
  return (
    await axiosClient.get(`${ZOHO_BASE_URL}/contacts`, {
      params: {
        orgId,
      },
    })
  ).data;
}

export async function syncZohoContacts() {
  return (await axiosClient.post(`${ZOHO_BASE_URL}/contacts/sync`)).data;
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

export async function syncZohoLeads() {
  return (await axiosClient.post(`${ZOHO_BASE_URL}/leads/sync`)).data;
}
