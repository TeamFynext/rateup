import { axiosClient } from "@/backend/apiClient";

const ZOHO_BASE_URL = "/integration/external/zoho";

/** A Zoho/Bigin user who can own synced records. */
export interface ZohoUser {
  id: string;
  name: string;
  email?: string;
}

/** A pipeline, sub-pipeline or stage, as the pipelines endpoint returns them. */
export interface ZohoPipelineEntry {
  id: string | number;
  name: string;
  /** Bigin sends the stage/pipeline's stored value alongside its label. */
  value?: string;
  requiredFields?: ZohoField[];
}

export interface ZohoPipelines {
  pipelines: ZohoPipelineEntry[];
  subPipelines: ZohoPipelineEntry[];
  stages: ZohoPipelineEntry[];
}

/** The users endpoint has been seen returning both a bare list and a nested one. */
export interface ZohoUsersResponse {
  users?: ZohoUser[] | { users?: ZohoUser[] };
}

/** A field on a Zoho module, used to build the required-field form. */
export interface ZohoField {
  apiName: string;
  label?: string;
  dataType?: string;
  required?: boolean;
}

export async function getZohoContacts(orgId: string, product: "crm" | "bigin" = "crm") {
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
  return (await axiosClient.post(`${ZOHO_BASE_URL}/contacts/sync?product=${product}`)).data;
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

export async function getZohoUsers(orgId: string, product: "crm" | "bigin" = "crm") {
  return (
    await axiosClient.get<ZohoUsersResponse>(`${ZOHO_BASE_URL}/users`, {
      params: {
        orgId,
        product,
      },
    })
  ).data;
}

export async function getZohoPipelines(product: string) {
  return (
    await axiosClient.get<ZohoPipelines>(`${ZOHO_BASE_URL}/pipelines`, {
      params: {
        product,
      },
    })
  ).data;
}

export async function syncZohoLeads() {
  return (await axiosClient.post(`${ZOHO_BASE_URL}/leads/sync`)).data;
}
