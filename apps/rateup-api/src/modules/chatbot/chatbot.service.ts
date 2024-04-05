import axios from "axios";
import { dataSourceUploadInput } from "./chatbot.schema";

const CHATBOT_BASEURL = `${process.env.CHATBOT_API_URL}/api/chatbot`;

export async function uploadSourceForEmbed(
  data: dataSourceUploadInput,
  jwtToken: string,
) {
  const res = await axios.post(`${CHATBOT_BASEURL}/embed-doc`, data, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
  });
  return res;
}
interface messageInput {
  query: string;
  userId: string;
  orgId: string;
}
export async function getAIResponseForQuery(data: messageInput, jwtToken) {
  const res = await axios.post(CHATBOT_BASEURL, data, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
  });
  return res;
}

export async function uploadFileForAIEmbed(data, jwtToken) {
  const res = await axios.post(`${CHATBOT_BASEURL}/embed-doc/file`, data, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${jwtToken}`,
    },
  });
  return res;
}
