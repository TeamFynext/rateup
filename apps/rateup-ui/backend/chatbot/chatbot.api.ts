import { axiosClient } from "../apiClient";

const CHATBOT_BASEURL = "/chatbot";
interface ChatbotMessage {
  query: string;
}
export async function sendChatbotMessage(data: ChatbotMessage) {
  const res = await axiosClient.post(CHATBOT_BASEURL, data, { timeout: 0 });
  return res.data;
}

export async function uploadSourceForEmbed(data) {
  const res = await axiosClient.post(`${CHATBOT_BASEURL}/embed-doc`, data, {
    timeout: 0,
  });
  return res.data;
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
