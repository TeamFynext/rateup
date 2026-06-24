import type { ContactGroupType } from "@/types/enums.ts";

import { axiosClient } from "../../apiClient";

export interface ICreateContactGroup {
  name: string;
  icon: string;
  teamId: string;
}

interface _ICreateNewContact {
  name: string;
  phone?: string;
  email?: string;
}
const CONTACT_GROUP_BASE_URL = "/contact/group";
export const getContactGroupList = async (type: ContactGroupType) => {
  const contactGroupData: ContactGroupResponse = await axiosClient.get(
    `${CONTACT_GROUP_BASE_URL}?type=${type}`,
  );
  return contactGroupData?.data;
};

export const getContactGroupsByTeamId = async (teamId: string) => {
  const contactGroupsData: ContactGroupResponse = await axiosClient.get(
    `${CONTACT_GROUP_BASE_URL}?teamId=${teamId}`,
  );
  return contactGroupsData;
};

export const getContactGroupById = async (
  groupId: string,
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
) => {
  const filter = columnFilters.map((data) => `&${data.id}=${data.value}`).join("&");
  const desc = sort.desc ? "desc" : "asc";
  const groupDataById = await axiosClient.get(
    `${CONTACT_GROUP_BASE_URL}?contactGroupId=${groupId}`,
  );
  const paginationParams = `page=${pagination.pageIndex}&limit=${pagination.pageSize}&search=${search}&sort=${sort.id}&desc=${desc}${filter}`;
  const contacts = await getContactsByGroupId(groupId, paginationParams);
  groupDataById.data.contacts = contacts?.group;
  groupDataById.data.totalCount = contacts?.totalCount;
  groupDataById.data.loyaltyCustomers = contacts?.loyaltyCustomers;
  return groupDataById?.data as ContactGroupwithContacts;
};

const getContactsByGroupId = async (groupId: string, paginationParams: string) => {
  const contacts = await axiosClient.get(
    `${CONTACT_GROUP_BASE_URL}/${groupId}/contacts?${paginationParams}`,
  );
  return contacts?.data;
};

export const createContactGroup = (data: ICreateContactGroup) => {
  const res = axiosClient.post(CONTACT_GROUP_BASE_URL, data);
  return res;
};

export const addNewContact = ({ data, groupId }) => {
  const res = axiosClient.post(`${CONTACT_GROUP_BASE_URL}/${groupId}/contacts/new`, data);
  return res;
};

export const addNewContactFromCSV = ({ data, groupId }) => {
  const res = axiosClient.post(
    `${CONTACT_GROUP_BASE_URL}/${groupId}/contacts/new/importcsv`,
    data,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000,
    },
  );
  return res;
};

export const deleteContactGroup = (groupId) => {
  const res = axiosClient.delete(`${CONTACT_GROUP_BASE_URL}/${groupId}`);
  return res;
};

export const updateContactGroup = (groupId, data) => {
  const res = axiosClient.put(`${CONTACT_GROUP_BASE_URL}/${groupId}`, data);
  return res;
};

export const addExistingContactsToGroup = ({ customerList, groupId, isCustomer = false }) => {
  const customerListObj = {
    contactIds: customerList,
    isCustomer,
  };
  const res = axiosClient.post(
    `${CONTACT_GROUP_BASE_URL}/${groupId}/contacts/existing`,
    customerListObj,
  );
  return res;
};

export const removeContactsFromGroup = async ({ contactIds, groupId }) => {
  const res = await axiosClient.put(`${CONTACT_GROUP_BASE_URL}/${groupId}/contacts`, contactIds);
  return res?.data;
};

export const addExistingContactsToMultipleGroups = ({
  contactIds,
  contactGroupIds,
}: {
  contactIds: string[];
  contactGroupIds: string[];
}) => {
  const res = axiosClient.post(`${CONTACT_GROUP_BASE_URL}/contacts/existing`, {
    contactIds,
    contactGroupIds,
  });
  return res;
};

export const deleteManyContactGroups = async (contactGroupIds: string[]) => {
  return await axiosClient.delete(CONTACT_GROUP_BASE_URL, {
    data: { contactGroupIds },
  });
};

export const getContactGroupsByContactId = async (contactId: string) => {
  const res = await axiosClient.get(`${CONTACT_GROUP_BASE_URL}/contact/${contactId}`);
  return res.data;
};

export const updateContactGroupsForContact = async (
  contactId: string,
  addGroupIds: string[],
  removeGroupIds: string[],
) => {
  const res = await axiosClient.post(`${CONTACT_GROUP_BASE_URL}/contact/${contactId}/groups`, {
    addGroupIds,
    removeGroupIds,
  });
  return res;
};
