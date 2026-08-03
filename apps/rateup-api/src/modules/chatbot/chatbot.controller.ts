import { FastifyReply, FastifyRequest } from "fastify";
import {
  ChatbotIdInput,
  chatbotMessageInput,
  dataSourceUploadInput,
  deleteContentInput,
  deleteManyContentInput,
  publicMessageInput,
  updateChatbotInput,
  UserIdInput,
} from "./chatbot.schema.js";
import {
  AI_API_URL,
  AiAllowanceError,
  createChatbot,
  deleteChatbotFromDatabase,
  deleteChatHistory,
  deleteEmbeddedSource,
  deleteManyEmbeddedSource,
  deletePublicChatHistory,
  getAIResponseForQuery,
  getAllChatbot,
  getChatbotDetails,
  getChatbotDetailsByShortUrlId,
  getChatBotHistory,
  getPublicAIResponseForQuery,
  getUploadedSources,
  updateChatbotDetails,
  uploadFileForAIEmbed,
  uploadSourceForEmbed,
} from "./chatbot.service.js";
import { createJWT } from "../../utils/jwt.js";
import axios from "axios";
import { log } from "../../utils/logger.js";
import { ChatbotPublicPageStatus } from "../../types/enums.js";

/**
 * Prisma raises P2025 when an extended `where` matched nothing — which, on this
 * module's writes, means the chatbot is either gone or another org's. Both answer
 * 404, so one is indistinguishable from the other.
 */
function isRecordNotFound(error: unknown): boolean {
  return (
    Boolean(error) && typeof error === "object" && (error as { code?: string }).code === "P2025"
  );
}

