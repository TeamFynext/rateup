import type { ColumnFilterState, RequestPayload } from "@/types/api.ts";
import { downloadBlob } from "@/utils/downloadBlob.ts";

import { axiosClient } from "../../apiClient";

export interface ICreateContact {
  name: string;
  phone?: string;
  email?: string;
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
  const filter = columnFilters.map((data) => `&${data.id}=${data.value}`).join("&");
  const desc = sort.desc ? "desc" : "asc";
  const contactUrl = `${CONTACT_BASE_URL}?page=${pagination.pageIndex}&limit=${pagination.pageSize}&search=${search}&sort=${sort.id}&desc=${desc}${filter}&type=${type}`;
  const contactsData = await axiosClient.get(contactUrl);
  return contactsData.data as { users: ContactsData[]; totalCount: number };
};

export async function getContactById(contactId: string) {
  return (await axiosClient.get(`${CONTACT_BASE_URL}/${contactId}`)).data as ContactsData;
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

export const importCSVContacts = async (data: RequestPayload) => {
  const res = await axiosClient.post(`${CONTACT_BASE_URL}/importcsv`, data, {
    timeout: 60000,
  });
  return res;
};

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
export interface CustomFieldData {
  id: string;
  orgId: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: boolean;
  required?: boolean;
  type: string;
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
