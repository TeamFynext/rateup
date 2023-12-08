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

export const getContactGroupList = async () => {
  let contactGroupData: ContactGroupResponse =
    await axiosClient.get("/contact/group/");
  return contactGroupData;
};

export const getContactGroupsByTeamId = async (teamId: string) => {
  let contactGroupsData: ContactGroupResponse = await axiosClient.get(
    `/contact/group?teamId=${teamId}`,
  );
  return contactGroupsData;
};

export const getContactGroupById = async (groupId: string) => {
  let groupDataById = await axiosClient.get(
    `/contact/group?contactGroupId=${groupId}`,
  );
  let contacts = await getContactsByGroupId(groupId);
  groupDataById.data.contacts = contacts;
  return groupDataById?.data;
};

export const getContactsByGroupId = async (groupId: string) => {
  let contacts = await axiosClient.get(`/contact/group/${groupId}/contacts`);
  return contacts?.data;
};

export const createContactGroup = (data: ICreateContactGroup) => {
  let res = axiosClient.post("/contact/group/", data);
  return res;
};

export const addNewContact = ({ data, groupId }) => {
  let res = axiosClient.post(`/contact/group/${groupId}/contacts/new`, data);
  return res;
};

export const deleteContactGroup = (groupId) => {
  let res = axiosClient.delete(`/contact/group/${groupId}`);
  return res;
};

export const updateContactGroup = (data) => {
  let res = axiosClient.put(`/contact/group/${data.id}`, data);
  return res;
};

export const addExistingContactsToGroup = ({ customerList, groupId }) => {
  let customerListObj = {
    contactIds: customerList,
  };
  let res = axiosClient.post(
    `/contact/group/${groupId}/contacts/existing`,
    customerListObj,
  );
  return res;
};

export const removeContactsFromGroup = async ({ contactIds, groupId }) => {
  let res = await axiosClient.put(
    `contact/group/${groupId}/contacts`,
    contactIds,
  );
  return res;
};
