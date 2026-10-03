import type { ColumnFilterState, RequestPayload } from "@/types/api.ts";
import { downloadBlob } from "@/utils/downloadBlob.ts";

import { axiosClient } from "../../apiClient";

export interface ICreateContact {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  teamId?: string;
  source?: string;
  tags?: string[];
  external_id?: string;
}

export interface ICreateContactLabel {
  name: string;
  color?: string;
  description?: string;
}

export interface IUpdateContactLabel {
  name?: string;
  color?: string;
  description?: string;
}

export const CONTACT_BASE_URL = "/contact";

export const getContactsList = async (
  pagination: {
    pageIndex: number;
    pageSize: number;
  },
  search: string,
  sort: {
    id: string;
    desc: boolean;
  },
  columnFilters: ColumnFilterState[],
  type?: string,
) => {
  const filter = columnFilters
    .map((data) => `&${data.id}=${encodeURIComponent(String(data.value))}`)
    .join("&");
  const desc = sort.desc ? "desc" : "asc";
  const contactUrl = `${CONTACT_BASE_URL}?page=${pagination.pageIndex}&limit=${pagination.pageSize}&search=${encodeURIComponent(search)}&sort=${sort.id}&desc=${desc}${filter}&type=${type}`;
  const contactsData = await axiosClient.get(contactUrl);
  return contactsData.data as { users: ContactsData[]; totalCount: number };
};

export async function getContactById(contactId: string) {
  return (await axiosClient.get(`${CONTACT_BASE_URL}/${contactId}`)).data as ContactsData;
}

/** Everything the contact detail dialog renders — labels, groups, leads, tickets, loyalty. */
export async function getContactFullDetails(contactId: string) {
  return (await axiosClient.get(`${CONTACT_BASE_URL}/${contactId}/details`))
    .data as ContactFullDetails;
}

export const createContact = async (data: ICreateContact) => {
  const res = await axiosClient.post(CONTACT_BASE_URL, data, {
    timeout: 60000,
  });
  return res as { data: ContactsData };
};

export const importContacts = async (data: RequestPayload) => {
  const res = await axiosClient.post(`${CONTACT_BASE_URL}/importcontacts`, data);
  return res;
};

/** What the API answers once it has validated a spreadsheet and queued it (202). */
export interface ContactImportStarted {
  status: "queued";
  jobId: string;
  total: number;
  rejectedCount: number;
  duplicateCount: number;
}

export type ContactImportState = "queued" | "running" | "completed" | "failed";

/** `GET /contact/import/:jobId` — mirrors `ContactImportStatus` in rateup-api's contactImport.service.ts. */
export interface ContactImportStatus {
  jobId: string;
  state: ContactImportState;
  total: number;
  processed: number;
  created: number;
  updated: number;
  /** Already in the list and left as they were, because update-existing was off. */
  skipped: number;
  addedToGroup: number;
  /** Rows refused while validating, capped at 1,000; `rejectedCount` is exact. */
  rejected: { name: string; phone: string }[];
  rejectedCount: number;
  duplicateCount: number;
}

/**
 * Validates the file and queues it. The contacts are written by a background job, so this
 * returns in seconds even for a large file; poll `getContactImportStatus` for the outcome.
 */
export const importCSVContacts = async (data: RequestPayload) => {
  const res = await axiosClient.post<ContactImportStarted>(`${CONTACT_BASE_URL}/importcsv`, data, {
    timeout: 60000,
  });
  return res;
};

export async function getContactImportStatus(jobId: string) {
  return (await axiosClient.get<ContactImportStatus>(`${CONTACT_BASE_URL}/import/${jobId}`)).data;
}

export const deleteContact = async (contactId: string) => {
  const res = await axiosClient.delete(`${CONTACT_BASE_URL}/${contactId}`);
  return res;
};

export const deleteManyContacts = async (contactIds: string[]) => {
  const res = await axiosClient.delete(CONTACT_BASE_URL, {
    data: { contactIds },
  });
  return res;
};

