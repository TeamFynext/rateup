import type { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger.js";
import connection from "../../utils/redisConnection.js";
import { unsupportedBlocks, type ChatbotPlatform } from "./chatbotBlocks.js";
import { chatbotRules, createStartRule, startOffered } from "./chatbotStart.js";
import { limitProblems, type LimitProblem } from "./chatbotLimits.js";
import { verifyAutomationTriggerLimit } from "../whatsapp/automatedReply/wa_automatedReply.service.js";
import {
  startMetaFlow,
  type MetaFlowAutomation,
} from "../whatsapp/automatedReply/metaFlow.service.js";
import { handleAutomatedReply } from "../whatsapp/whatsappSurvey/wasurvey.controller.js";
import {
  channelLock,
  cloneChatbot,
  createChatbot,
  deleteChatbot,
  getChatbot,
  listChatbots,
  updateChatbot,
  type ChannelLock,
} from "./chatbots.service.js";
import type {
  ChatbotIdParams,
  CloneChatbotBody,
  CreateChatbotBody,
  InitiateChatbotBody,
  ListChatbotsQuery,
  UpdateChatbotBody,
} from "./chatbots.schema.js";

const NOT_FOUND = { message: "Chatbot not found" };

/** The same 403 body the subscription guard sends, so the client's handling carries over. */
function sendLocked(reply: FastifyReply, lock: ChannelLock) {
  const expired = lock === "subscription_expired";
  return reply.code(403).send({
    message: expired
      ? "Subscription expired"
      : lock === "no_subscription"
        ? "No active subscription"
        : "This feature is not included in your subscription",
    reason: expired ? "subscription_expired" : "subscription",
    ...(lock === "not_in_plan" && { missingFeatures: ["whatsapp"] }),
    displayMessageInClient: true,
  });
}

function sendUnsupported(reply: FastifyReply, platform: ChatbotPlatform, blocks: string[]) {
  return reply.code(400).send({
    message: "This chatbot uses blocks its channel can't send",
    platform,
    unsupportedBlocks: blocks,
  });
}

/** Blocks over the channel's limits, e.g. an Instagram text over 1000 characters. */
function sendOverLimit(reply: FastifyReply, platform: ChatbotPlatform, problems: LimitProblem[]) {
  const first = problems[0]!;
  return reply.code(400).send({
    message: `${first.label}: ${first.message} for ${PLATFORM_NAME[platform]}`,
    platform,
    limitProblems: problems,
  });
}

const PLATFORM_NAME: Record<ChatbotPlatform, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Messenger",
};

/** Loads the org's chatbot and checks its channel is open; replies and returns null if not. */
async function loadOpen(
  id: string,
  orgId: string,
  reply: FastifyReply,
  { write }: { write: boolean },
) {
  const chatbot = await getChatbot(id, orgId);
  if (!chatbot) {
    reply.code(404).send(NOT_FOUND);
    return null;
  }
  const lock = await channelLock(orgId, chatbot.platform as ChatbotPlatform, {
    write,
  });
  if (lock) {
    sendLocked(reply, lock);
    return null;
  }
  return chatbot;
}

function fail(reply: FastifyReply, error: unknown, what: string) {
  log.error({ err: error }, `[Chatbots] Error ${what}`);
  return reply.code(500).send({ message: `Couldn't ${what}` });
}

export async function listChatbotsHandler(
  req: FastifyRequest<{ Querystring: ListChatbotsQuery }>,
  reply: FastifyReply,
) {
  try {
    const { platform, withGraph, search } = req.query ?? {};
    return reply.send(await listChatbots(req.user.orgId, platform, { withGraph, search }));
  } catch (error) {
    return fail(reply, error, "list chatbots");
  }
}

export async function getChatbotHandler(
  req: FastifyRequest<{ Params: ChatbotIdParams }>,
  reply: FastifyReply,
) {
  try {
    const chatbot = await loadOpen(req.params.id, req.user.orgId, reply, {
      write: false,
    });
    if (!chatbot) return reply;
    return reply.send({ data: chatbot });
  } catch (error) {
    return fail(reply, error, "load the chatbot");
  }
}

/** The rules that start this chatbot, so the editor can say whether it is live. */
export async function listChatbotRulesHandler(
  req: FastifyRequest<{ Params: ChatbotIdParams }>,
  reply: FastifyReply,
) {
  try {
    const chatbot = await loadOpen(req.params.id, req.user.orgId, reply, {
      write: false,
    });
    if (!chatbot) return reply;
    return reply.send({ data: await chatbotRules(chatbot.id, req.user.orgId) });
  } catch (error) {
    return fail(reply, error, "load the chatbot's rules");
  }
}

