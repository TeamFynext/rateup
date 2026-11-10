import axios from "@/config/axios";
import { ICreateContact } from "../types";
import { ContactsWithLastMessageResponse } from "../types";
import { describeError, logger } from "@/utils/logger";

export const createContact = async (data: ICreateContact) => {
  const response = await axios.post("/api/contacts", data);
  return response.data;
};

export const assignedContact = async (contactId: string) => {
  const response = await axios.get(`/api/inbox/message/assign/${contactId}`);
  return response.data;
};

export const markMessageAsRead = async (contactId: string) => {
  await axios.post(`/api/inbox/message/mark/${contactId}`);
};

export const getContactById = async (contactId: string) => {
  const res = await axios.get(`/api/contacts/${contactId}`);
  return res.data;
};

export const editContactById = async (contactId: string, data: any) => {
  const res = await axios.put(`/api/contacts/${contactId}`, data);
  return res.data;
};

export const closeChat = async (contactId: string, data: any) => {
  const res = await axios.put(`/api/contacts/${contactId}`, data);
  return res.data;
};

export async function assignInboxToUser(data: {
  contactId: string;
  assignedUserIds: string[];
  teamId: string;
}) {
  await axios.post("/api/inbox/message/assign", data);
}

/**
 * Sets (does not toggle) the star flag. The flag lives on the conversation, so
 * each of a contact's tickets stars independently — same endpoint the web
 * inbox uses.
 */
export async function setConversationFavorite(data: {
  conversationId: string;
  isFavorite: boolean;
}) {
  return (await axios.post(`/api/inbox/message/favorite`, data)).data as {
    success: boolean;
    isFavorite: boolean;
  };
}

export const filteredContactsCount = async () => {
  const res = await axios.get(`/api/inbox/message/count`);
  return res.data;
};

export const getFilteredContacts = async (filterData: string, page: number) => {
  try {
    const response = await axios.get<ContactsWithLastMessageResponse>(
      `/api/inbox/message/contactsfiltered`,
      {
        params: {
          filterData,
          page,
        },
      },
    );
    return response.data;
  } catch (error: any) {
    logger.error("Failed to fetch filtered contacts:", describeError(error));
    throw new Error("Failed to load contacts.");
  }
};

export async function getChatFilterData() {
  return (await axios.get(`/api/inbox/message/filterdata`)).data;
}

export const editContact = async ({ data, contactId }: { data: any; contactId: string }) => {
  let res = await axios.put(`/api/contacts/${contactId}`, data);
  return res;
};
