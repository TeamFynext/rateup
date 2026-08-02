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

/**
 * The AI service's base url, read per call rather than baked into a module-level
 * const at import time.
 *
 * Every call used to interpolate `process.env.CHATBOT_API_URL` into a string and
 * hand that to axios, so an unset variable produced the literal base
 * "undefined/api/chatbot" and failed at the network layer — except
 * getUploadedSources, which parsed it with `new URL` and failed earlier with a
 * bare "Invalid URL". One misconfiguration, two unrelated symptoms.
 * Now every call fails the same way, naming the variable. See issues.txt 21.9.
 */
function aiApiBaseUrl(): string {
  const base = process.env.CHATBOT_API_URL;
  if (!base) {
    throw new Error("CHATBOT_API_URL is not configured");
  }
  return base.replace(/\/+$/, "");
}

const chatbotBaseUrl = () => `${aiApiBaseUrl()}/api/chatbot`;
const chatbotPublicBaseUrl = () => `${aiApiBaseUrl()}/api/public/chatbot`;

/**
 * Raised when the org cannot be billed for an AI call: no subscription, a plan
 * that describes no AI feature, or an allowance that is already spent. Separate
 * from a generic failure so the handlers can answer 403 with a message that says
 * which of those it is, rather than a blanket 500. See issues.txt 21.1.
 */
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
  // Guarded and awaited, like the authenticated variant. Unguarded, the
  // `tokenUsage.promptTokens` read happened while BUILDING the update argument —
  // synchronously — so an answer that arrived without a usage block threw a
  // TypeError and the answer the org had already paid for was discarded. Unawaited,
  // a slow or failed write lost the billing record with nothing to catch its
  // rejection. See issues.txt 21.2.
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
  // Built by concatenation like every sibling call rather than parsed with
  // `new URL`, so a misconfigured CHATBOT_API_URL fails the same way here as
  // everywhere else. See issues.txt 21.9.
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
  // shortUrlId is @unique and the id was minted once, so a collision surfaced as a
  // raw P2002 and the create failed. The retry helper mints a fresh id and tries
  // again — every other short-id writer in the codebase uses it. The id has to be
  // minted INSIDE the retried function, or the retry would reuse the colliding one.
  // See issues.txt 21.7.
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

/**
 * One chatbot in an org.
 *
 * `chatbotId` is optional and several callers (createContact, the WhatsApp inbox)
 * pass only an org, to answer "does this org have AI chat switched on". Prisma
 * DROPS `id: undefined` from a where clause rather than matching nothing
 * (strictUndefinedChecks is off — see issues.txt 12.x), so those callers get
 * whichever row the database happened to return first, and in an org with several
 * chatbots that could change between two calls. The order is fixed here so the
 * fallback is at least the SAME chatbot every time: the oldest row wins.
 * Chatbot has no createdAt column, so the ordering is by id. See issues.txt 21.4.
 */
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

/**
 * Updates one chatbot and returns the updated row.
 *
 * This was an upsert whose create branch wrote only `{ shortUrlId, orgId }` — the
 * caller's data was discarded — so a PUT against an id that did not exist (a stale
 * tab, a deleted chatbot, a typo) silently created an empty "Default Chatbot",
 * threw away every setting just submitted, and answered as though it had saved
 * them. It is an update now: a missing row raises P2025 and the handler answers
 * 404. See issues.txt 21.5.
 */
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

  // The sweep used to fire whenever the key was present, even when the value had
  // not changed, and it covered EVERY contact in the org — so one chatbot's toggle
  // rewrote the AI flag for contacts talking to a different chatbot. It now runs
  // only on a real change, and leaves contacts bound to another chatbot alone
  // (Contact.chatbotId is stamped when a WhatsApp AI session starts, and is "" for
  // contacts that have never had one). See issues.txt 21.5.
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
    // getAxiosAIClient throws now (issues.txt 21.6), so a client that could not be
    // built arrives here as an error rather than as `undefined.post`.
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

/**
 * The AI service's chat history for one chatbot, with each entry's user resolved
 * to a name.
 *
 * The ids come back from a service this module does not control, and both lookups
 * used to resolve them against the WHOLE User and Contact tables while selecting
 * `email` and `phone` — so an id from outside the caller's org would have returned
 * that person's contact details. Both are scoped to the org now. See issues.txt 21.8.
 */
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
        // Guarded: an entry with no user id used to take the whole listing down
        // with a TypeError rather than degrading to "Anonymous". issues.txt 21.8.
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
