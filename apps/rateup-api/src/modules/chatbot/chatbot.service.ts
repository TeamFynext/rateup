import axios from "axios";
import { dataSourceUploadInput } from "./chatbot.schema";
import { getShortUrlId } from "../../utils/commonUtils";
import prisma from "../../utils/prisma";
import { FastifyRequest } from "fastify";
import { getAxiosAIClient } from "./chatbot.controller";
import { log } from "../../utils/logger";
import { getSubscription } from "../subscription/subscription.service";

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
  chatbotId: string;
  customPrompt?: string;
}
export async function getAIResponseForQuery(data: messageInput, jwtToken) {
  const subscription = await getSubscription(data.orgId);

  const allowedTokens = subscription.features.ai.count;
  const usedTokens = await prisma.usageStats.findUnique({
    where: {
      orgId: data.orgId,
    },
    select: {
      aiCompletionTokensCount: true,
      aiPromptTokensCount: true,
    },
  });
  const res = await axios.post(
    CHATBOT_BASEURL,
    { ...data, allowedTokens, usedTokens },
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
    },
  );
  const { message, tokenUsage } = res.data;
  if (tokenUsage)
    await prisma.usageStats.update({
      where: {
        orgId: data.orgId,
      },
      data: {
        aiPromptTokensCount: {
          increment: tokenUsage.promptTokens,
        },
        aiCompletionTokensCount: {
          increment: tokenUsage.completionTokens,
        },
      },
    });
  return message;
}

export async function getPublicAIResponseForQuery(data) {
  const subscription = await getSubscription(data.orgId);
  const allowedTokens = await subscription.features.ai.count;
  const usedTokens = await prisma.usageStats.findUnique({
    where: {
      orgId: data.orgId,
    },
    select: {
      aiCompletionTokensCount: true,
      aiPromptTokensCount: true,
    },
  });
  const res = await axios.post(
    CHATBOT_PUBLIC_BASEURL,
    { ...data, allowedTokens, usedTokens },
    {
      headers: {
        Accept: "application/json",
      },
    },
  );
  const { message, tokenUsage } = res.data;
  prisma.usageStats.update({
    where: {
      orgId: data.orgId,
    },
    data: {
      aiPromptTokensCount: {
        increment: tokenUsage.promptTokens,
      },
      aiCompletionTokensCount: {
        increment: tokenUsage.completionTokens,
      },
    },
  });
  return message;
}

export async function uploadFileForAIEmbed(data, jwtToken) {
  console.log("uploadFileForAIEmbed data : ", data);

  return await axios.post(`${CHATBOT_BASEURL}/embed-doc/file`, data, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${jwtToken}`,
    },
  });
}

export async function getUploadedSources(jwtToken, chatbotId: string) {
  const url = new URL(CHATBOT_BASEURL);
  if (chatbotId) {
    url.searchParams.append("chatbotId", chatbotId); // Append chatbotId to the query params
  }

  const res = await axios.get(url.toString(), {
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

export async function createChatbot(orgId: string, name: string) {
  return await prisma.chatbot.create({
    data: {
      orgId,
      name,
      shortUrlId: getShortUrlId(),
    },
  });
}

export async function getChatbotDetails(orgId: string, chatbotId?: string) {
  return await prisma.chatbot.findFirst({
    where: {
      id: chatbotId,
      orgId,
    },
  });
}

export async function getAllChatbot(orgId: string) {
  return await prisma.chatbot.findMany({
    where: {
      orgId,
    },
  });
}

export async function updateChatbotDetails(
  data,
  orgId: string,
  chatbotId: string,
) {
  const res = await prisma.chatbot.upsert({
    where: {
      orgId,
      id: chatbotId,
    },
    create: {
      shortUrlId: getShortUrlId(),
      orgId,
    },
    update: {
      ...data,
    },
  });
  if ("enableAllWaChat" in data) {
    await prisma.contact.updateMany({
      where: {
        orgId: res.orgId,
      },
      data: {
        aiWaChat: data.enableAllWaChat,
      },
    });
  }
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
  usedTokens,
) {
  try {
    const axiosAIClient = await getAxiosAIClient(request);
    const res = await axiosAIClient.post(`/chatbot/summarize`, {
      texts,
      allowedTokens,
      usedTokens,
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

export async function getChatBotHistory(client, chatbotId?: string) {
  const res = await client.get(`/chatbot/chathistory`, {
    params: chatbotId ? { chatbotId } : {},
  });
  const userIds = res.data.map((hist) => hist.userId);
  const userDetails = await prisma.user.findMany({
    where: {
      id: {
        in: userIds,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
  const contactUserDetails = await prisma.contact.findMany({
    where: {
      id: {
        in: userIds,
      },
    },
    select: {
      id: true,
      name: true,
      phone: true,
    },
  });

  return res.data.map((hist) => ({
    ...hist,
    user: userDetails?.find((u) => u.id === hist.userId) ||
      contactUserDetails?.find((c) => c.id === hist.userId) || {
        name: `Anonymous_${hist.userId.slice(-4)}`,
      },
  }));
}

export async function deleteChatbotFromDatabase({ chatbotId, orgId }) {
  // Ensure chatbot belongs to the organization before deleting
  return await prisma.chatbot.delete({
    where: {
      id: chatbotId,
      orgId: orgId,
    },
  });
}
