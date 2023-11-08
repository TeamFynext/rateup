import { axiosClient } from "../../apiClient";

export interface ICreateContact {
  name: string;
  phone?: string;
  email?: string;
  teamId: string;
}

export const getContactsList = async () => {
  let contactsData: ContactsResponse = await axiosClient.get("/contact/");
  return contactsData;
};

export const getContactListByTeamId = async (teamId: string) => {
  let contactsData: ContactsResponse = await axiosClient.get(
    `/contact?teamId=${teamId}`,
  );
  return contactsData;
};

export const createContact = async (data: ICreateContact) => {
  let res = await axiosClient.post("/contact/", data);
  return res;
};

export const deleteContact = (contactId: string) => {
  let res = axiosClient.delete(`/contact/${contactId}`);
  return res;
};