export async function uploadSourceForEmbedHandler(
  request: FastifyRequest<{
    Body: dataSourceUploadInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const jwtToken = await createJWT(request.user);
    const res = await uploadSourceForEmbed(request.body, jwtToken);
    reply.code(200).send(res.data);
  } catch (e) {
    console.log(e);
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function uploadFileForAIEmbedHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    let chatbotId;
    let filePart;

    const formData = new FormData();

    const parts = request.parts();
    for await (const part of parts) {
      if (part.type === "file") {
        if (filePart) {
          reply.code(400).send({ message: "Only one file may be uploaded at a time." });
          return;
        }
        filePart = part;

        if (!["application/pdf", "application/epub+zip"].includes(part.mimetype)) {
          reply.code(400).send({ message: "This file type is not permitted." });
          return;
        }

        const buffer = await part.toBuffer();
        const blob = new Blob([new Uint8Array(buffer)], {
          type: part.mimetype,
        });
        formData.append("file", blob, part.filename);
      }

      if (part.type === "field" && part.fieldname === "chatbotId") {
        chatbotId = part.value;
        formData.append("chatbotId", chatbotId);
      }
    }

    if (!filePart) {
      reply.code(400).send({ message: "File is required." });
      return;
    }

    const jwtToken = await createJWT(request.user);

    await uploadFileForAIEmbed(formData, jwtToken);
    reply.code(200).send();
  } catch (e) {
    console.error("Error:", e);
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function chatbotMessageHandler(
  request: FastifyRequest<{
    Body: chatbotMessageInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = request.userId;
    const orgId = request.user.orgId;
    const chatbotId = request.body.chatbotId;
    const { query } = request.body;
    const chatbot = await getChatbotDetails(orgId, chatbotId);
    if (!chatbot) {
      reply.code(404).send({ message: "Chatbot not found" });
      return;
    }
    const jwtToken = await createJWT(request.user);
    const res = await getAIResponseForQuery({ query, userId, orgId, chatbotId }, jwtToken);
    reply.code(200).send({ message: res });
  } catch (e) {
    if (e instanceof AiAllowanceError) {
      log.error(e);
      reply.code(403).send({ message: e.message });
      return;
    }
    console.log(e);
    reply.code(500).send({ message: "Something went wrong!" });
  }
}

export async function publicChatbotMessageHandler(
  request: FastifyRequest<{
    Body: publicMessageInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { query, chatbotId, userId } = request.body;
    const chatbot = await getChatbotDetailsByShortUrlId(chatbotId);
    if (!chatbot) {
      reply.code(404).send({ message: "Chatbot not found" });
      return;
    }
    if (chatbot.publicPageStatus !== ChatbotPublicPageStatus.ACTIVE) {
      reply.code(403).send({ message: "This chatbot's public page is not active" });
      return;
    }
    const res = await getPublicAIResponseForQuery({ query, orgId: chatbot.orgId, userId });
    reply.code(200).send({ message: res });
  } catch (e) {
    if (e instanceof AiAllowanceError) {
      log.error(e);
      reply.code(403).send({ message: "This chatbot is unavailable" });
      return;
    }
    console.log(e);
    reply.code(500).send({ message: "Something went wrong!" });
  }
}

export async function getUploadedSourceHandler(
  request: FastifyRequest<{
    Querystring: { chatbotId?: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { chatbotId } = request.query;
    if (chatbotId && !(await getChatbotDetails(request.user.orgId, chatbotId))) {
      reply.code(404).send({ message: "Chatbot not found" });
      return;
    }
    const jwtToken = await createJWT(request.user);

    const uploadedSources = await getUploadedSources(jwtToken, chatbotId);
    reply.code(200).send(uploadedSources);
  } catch (e) {
    console.log(e);
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function deleteEmbeddedSourceHandler(
  request: FastifyRequest<{ Body: deleteContentInput }>,
  reply: FastifyReply,
) {
  try {
    const jwtToken = await createJWT(request.user);
    await deleteEmbeddedSource(request.body, jwtToken);
    reply.code(200).send();
  } catch (e) {
    console.log(e);
    reply.code(500).send({ message: "something went wrong" });
  }
}

export async function deleteManyEmbeddedSourcesHandler(
  request: FastifyRequest<{ Body: deleteManyContentInput }>,
  reply: FastifyReply,
) {
  try {
    const jwtToken = await createJWT(request.user);
    const res = await deleteManyEmbeddedSource(request.body, jwtToken);
    reply.code(200).send(res.data);
  } catch (e) {
    console.log(e);
    reply.code(500).send({ message: "something went wrong" });
  }
}

export async function deleteChatHistoryHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const jwtToken = await createJWT(request.user);
    const res = await deleteChatHistory(jwtToken);
    reply.code(200).send(res.data);
  } catch (e) {
    console.log(e);
    reply.code(500).send({ message: "something went wrong" });
  }
}

export async function deletePublicChatHistoryHandler(
  request: FastifyRequest<{ Params: UserIdInput }>,
  reply: FastifyReply,
) {
  try {
    const res = await deletePublicChatHistory(request.params.userId);
    reply.code(200).send(res.data);
  } catch (e) {
    console.log(e);
    reply.code(500).send({ message: "something went wrong" });
  }
}

export async function getChatbotPublicPageStatusHandler(
  request: FastifyRequest<{ Params: ChatbotIdInput }>,
  reply: FastifyReply,
) {
  try {
    const chatbot = await getChatbotDetailsByShortUrlId(request.params.chatbotId);
    if (!chatbot) {
      reply.code(404).send({ message: "Chatbot not found" });
      return;
    }
    reply.code(200).send({ publicPageStatus: chatbot.publicPageStatus });
  } catch (error) {
    console.error(error);
    reply.code(500).send({ message: "something went wrong" });
  }
}

export async function createChatbotHanlder(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { orgId } = request.user;
    const { name } = request.body as { name: string };
    const res = await createChatbot(orgId, name);
    reply.code(201).send(res);
  } catch (error) {
    console.error(error);
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function getAllChatbotsByOrgHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { orgId } = request.user;
    const res = await getAllChatbot(orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function getChatbotDetailsHandler(
  request: FastifyRequest<{ Params: { chatbotId: string } }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { chatbotId } = request.params;
    const res = await getChatbotDetails(orgId, chatbotId);
    reply.code(200).send(res);
  } catch (error) {
    console.error(error);
    reply.code(500).send({ message: "something went wrong" });
  }
}

export async function updateChatbotDetailsHanlder(
  request: FastifyRequest<{
    Params: { chatbotId: string };
    Body: updateChatbotInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { chatbotId } = request.params;
    const res = await updateChatbotDetails(request.body, orgId, chatbotId);
    reply.code(200).send(res);
  } catch (error) {
    if (isRecordNotFound(error)) {
      reply.code(404).send({ message: "Chatbot not found" });
      return;
    }
    console.error(error);
    reply.code(500).send({ message: "Something went wrong" });
  }
}

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

export async function getChatHitoryByOrgHandler(
  request: FastifyRequest<{ Params: { chatbotId: string } }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { chatbotId } = request.params;
    if (!(await getChatbotDetails(orgId, chatbotId))) {
      reply.code(404).send({ message: "Chatbot not found" });
      return;
    }
    const axiosAIClient = await getAxiosAIClient(request);
    const res = await getChatBotHistory(axiosAIClient, orgId, chatbotId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function deleteSelectedChatbotHandler(
  request: FastifyRequest<{ Params: { chatbotId: string } }>,
  reply: FastifyReply,
) {
  const { orgId } = request.user;
  const { chatbotId } = request.params;

  try {
    await deleteChatbotFromDatabase({ chatbotId, orgId });
  } catch (error) {
    if (isRecordNotFound(error)) {
      reply.code(404).send({ message: "Chatbot not found" });
      return;
    }
    log.error(error);
    reply.code(500).send({ message: "Something went wrong" });
    return;
  }

  reply.code(200).send({ success: true });
}
