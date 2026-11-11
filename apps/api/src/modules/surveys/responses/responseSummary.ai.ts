import axios from "axios";
import { FastifyRequest } from "fastify";
import { createJWT } from "../../../utils/jwt.js";
import { log } from "../../../utils/logger.js";
import { trimTrailingSlash } from "../../../utils/url.js";

/** Survey response summaries come from the external AI service at `AI_API_URL`. */
export const AI_API_URL = `${trimTrailingSlash(process.env.AI_API_URL)}/api`;

export async function getAxiosAIClient(request: FastifyRequest) {
  const jwtToken = await createJWT(request.user);
  return axios.create({
    baseURL: AI_API_URL,
    timeout: 60000,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${jwtToken}`,
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