export const editContact = async ({
  data,
  contactId,
}: {
  data: RequestPayload;
  contactId: string;
}) => {
  const res = await axiosClient.put(`${CONTACT_BASE_URL}/${contactId}`, data);
  return res;
};

export const editContactLabels = async ({
  data,
  contactId,
}: {
  data: RequestPayload;
  contactId: string;
}) => {
  const res = await axiosClient.put(`${CONTACT_BASE_URL}/${contactId}/labels`, data);
  return res;
};

/** A contact label as the labels endpoint returns it. */
export interface ContactLabelOption {
  id: string;
  name: string;
  color?: string;
  description?: string | null;
  createdAt?: string;
  orgId?: string;
  _count?: { contactLabels: number };
}

export const getContactLabels = async () => {
  const res = await axiosClient.get<ContactLabelOption[]>(`${CONTACT_BASE_URL}/labels`);
  return res.data;
};

export const createContactLabel = async (data: ICreateContactLabel) => {
  const res = await axiosClient.post(`${CONTACT_BASE_URL}/labels`, data);
  return res.data;
};

export const updateContactLabel = async (labelId: string, data: IUpdateContactLabel) => {
  const res = await axiosClient.put(`${CONTACT_BASE_URL}/labels/${labelId}`, data);
  return res.data;
};

export const deleteContactLabel = async (labelId: string) => {
  const res = await axiosClient.delete(`${CONTACT_BASE_URL}/labels/${labelId}`);
  return res.data;
};

export const assignContactLabelsToMultipleContacts = async (data: {
  labelIds: string[];
  contactIds: string[];
}) => {
  const res = await axiosClient.put(`${CONTACT_BASE_URL}/labels/assign`, data);
  return res.data;
};

export const assignContactLabelsToContactId = async (
  contactId: string,
  data: {
    labelIds: string[];
  },
) => {
  const res = await axiosClient.put(`${CONTACT_BASE_URL}/labels/assign/${contactId}`, data);
  return res.data;
};

export const updateLifecycleofMultipleContacts = async (data: {
  lifecycleId: string;
  contactIds: string[];
}) => {
  const res = await axiosClient.put(
    `${CONTACT_BASE_URL}/lifecycle-stage-update/${data.lifecycleId}`,
    { contactIds: data.contactIds },
  );
  return res.data;
};
/** Mirrors `contact.schema.ts`'s `z.enum([...])` for a custom field's data type. */
export type CustomFieldType = "text" | "number" | "email" | "multivalue";

export interface CustomFieldData {
  id: string;
  orgId: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: boolean;
  required?: boolean;
  type: CustomFieldType;
  createdAt: string;
  values: string;
  listValues?: string[];
}

export const getCustomField = async () => {
  const res = await axiosClient.get(`${CONTACT_BASE_URL}/custom-fields`);
  return res?.data as CustomFieldData[];
};
export const createCustomField = async (data: RequestPayload) => {
  const res = await axiosClient.post(`${CONTACT_BASE_URL}/custom-fields`, data);
  return res?.data as CustomFieldData;
};

export const updateCustomField = async (fieldId: string, data: RequestPayload) => {
  const res = await axiosClient.put(`${CONTACT_BASE_URL}/custom-fields/${fieldId}`, data);
  return res?.data as CustomFieldData;
};

export const deleteCustomField = async (fieldId: string) => {
  const res = await axiosClient.delete(`${CONTACT_BASE_URL}/custom-fields/${fieldId}`);
  return res?.data as CustomFieldData;
};

export const exportContacts = async (data: { format: "xlsx" | "ods"; fields: string[] }) => {
  const response = await axiosClient.post(`${CONTACT_BASE_URL}/export`, data, {
    responseType: "blob",
    timeout: 0,
  });
  const blob = new Blob([response.data], {
    type: response.headers["content-type"] as string,
  });

  return downloadBlob(blob, `contacts.${data.format}`);
};

export const bulkAssignStatus = async (data: RequestPayload) => {
  const res = await axiosClient.put(`${CONTACT_BASE_URL}/bulk-assign-status`, data);
  return res;
};
