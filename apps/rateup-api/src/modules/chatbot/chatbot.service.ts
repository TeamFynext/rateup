import axios from "axios";
import { dataSourceUploadInput } from "./chatbot.schema";
import { getShortUrlId } from "../../utils/commnUtils";
import prisma from "../../utils/prisma";
import { FastifyRequest } from "fastify";
import { getAxiosAIClient } from "./chatbot.controller";
import { log } from "../../utils/logger";

const CHATBOT_BASEURL = `${process.env.CHATBOT_API_URL}/api/chatbot`;
const CHATBOT_PUBLIC_BASEURL = `${process.env.CHATBOT_API_URL}/api/public/chatbot`;
export const AI_API_URL = `${process.env.CHATBOT_API_URL}/api`;

export async function uploadSourceForEmbed(
  data: dataSourceUploadInput,
  jwtToken: string,
) {
  return await axios.post(`${CHATBOT_BASEURL}/embed-doc`, data, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
  });
}
interface messageInput {
  query: string;
  userId: string;
  orgId: string;
}
export async function getAIResponseForQuery(data: messageInput, jwtToken) {
  return await axios.post(CHATBOT_BASEURL, data, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
  });
}

export async function getPublicAIResponseForQuery(data) {
  return await axios.post(CHATBOT_PUBLIC_BASEURL, data, {
    headers: {
      Accept: "application/json",
    },
  });
}

export async function uploadFileForAIEmbed(data, jwtToken) {
  return await axios.post(`${CHATBOT_BASEURL}/embed-doc/file`, data, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${jwtToken}`,
    },
  });
}

export async function getUploadedSources(jwtToken) {
  const res = await axios.get(CHATBOT_BASEURL, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
  });
  return res?.data;
}

export async function deleteEmbeddedSource(data, jwtToken) {
  return await axios.delete(`${CHATBOT_BASEURL}/delete-source`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    data,
  });
}

export async function deleteManyEmbeddedSource(data, jwtToken) {
  return await axios.delete(`${CHATBOT_BASEURL}/delete-many-sources`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    data,
  });
}

export async function deleteChatHistory(jwtToken) {
  return await axios.delete(`${CHATBOT_BASEURL}/delete-chat-history`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
  });
}

export async function deletePublicChatHistory(userId) {
  return await axios.delete(`${CHATBOT_PUBLIC_BASEURL}/${userId}`, {
    headers: {
      Accept: "application/json",
    },
  });
}

export async function createChatbot(orgId: string) {
  return await prisma.chatbot.create({
    data: {
      orgId,
      shortUrlId: getShortUrlId(),
    },
  });
}

export async function getChatbotDetails(orgId: string) {
  return await prisma.chatbot.findUnique({
    where: {
      orgId,
    },
  });
}

export async function updateChatbotDetails(data, orgId: string) {
  return await prisma.chatbot.update({
    where: {
      orgId,
    },
    data,
  });
}

export async function getChatbotDetailsByShortUrlId(shortUrlId: string) {
  return await prisma.chatbot.findUnique({
    where: {
      shortUrlId,
    },
  });
}

export async function getTextSummaryByAI(
  texts,
  request: FastifyRequest,
  allowedTokens,
) {
  try {
    const axiosAIClient = await getAxiosAIClient(request);
    const res = await axiosAIClient.post(`/chatbot/summarize`, {
      texts,
      allowedTokens,
    });
    return res.data as {
      summary: string;
      tokenUsage: { completionTokens: number; promptTokens: number };
    };
  } catch (err) {
    log.error(err);
    throw `Error in getting text summary, ${err?.response?.data ?? err}`;
  }
}
