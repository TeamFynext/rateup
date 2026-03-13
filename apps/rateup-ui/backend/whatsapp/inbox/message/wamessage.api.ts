import dayjs from "dayjs";

import { MessagePlatform } from "@/types/enums";

import { WA_INBOX_BASE_PATH } from "..";
import {
  IgReceiveMessageBody,
  IgSendMessageBody,
  WaInboxMessage,
  WaReceiveMessageBody,
  WaSendMessageBody,
  WaTemplateComponent,
} from "../../../../types/global";
import { axiosClient } from "../../../apiClient";

const WA_CONTACT_BASE_PATH = `${WA_INBOX_BASE_PATH}/message`;

export type WaGetMessagesBody = {
  id: string;
  waContctId: string;
  createdAt: string;
  waCreatedAt: string;
  messageBody: WaInboxMessage;
  templateComponentParams: WaTemplateComponent[];
  stats?: { read: string; delivered: string; sent: string; failed: string };
  sender?: {
    name?: string;
    profilePhoto?: string;
  };
  messageId?: string;
  readUsers?: string[];
  reactionMessage?: {
    id: string;
    messageBody: any;
    createdAt: string;
    sender?: {
      name?: string;
      profilePhoto?: string;
    };
  };
  sourcePlatform: MessagePlatform;
  sourceIdentifier: string;
};

export type WaMessagePage = {
  messages: WaGetMessagesBody[];
  nextCursor: string;
  hasNextPage: boolean;
};

export async function getMessagesByContactId(
  contactId: string,
  cursor: string,
  selectedPhone: string,
) {
  return (
    await axiosClient.get(
      `${WA_CONTACT_BASE_PATH}/${contactId}?cursor=${cursor}&phone=${selectedPhone}`,
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
    sourcePlatform: MessagePlatform;
    sourceIdentifier: string;
  };
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  lastReceivedMessageTimeStamp: string;
  total_contact_count?: string;
  unReadMessageCount?: number;
  assignedUsers: { id: string; name: string; teamId: string }[];
  messages: Partial<WaGetMessagesBody>[];
};
type ContactsWithLastMessageResponse = {
  rows: ContactsWithLastMessage[];
  nextOffset: number | null;
};

export async function getChatFilterData() {
  return (await axiosClient.get(`${WA_CONTACT_BASE_PATH}/filterdata`)).data;
}

export async function getFilteredContacts(filterData: string, page: number) {
  return (
    await axiosClient.get(
      `${WA_CONTACT_BASE_PATH}/contactsfiltered?filterData=${filterData}&page=${page}`,
      {
        timeout: 16000,
      },
    )
  ).data as ContactsWithLastMessageResponse;
}
type assignedTo = {
  name: string;
  recipeName: string | null;
  phone: string | null;
};
type comments = {
  id: string;
  text: string;
  createdById: string;
  createdAt: string;
  ticketId: string;
};
type tickets = {
  id: string;
  number: number;
  title: string;
  description: string;
  type: string;
  createdById: string;
  createdAt: string;
  status: string;
  priority: string;
  teamId: string;
  deadline: string | null;
  assignedToId: string;
  reviewId: string | null;
  surveyResponseId: string;
  comments: comments[];
  assignedTo: assignedTo;
};

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
      { responseType: "arraybuffer", timeout: 0 },
    )
  ).data;
}

export async function getWaChatMediaFile(mediaId: string) {
  try {
    const response = await axiosClient.get(
      `${WA_CONTACT_BASE_PATH}/mediafile/${mediaId}`,
      {
        responseType: "arraybuffer", // Ensure the response is returned as raw binary data
      },
    );

    // Convert the binary data to a Blob and return it
    return new Blob([response.data]);
  } catch (error) {
    console.error("Error fetching media file:", error);
    throw error;
  }
}

export async function assignInboxToUser(data: {
  contactId: string;
  assignees: { userId: string; teamId: string }[];
  messageId: string; // for internal message
}): Promise<{ id: string; name: string }[]> {
  return (await axiosClient.post(`${WA_CONTACT_BASE_PATH}/assign`, data)).data;
}

export async function bulkAssignInboxToUser(data: {
  contactIds: string[];
  assignee: { userId: string; teamId: string };
}) {
  return (await axiosClient.post(`${WA_CONTACT_BASE_PATH}/assign-bulk`, data))
    .data;
}

export async function getAssignedUserForContact(contactId) {
  return (await axiosClient.get(`${WA_CONTACT_BASE_PATH}/assign/${contactId}`))
    .data;
}

export async function getInboxUserCount() {
  return (
    await axiosClient.get(`${WA_CONTACT_BASE_PATH}/count`, { timeout: 30000 })
  ).data;
}

export async function markWaMessagesAsRead(contactId) {
  return (await axiosClient.post(`${WA_CONTACT_BASE_PATH}/mark/${contactId}`))
    .data;
}

export async function blockWhatsAppUser(data: { phoneNumbersList: string[] }) {
  return (await axiosClient.post(`${WA_CONTACT_BASE_PATH}/block-user`, data))
    .data;
}

export async function unblockWhatsAppUser(data: {
  phoneNumbersList: string[];
}) {
  return (await axiosClient.post(`${WA_CONTACT_BASE_PATH}/unblock-user`, data))
    .data;
}

export async function getInboxAnalytics() {
  return (await axiosClient.get(`${WA_CONTACT_BASE_PATH}/analytics`)).data;
}

export async function generateInboxResponse(data) {
  return (
    await axiosClient.post(`${WA_CONTACT_BASE_PATH}/generate-response`, data)
  ).data;
}

export async function createPrivateMessage(contactId, data) {
  return (
    await axiosClient.post(
      `${WA_CONTACT_BASE_PATH}/privatemessage/${contactId}`,
      data,
    )
  ).data;
}
