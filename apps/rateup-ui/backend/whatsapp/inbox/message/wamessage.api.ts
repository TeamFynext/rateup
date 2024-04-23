import { WA_INBOX_BASE_PATH } from "..";
import { WaInboxMessage, WaTemplateComponent } from "../../../../types/global";
import { axiosClient } from "../../../apiClient";
const WA_CONTACT_BASE_PATH = `${WA_INBOX_BASE_PATH}/message`;

export type WaGetMessagesBody = {
  id: string;
  waContctId: string;
  createdAt: string;
  waCreatedAt: string;
  messageBody: WaInboxMessage;
  templateComponentParams: WaTemplateComponent[];
};
export async function getMessagesByContactId(contactId: string) {
  return (await axiosClient.get(`${WA_CONTACT_BASE_PATH}/${contactId}`))
    .data as WaGetMessagesBody[];
}

export async function sendNewWaMessage(contactId: string, message: any) {
  return await axiosClient.post(
    `${WA_CONTACT_BASE_PATH}/${contactId}`,
    message,
  );
}

export type ContactsWithLastMessage = ContactsData & {
  WaMessage: {
    waCreatedAt: Date;
    messageBody: WaInboxMessage;
  }[];
};
export async function getContactsWithLastMessage() {
  return (await axiosClient.get(`${WA_CONTACT_BASE_PATH}/contacts`))
    .data as ContactsWithLastMessage[];
}
