import { ContactGroupType } from "@/types/enums";

import { axiosClient } from "../../apiClient";

export interface ICreateContactGroup {
  name: string;
  icon: string;
  teamId: string;
}

export interface ICreateNewContact {
  name: string;
  phone?: string;
  email?: string;
}
const CONTACT_GROUP_BASE_URL = "/contact/group";
export const getContactGroupList = async (type: ContactGroupType) => {
  let contactGroupData: ContactGroupResponse = await axiosClient.get(
    `${CONTACT_GROUP_BASE_URL}?type=${type}`,
  );
  return contactGroupData?.data;
};

export const getContactGroupsByTeamId = async (teamId: string) => {
  let contactGroupsData: ContactGroupResponse = await axiosClient.get(
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
  let filter = columnFilters
    .map((data) => `&${data.id}=${data.value}`)
    .join("&");
  let desc = sort.desc ? "desc" : "asc";
  let groupDataById = await axiosClient.get(
    `${CONTACT_GROUP_BASE_URL}?contactGroupId=${groupId}`,
  );
  let paginationParams = `page=${pagination.pageIndex}&limit=${pagination.pageSize}&search=${search}&sort=${sort.id}&desc=${desc}${filter}`;
  let contacts = await getContactsByGroupId(groupId, paginationParams);
  groupDataById.data.contacts = contacts?.group;
  groupDataById.data.totalCount = contacts?.totalCount;
  groupDataById.data.loyaltyCustomers = contacts?.loyaltyCustomers;
  return groupDataById?.data as ContactGroupwithContacts;
};

export const getContactsByGroupId = async (
  groupId: string,
  paginationParams: string,
) => {
  let contacts = await axiosClient.get(
    `${CONTACT_GROUP_BASE_URL}/${groupId}/contacts?${paginationParams}`,
  );
  return contacts?.data;
};

export const createContactGroup = (data: ICreateContactGroup) => {
  let res = axiosClient.post(CONTACT_GROUP_BASE_URL, data);
  return res;
};

export const addNewContact = ({ data, groupId }) => {
  let res = axiosClient.post(
    `${CONTACT_GROUP_BASE_URL}/${groupId}/contacts/new`,
    data,
  );
  return res;
};

export const addNewContactFromCSV = ({ data, groupId }) => {
  let res = axiosClient.post(
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
  let res = axiosClient.delete(`${CONTACT_GROUP_BASE_URL}/${groupId}`);
  return res;
};

export const updateContactGroup = (groupId, data) => {
  let res = axiosClient.put(`${CONTACT_GROUP_BASE_URL}/${groupId}`, data);
  return res;
};

export const addExistingContactsToGroup = ({
  customerList,
  groupId,
  isCustomer = false,
}) => {
  let customerListObj = {
    contactIds: customerList,
    isCustomer,
  };
  let res = axiosClient.post(
    `${CONTACT_GROUP_BASE_URL}/${groupId}/contacts/existing`,
    customerListObj,
  );
  return res;
};

export const removeContactsFromGroup = async ({ contactIds, groupId }) => {
  let res = await axiosClient.put(
    `${CONTACT_GROUP_BASE_URL}/${groupId}/contacts`,
    contactIds,
  );
  return res?.data;
};

export const addExistingContactsToMultipleGroups = ({
  contactIds,
  contactGroupIds,
}: {
  contactIds: string[];
  contactGroupIds: string[];
}) => {
  let res = axiosClient.post(`${CONTACT_GROUP_BASE_URL}/contacts/existing`, {
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
