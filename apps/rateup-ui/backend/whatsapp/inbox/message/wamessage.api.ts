import { WA_INBOX_BASE_PATH } from "..";
import {
  WaInboxMessageBody,
  WaTemplateComponent,
} from "../../../../types/global";
import { axiosClient } from "../../../apiClient";
const WA_CONTACT_BASE_PATH = `${WA_INBOX_BASE_PATH}/message`;

export type WaGetMessagesBody = {
  id: string;
  waContctId: string;
  createdAt: string;
  waCreatedAt: string;
  messageBody: WaInboxMessageBody;
  templateComponentParams: WaTemplateComponent[];
};
export async function getMessagesByWaContactId(waContactId: string) {
  return (await axiosClient.get(`${WA_CONTACT_BASE_PATH}/${waContactId}`))
    .data as WaGetMessagesBody[];
}

export async function sendNewWaMessage(waContactId: string, message: any) {
  return await axiosClient.post(
    `${WA_CONTACT_BASE_PATH}/${waContactId}`,
    message,
  );
}
