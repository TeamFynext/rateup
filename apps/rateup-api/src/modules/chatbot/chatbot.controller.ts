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
} from "./chatbot.schema";
import {
  AI_API_URL,
  createChatbot,
  deleteChatHistory,
  deleteEmbeddedSource,
  deleteManyEmbeddedSource,
  deletePublicChatHistory,
  getAIResponseForQuery,
  getChatbotDetails,
  getChatbotDetailsByShortUrlId,
  getChatBotHistory,
  getPublicAIResponseForQuery,
  getUploadedSources,
  updateChatbotDetails,
  uploadFileForAIEmbed,
  uploadSourceForEmbed,
} from "./chatbot.service";
import { createJWT } from "../../utils/jwt";
import axios from "axios";
import { log } from "../../utils/logger";

export async function uploadSourceForEmbedHandler(
  request: FastifyRequest<{
    Body: dataSourceUploadInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const jwtToken = await createJWT(request.user);
    const res = await uploadSourceForEmbed(request.body, jwtToken);
    reply.code(200).send(res);
  } catch (e) {
    console.log(e);
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function uploadFileForAIEmbedHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const data = await request.file();
    if (
      !["application/pdf", "application/epub+zip"].includes(data?.mimetype) ||
      data.type !== "file"
    ) {
      reply.code(400).send({ message: "This file type is not permitted." });
      return;
    }
    const formData = new FormData();
    const blob = new Blob([await data.toBuffer()], { type: data.mimetype });
    formData.append("file", blob, data.filename);
    const jwtToken = await createJWT(request.user);
    const res = await uploadFileForAIEmbed(formData, jwtToken);
    reply.code(200).send();
  } catch (e) {
    console.log(e);
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
    const { query } = request.body;
    const jwtToken = await createJWT(request.user);
    const res = await getAIResponseForQuery({ query, userId, orgId }, jwtToken);
    reply.code(200).send({ message: res });
  } catch (e) {
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
    const { orgId } = await getChatbotDetailsByShortUrlId(chatbotId);
    const res = await getPublicAIResponseForQuery({ query, orgId, userId });
    reply.code(200).send({ message: res });
  } catch (e) {
    console.log(e);
    reply.code(500).send({ message: "Something went wrong!" });
  }
}

export async function getUploadedSourceHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const jwtToken = await createJWT(request.user);
    const uploadedSources = await getUploadedSources(jwtToken);
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
    const res = await deleteEmbeddedSource(request.body, jwtToken);
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
    reply.code(200).send(res);
  } catch (e) {
    console.log(e);
    reply.code(500).send({ message: "something went wrong" });
  }
}

export async function deleteChatHistoryHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const jwtToken = await createJWT(request.user);
    const res = await deleteChatHistory(jwtToken);
    reply.code(200).send(res);
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
    reply.code(200).send(res);
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
    const { publicPageStatus } = await getChatbotDetailsByShortUrlId(
      request.params.chatbotId,
    );
    reply.code(200).send({ publicPageStatus });
  } catch (error) {
    console.error(error);
    reply.code(500).send({ message: "something went wrong" });
  }
}

export async function createChatbotHanlder(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await createChatbot(orgId);
    reply.code(201).send(res);
  } catch (error) {
    console.error(error);
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function getChatbotDetailsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await getChatbotDetails(orgId);
    reply.code(200).send(res);
  } catch (error) {
    console.error(error);
    reply.code(500).send({ message: "something went wrong" });
  }
}

export async function updateChatbotDetailsHanlder(
  request: FastifyRequest<{ Body: updateChatbotInput }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await updateChatbotDetails(request.body, orgId);
    reply.code(201).send(res);
  } catch (error) {
    console.error(error);
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function getAxiosAIClient(request: FastifyRequest) {
  try {
    const jwtToken = await createJWT(request.user);
    const axiosAIClient = axios.create({
      baseURL: AI_API_URL,
      timeout: 60000,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
    });
    return axiosAIClient;
  } catch (e) {
    console.error("Error getting axios ai client", e);
  }
}

export async function getChatHitoryByOrgHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const axiosAIClient = await getAxiosAIClient(request);
    const res = await getChatBotHistory(axiosAIClient);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
