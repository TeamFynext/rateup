import axios, { AxiosInstance } from "axios";
import {
  dataSourceUploadInput,
  deleteContentInput,
  deleteManyContentInput,
  updateChatbotInput,
} from "./chatbot.schema.js";
import { getShortUrlId, shortIdUniqueConstraintErrHandler } from "../../utils/commonUtils.js";
import prisma from "../../utils/prisma.js";
import { FastifyRequest } from "fastify";
import { getAxiosAIClient } from "./chatbot.controller.js";
import { log } from "../../utils/logger.js";
import { getSubscription } from "../subscription/subscription.service.js";

export const AI_API_URL = `${process.env.CHATBOT_API_URL}/api`;

function aiApiBaseUrl(): string {
  const base = process.env.CHATBOT_API_URL;
  if (!base) {
    throw new Error("CHATBOT_API_URL is not configured");
  }
  return base.replace(/\/+$/, "");
}

const chatbotBaseUrl = () => `${aiApiBaseUrl()}/api/chatbot`;
const chatbotPublicBaseUrl = () => `${aiApiBaseUrl()}/api/public/chatbot`;

export class AiAllowanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiAllowanceError";
  }
}

/**
 * The org's AI allowance and what it has spent so far.
 *
 * Both were previously read as `subscription.features.ai.count` with no guard —
 * an org with no subscription row, or on a plan describing no `ai` feature, got a
 * TypeError before the query was sent. And neither caller compared the two: the
 * numbers were passed to the AI service as ADVICE, so an outage or a bug in the
 * remote service's enforcement meant unlimited billable usage with nothing on
 * this side to stop it. Both are checked here now.
 */
async function getAiAllowance(orgId: string) {
  const subscription = await getSubscription(orgId);
  if (!subscription) {
    throw new AiAllowanceError(`No subscription found for org ${orgId}`);
  }

  const aiFeature = subscription.features?.ai;
  if (!aiFeature || !aiFeature.count) {
    throw new AiAllowanceError(`The plan for org ${orgId} does not include the AI feature`);
  }
  if (aiFeature.active === false) {
    throw new AiAllowanceError(`The AI feature is not active on the plan for org ${orgId}`);
  }

  const allowedTokens = aiFeature.count;
  const usedTokens = await prisma.usageStats.findUnique({
    where: {
      orgId,
    },
    select: {
      aiCompletionTokensCount: true,
      aiPromptTokensCount: true,
    },
  });

  // A malformed allowance (a plan that stores something other than a number) is
  // left to the remote service rather than turned into a refusal here — refusing
  // on a shape this module does not own would take working chatbots down.
  if (
    usedTokens &&
    ((Number.isFinite(allowedTokens.promptTokens) &&
      usedTokens.aiPromptTokensCount >= allowedTokens.promptTokens) ||
      (Number.isFinite(allowedTokens.completionTokens) &&
        usedTokens.aiCompletionTokensCount >= allowedTokens.completionTokens))
  ) {
    throw new AiAllowanceError(`The AI token allowance for org ${orgId} is exhausted`);
  }

  return { allowedTokens, usedTokens };
}

