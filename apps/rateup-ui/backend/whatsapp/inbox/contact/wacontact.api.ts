import { WA_INBOX_BASE_PATH } from "..";
import { WaContact } from "../../../../types/global";
import { axiosClient } from "../../../apiClient";
const WA_CONTACT_BASE_PATH = `${WA_INBOX_BASE_PATH}/contact`;

//add multiple wa contacts
export async function addMultipleWaContacts(contactIds: string[]) {
  return await axiosClient.post(`${WA_CONTACT_BASE_PATH}/`, {
    contactIds,
  });
}

//get all wa contacts under an oraganization
export async function getAllWaContacts() {
  return (await axiosClient.get(`${WA_CONTACT_BASE_PATH}/`))
    .data as WaContact[];
}

//get wa contact by waContactId
export async function getWaContactByWaContactId(waContactId: string) {
  return (await axiosClient.get(`${WA_CONTACT_BASE_PATH}/${waContactId}`))
    .data as WaContact;
}
