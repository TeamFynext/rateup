import { ChatBotDataSourceType } from "../../types/enums";
import { axiosClient, axiosClientIP } from "../apiClient";

const CHATBOT_BASEURL = "/chatbot";
const CHATBOT_PUBLIC_BASEURL = "/public/chatbot";

interface ChatbotMessage {
  query: string;
}

export interface ChatbotResourses {
  contentSource: string;
  contentType: ChatBotDataSourceType;
}
export async function sendChatbotMessage(data: ChatbotMessage) {
  const res = await axiosClient.post(CHATBOT_BASEURL, data, { timeout: 0 });
  return res?.data;
}

export async function sendPublicChatbotMessage(data) {
  const res = await axiosClientIP.post(CHATBOT_PUBLIC_BASEURL, data, {
    timeout: 0,
  });
  return res?.data;
}

export async function uploadSourceForEmbed(data) {
  const res = await axiosClient.post(`${CHATBOT_BASEURL}/embed-doc`, data, {
    timeout: 0,
  });
  return res?.data;
}

export async function uploadFileForEmbed(file) {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const response = await axiosClient.post(
      `${CHATBOT_BASEURL}/embed-doc/file`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 0,
      },
    );
    return response;
  } catch (error) {
    throw error?.response?.data?.message;
  }
}

export async function getChatbotResources() {
  const res = await axiosClient.get(CHATBOT_BASEURL);
  return res?.data as Array<ChatbotResourses>;
}

export async function deleteChatbotResource(data) {
  return await axiosClient.delete(`${CHATBOT_BASEURL}/delete-source`, { data });
}

export async function deleteManyChatbotResource(data) {
  return await axiosClient.delete(`${CHATBOT_BASEURL}/delete-many-sources`, {
    data,
  });
}

export async function deleteChatHistory() {
  return await axiosClient.delete(`${CHATBOT_BASEURL}/delete-chat-history`);
}

export async function deletePublicChatHistory({ userId }) {
  return await axiosClientIP.delete(`${CHATBOT_PUBLIC_BASEURL}/${userId}`);
}