export async function uploadSourceForEmbed(data: dataSourceUploadInput, jwtToken: string) {
  return await axios.post(`${chatbotBaseUrl()}/embed-doc`, data, {
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
export async function getAIResponseForQuery(data: messageInput, jwtToken: string) {
  const { allowedTokens, usedTokens } = await getAiAllowance(data.orgId);
  const res = await axios.post(
    chatbotBaseUrl(),
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

interface publicMessageInput {
  query: string;
  userId: string;
  orgId: string;
}
export async function getPublicAIResponseForQuery(data: publicMessageInput) {
  const { allowedTokens, usedTokens } = await getAiAllowance(data.orgId);
  const res = await axios.post(
    chatbotPublicBaseUrl(),
    { ...data, allowedTokens, usedTokens },
    {
      headers: {
        Accept: "application/json",
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

export async function uploadFileForAIEmbed(data: FormData, jwtToken: string) {
  console.log("uploadFileForAIEmbed data : ", data);

  return await axios.post(`${chatbotBaseUrl()}/embed-doc/file`, data, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${jwtToken}`,
    },
  });
}

export async function getUploadedSources(jwtToken: string, chatbotId?: string) {
  const query = chatbotId ? `?${new URLSearchParams({ chatbotId })}` : "";

  const res = await axios.get(`${chatbotBaseUrl()}${query}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
  });
  return res?.data;
}

export async function deleteEmbeddedSource(data: deleteContentInput, jwtToken: string) {
  return await axios.delete(`${chatbotBaseUrl()}/delete-source`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    data,
  });
}

export async function deleteManyEmbeddedSource(data: deleteManyContentInput, jwtToken: string) {
  return await axios.delete(`${chatbotBaseUrl()}/delete-many-sources`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    data,
  });
}

export async function deleteChatHistory(jwtToken: string) {
  return await axios.delete(`${chatbotBaseUrl()}/delete-chat-history`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
  });
}

export async function deletePublicChatHistory(userId: string) {
  return await axios.delete(`${chatbotPublicBaseUrl()}/${userId}`, {
    headers: {
      Accept: "application/json",
    },
  });
}

export async function createChatbot(orgId: string, name: string) {
  return await shortIdUniqueConstraintErrHandler(() =>
    prisma.chatbot.create({
      data: {
        orgId,
        name,
        shortUrlId: getShortUrlId(),
      },
    }),
  );
}

export async function getChatbotDetails(orgId: string, chatbotId?: string, onlyEnabled = false) {
  return await prisma.chatbot.findFirst({
    where: {
      id: chatbotId,
      orgId,
      ...(onlyEnabled && { enableAllWaChat: true, enableWaChat: true }),
    },
    orderBy: { id: "asc" },
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
  data: updateChatbotInput,
  orgId: string,
  chatbotId: string,
) {
  const before = await prisma.chatbot.findFirst({
    where: { id: chatbotId, orgId },
    select: { enableAllWaChat: true },
  });

  const res = await prisma.chatbot.update({
    where: {
      orgId,
      id: chatbotId,
    },
    data: {
      ...data,
    },
  });

  if (data.enableAllWaChat !== undefined && data.enableAllWaChat !== before?.enableAllWaChat) {
    await prisma.contact.updateMany({
      where: {
        orgId: res.orgId,
        chatbotId: { in: ["", chatbotId] },
      },
      data: {
        aiWaChat: data.enableAllWaChat,
      },
    });
  }

  return res;
}

export async function getChatbotDetailsByShortUrlId(shortUrlId: string) {
  return await prisma.chatbot.findUnique({
    where: {
      shortUrlId,
    },
  });
}

export async function getTextSummaryByAI(
  texts: unknown[],
  request: FastifyRequest,
  allowedTokens: { completionTokens: number; promptTokens: number },
  usedTokens: { aiCompletionTokensCount: number; aiPromptTokensCount: number } | null,
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
    const responseData =
      typeof err === "object" && err !== null && "response" in err
        ? (err as { response?: { data?: unknown } }).response?.data
        : undefined;
    throw new Error(`Error in getting text summary, ${responseData ?? String(err)}`);
  }
}

interface ChatHistoryEntry {
  userId: string;
  [key: string]: unknown;
}

export async function getChatBotHistory(client: AxiosInstance, orgId: string, chatbotId?: string) {
  const res = await client.get<ChatHistoryEntry[]>(`/chatbot/chathistory`, {
    params: chatbotId ? { chatbotId } : {},
  });
  const userIds = res.data.map((hist) => hist.userId).filter(Boolean);
  const userDetails = await prisma.user.findMany({
    where: {
      id: {
        in: userIds,
      },
      orgMember: {
        some: { orgId },
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
      orgId,
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
        name: `Anonymous_${hist.userId ? hist.userId.slice(-4) : "unknown"}`,
      },
  }));
}

export async function deleteChatbotFromDatabase({
  chatbotId,
  orgId,
}: {
  chatbotId: string;
  orgId: string;
}) {
  // Ensure chatbot belongs to the organization before deleting
  return await prisma.chatbot.delete({
    where: {
      id: chatbotId,
      orgId: orgId,
    },
  });
}
