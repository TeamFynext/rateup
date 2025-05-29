import {
  ChatBotDataSourceType,
  ChatbotPublicPageStatus,
} from "../../types/enums";
import { axiosClient, axiosClientIP } from "../apiClient";

const CHATBOT_BASEURL = "/chatbot";
const CHATBOT_PUBLIC_BASEURL = "/public/chatbot";

interface ChatbotMessage {
  query: string;
  chatbotId: string;
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

export async function uploadFileForEmbed(file, selectedChatbotId) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("chatbotId", selectedChatbotId);
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

export async function getChatbotResources(chatbotId: string) {
  const res = await axiosClient.get(CHATBOT_BASEURL, {
    params: { chatbotId },
  });
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

export async function getChatbotPublicPageStatus(chatbotId) {
  return (await axiosClientIP.get(`${CHATBOT_PUBLIC_BASEURL}/${chatbotId}`))
    ?.data as { publicPageStatus: ChatbotPublicPageStatus };
}

export async function getChatbotDetails(chatbotId: string) {
  return (await axiosClient.get(`${CHATBOT_BASEURL}/chatbot/${chatbotId}`))
    .data;
}
export async function getAllChatbots() {
  return (await axiosClient.get(`${CHATBOT_BASEURL}/chatbots`)).data;
}

export async function createChatbot({ name }: { name: string }) {
  return (await axiosClient.post(`${CHATBOT_BASEURL}/chatbot`, { name })).data;
}

type IChatbotUpdate = {
  publicPageStatus?: ChatbotPublicPageStatus;
  enableWaChat?: boolean;
  waCommand?: string;
  waPrompt?: string;
  enableAllWaChat?: boolean;
};

type IUpdateChatbotArgs = {
  chatbotId: string;
  data: IChatbotUpdate;
};

export async function updateChatbot({ chatbotId, data }: IUpdateChatbotArgs) {
  return await axiosClient.put(`${CHATBOT_BASEURL}/chatbot/${chatbotId}`, data);
}

export async function getUserAiChats(chatbotId: string) {
  return (await axiosClient.get(`${CHATBOT_BASEURL}/chathistory/${chatbotId}`))
    .data;
}

export async function deleteChatbot(chatbotId: string) {
  return (await axiosClient.delete(`${CHATBOT_BASEURL}/chatbot/${chatbotId}`))
    .data;
}
