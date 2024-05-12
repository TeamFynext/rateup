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
};
export async function getContactsWithLastMessage() {
  const contacts = (await axiosClient.get(`${WA_CONTACT_BASE_PATH}/contacts`))
    .data as ContactsWithLastMessage[];

  const contactsWithLastMessage = contacts.filter(
    (c) => c.lastMessage.messageBody !== null,
  );
  const contactsWithoutLastMessage = contacts.filter(
    (c) => c.lastMessage.messageBody === null,
  );

  const sortedContacts = contactsWithLastMessage.sort((a, b) => {
    const aDate = new Date(a.lastMessage.waCreatedAt);
    const bDate = new Date(b.lastMessage.waCreatedAt);
    return bDate.getTime() - aDate.getTime();
  });

  return [...sortedContacts, ...contactsWithoutLastMessage];
}
