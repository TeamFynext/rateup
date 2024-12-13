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
  stats?: { read: string; delivered: string; sent: string; error: string };
  sender?: {
    name?: string;
    profile_photo?: string;
  };
};

export type WaMessagePage = {
  messages: WaGetMessagesBody[];
  nextCursor: string;
};

export async function getMessagesByContactId(
  contactId: string,
  cursor: string,
) {
  return (
    await axiosClient.get(
      `${WA_CONTACT_BASE_PATH}/${contactId}?cursor=${cursor}`,
    )
  ).data as WaMessagePage;
}

export async function sendNewWaMessage(contactId: string, message: any) {
  return await axiosClient.post(
    `${WA_CONTACT_BASE_PATH}/${contactId}`,
    message,
  );
}

export type ContactsWithLastMessage = ContactsData & {
  groups?: string[];
  lastMessage: {
    waCreatedAt: string;
    messageBody: WaInboxMessage;
  };
  userInitiatedFinalTimeStamp: string;
  total_contact_count?: string;
};
export async function getContactsWithLastMessage(page: number) {
  return (
    await axiosClient.get(`${WA_CONTACT_BASE_PATH}/contacts?page=${page}`)
  ).data as ContactsWithLastMessage[];
}

export async function getChatFilterData() {
  return (await axiosClient.get(`${WA_CONTACT_BASE_PATH}/filterdata`)).data;
}
export async function getMessageCount() {
  return (await axiosClient.get(`${WA_CONTACT_BASE_PATH}/messagecount`)).data;
}
export async function getFilteredContacts(filterData: string, page: number) {
  return (
    await axiosClient.get(
      `${WA_CONTACT_BASE_PATH}/contactsfiltered?filterData=${filterData}&page=${page}`,
    )
  ).data as ContactsWithLastMessage[];
}

export async function exportWaChats({
  constraints,
  filterData,
}: {
  constraints: string;
  filterData: string;
}) {
  return (
    await axiosClient.post(
      `${WA_CONTACT_BASE_PATH}/exportmessages?constraints=${constraints}&filterData=${filterData}`,
      {},
      { responseType: "arraybuffer" },
    )
  ).data;
}