export async function createChatbotHandler(
  req: FastifyRequest<{ Body: CreateChatbotBody }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = req.user;
    const { platform, matchData } = req.body;
    const lock = await channelLock(orgId, platform, { write: true });
    if (lock) return sendLocked(reply, lock);
    const blocks = unsupportedBlocks(matchData.json, platform);
    if (blocks.length) return sendUnsupported(reply, platform, blocks);
    const overLimit = limitProblems(matchData.json, platform);
    if (overLimit.length) return sendOverLimit(reply, platform, overLimit);
    const { start, ...fields } = req.body;
    if (start && !startOffered(platform, start.kind)) {
      return reply.code(400).send({
        message: `This chatbot can't start that way on ${platform}`,
        start: start.kind,
      });
    }

    const chatbot = await createChatbot(orgId, {
      ...fields,
      matchData: matchData as WaAutomatedReplyMatchData,
    });
    const startRule = start
      ? await createStartRule(
          orgId,
          { id: chatbot.id, name: chatbot.name, platform },
          { kind: start.kind, accountId: start.accountId },
        )
      : undefined;
    return reply.code(201).send({ data: chatbot, ...(startRule && { startRule }) });
  } catch (error) {
    return fail(reply, error, "create the chatbot");
  }
}

export async function updateChatbotHandler(
  req: FastifyRequest<{ Params: ChatbotIdParams; Body: UpdateChatbotBody }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = req.user;
    const existing = await loadOpen(req.params.id, orgId, reply, {
      write: true,
    });
    if (!existing) return reply;
    const platform = existing.platform as ChatbotPlatform;

    const { platform: requested, ...changes } = req.body;
    if (requested && requested !== platform) {
      return reply.code(409).send({ message: "A chatbot's channel can't be changed" });
    }
    const blocks = unsupportedBlocks(changes.matchData?.json, platform);
    if (blocks.length) return sendUnsupported(reply, platform, blocks);
    const overLimit = limitProblems(changes.matchData?.json, platform);
    if (overLimit.length) return sendOverLimit(reply, platform, overLimit);

    const chatbot = await updateChatbot(req.params.id, orgId, {
      ...changes,
      matchData: changes.matchData as WaAutomatedReplyMatchData | undefined,
    });
    return reply.send({ data: chatbot });
  } catch (error) {
    return fail(reply, error, "save the chatbot");
  }
}

export async function cloneChatbotHandler(
  req: FastifyRequest<{ Params: ChatbotIdParams; Body: CloneChatbotBody }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = req.user;
    const source = await loadOpen(req.params.id, orgId, reply, { write: true });
    if (!source) return reply;
    const chatbot = await cloneChatbot(source, orgId, req.body?.name);
    return reply.code(201).send({ data: chatbot });
  } catch (error) {
    return fail(reply, error, "copy the chatbot");
  }
}

export async function deleteChatbotHandler(
  req: FastifyRequest<{ Params: ChatbotIdParams }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    const existing = await loadOpen(id, orgId, reply, { write: true });
    if (!existing) return reply;

    await deleteChatbot(id, orgId);
    // The assign block's round-robin position, as the old WhatsApp delete cleared it.
    const keys = await connection.keys(`round_robin_index:*:${id}:*`);
    if (keys.length) await connection.del(...keys);

    return reply.code(204).send();
  } catch (error) {
    return fail(reply, error, "delete the chatbot");
  }
}

/** Starts the chatbot for one person, from the inbox's chatbot picker. */
export async function initiateChatbotHandler(
  req: FastifyRequest<{ Params: ChatbotIdParams; Body: InitiateChatbotBody }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = req.user;
    const chatbot = await loadOpen(req.params.id, orgId, reply, { write: true });
    if (!chatbot) return reply;
    if (chatbot.isActive === false) {
      return reply.code(409).send({ message: "This chatbot is switched off" });
    }
    const { recipientId, accountId } = req.body;

    if (chatbot.platform === "WHATSAPP") {
      if (!(await verifyAutomationTriggerLimit(orgId))) {
        return reply.code(403).send({ message: "Automation Trigger is inactive or limit reached" });
      }
      await handleAutomatedReply(orgId, null, null, recipientId, null, chatbot.id);
    } else {
      if (!accountId) {
        return reply.code(400).send({ message: "accountId is required on this channel" });
      }
      const platform = chatbot.platform as Exclude<ChatbotPlatform, "WHATSAPP">;
      // The stored matchData is typed loosely on the Prisma model; this row is a Meta flow graph.
      await startMetaFlow(recipientId, chatbot as unknown as MetaFlowAutomation, orgId, {
        platform,
        accountId,
      });
    }
    log.info(`[Chatbots] Started chatbot ${chatbot.id} for ${recipientId}`);
    return reply.send({ success: true });
  } catch (error) {
    return fail(reply, error, "start the chatbot");
  }
}
