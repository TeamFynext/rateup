import { ContactGroupType } from "@/types/enums";

import { axiosClient } from "../../apiClient";

export interface ICreateContact {
  name: string;
  phone?: string;
  email?: string;
  teamId?: string;
  source?: string;
  tags?: any;
  external_id?: string;
}

const CONTACT_BASE_URL = "/contact";

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
  columnFilters: { id: string; value: string }[],
  type?: string,
) => {
  let filter = columnFilters
    .map((data) => `&${data.id}=${data.value}`)
    .join("&");
  let desc = sort.desc ? "desc" : "asc";
  let contactUrl = `${CONTACT_BASE_URL}?page=${pagination.pageIndex}&limit=${pagination.pageSize}&search=${search}&sort=${sort.id}&desc=${desc}${filter}&type=${type}`;
  let contactsData = await axiosClient.get(contactUrl);
  return contactsData.data as { users: ContactsData[]; totalCount: number };
};

export async function getContactById(contactId: string) {
  return (await axiosClient.get(`${CONTACT_BASE_URL}/${contactId}`))
    .data as ContactsData;
}

export const createContact = async (data: ICreateContact) => {
  let res = await axiosClient.post(CONTACT_BASE_URL, data);
  return res as { data: ContactsData };
};

export const importContacts = async (data) => {
  let res = await axiosClient.post(`${CONTACT_BASE_URL}/importcontacts`, data);
  return res;
};

export const importCSVContacts = async (data) => {
  let res = await axiosClient.post(`${CONTACT_BASE_URL}/importcsv`, data, {
    timeout: 60000,
  });
  return res;
};

export const deleteContact = async (contactId: string) => {
  let res = await axiosClient.delete(`${CONTACT_BASE_URL}/${contactId}`);
  return res;
};

export const deleteManyContacts = async (contactIds: string[]) => {
  let res = await axiosClient.delete(CONTACT_BASE_URL, {
    data: { contactIds },
  });
  return res;
};

export const editContact = async ({ data, contactId }) => {
  let res = await axiosClient.put(`${CONTACT_BASE_URL}/${contactId}`, data);
  return res;
};

export const editContactLabels = async ({ data, contactId }) => {
  let res = await axiosClient.put(
    `${CONTACT_BASE_URL}/${contactId}/labels`,
    data,
  );
  return res;
};
export type CustomFieldData = {
  id: string;
  orgId: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: boolean;
  type: string;
  createdAt: string;
  values: string;
  listValues?: string[];
};

export const getCustomField = async () => {
  let res = await axiosClient.get(`${CONTACT_BASE_URL}/custom-fields`);
  return res?.data as CustomFieldData[];
};
export const createCustomField = async (data) => {
  let res = await axiosClient.post(`${CONTACT_BASE_URL}/custom-fields`, data);
  return res?.data as CustomFieldData;
};

export const updateCustomField = async (fieldId: string, data) => {
  let res = await axiosClient.put(
    `${CONTACT_BASE_URL}/custom-fields/${fieldId}`,
    data,
  );
  return res?.data as CustomFieldData;
};

export const deleteCustomField = async (fieldId: string) => {
  let res = await axiosClient.delete(
    `${CONTACT_BASE_URL}/custom-fields/${fieldId}`,
  );
  return res?.data as CustomFieldData;
};
