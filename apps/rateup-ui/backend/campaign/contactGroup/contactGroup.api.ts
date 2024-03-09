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
export const getContactGroupList = async () => {
  let contactGroupData: ContactGroupResponse = await axiosClient.get(
    CONTACT_GROUP_BASE_URL,
  );
  return contactGroupData;
};

export const getContactGroupsByTeamId = async (teamId: string) => {
  let contactGroupsData: ContactGroupResponse = await axiosClient.get(
    `${CONTACT_GROUP_BASE_URL}?teamId=${teamId}`,
  );
  return contactGroupsData;
};

export const getContactGroupById = async (groupId: string) => {
  let groupDataById = await axiosClient.get(
    `${CONTACT_GROUP_BASE_URL}?contactGroupId=${groupId}`,
  );
  let contacts = await getContactsByGroupId(groupId);
  groupDataById.data.contacts = contacts;
  return groupDataById?.data;
};

export const getContactsByGroupId = async (groupId: string) => {
  let contacts = await axiosClient.get(
    `${CONTACT_GROUP_BASE_URL}/${groupId}/contacts`,
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

export const deleteContactGroup = (groupId) => {
  let res = axiosClient.delete(`${CONTACT_GROUP_BASE_URL}/${groupId}`);
  return res;
};

export const updateContactGroup = (data) => {
  let res = axiosClient.put(`${CONTACT_GROUP_BASE_URL}/${data.id}`, data);
  return res;
};

export const addExistingContactsToGroup = ({ customerList, groupId }) => {
  let customerListObj = {
    contactIds: customerList,
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
  return res;
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
