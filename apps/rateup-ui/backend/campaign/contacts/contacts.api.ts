import { axiosClient } from "../../apiClient";

export interface ICreateContact {
  name: string;
  phone?: string;
  email?: string;
  teamId: string;
  source?: string;
}

const CONTACT_BASE_URL = "/contact";

export const getContactsList = async () => {
  let contactsData: ContactsResponse = await axiosClient.get(CONTACT_BASE_URL);
  return contactsData.data as ContactsData[];
};

export async function getContactsNotInWaContact() {
  return (await axiosClient.get(`${CONTACT_BASE_URL}/notinwa`))
    .data as ContactsData[];
}
export const createContact = async (data: ICreateContact) => {
  let res = await axiosClient.post(CONTACT_BASE_URL, data);
  return res;
};

export const importContacts = async (data) => {
  let res = await axiosClient.post(`${CONTACT_BASE_URL}/importcontacts`, data);
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
