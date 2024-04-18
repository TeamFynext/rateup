import { FastifyReply, FastifyRequest } from "fastify";
import {
  chatbotMessageInput,
  dataSourceUploadInput,
  deleteContentInput,
  deleteManyContentInput,
  publicMessageInput,
  UserIdInput,
} from "./chatbot.schema";
import {
  deleteChatHistory,
  deleteEmbeddedSource,
  deleteManyEmbeddedSource,
  deletePublicChatHistory,
  getAIResponseForQuery,
  getPublicAIResponseForQuery,
  getUploadedSources,
  uploadFileForAIEmbed,
  uploadSourceForEmbed,
} from "./chatbot.service";
import { createJWT } from "../../utils/jwt";
import { getOrgFromShortUrl } from "../org/org.services";

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
    reply.code(200).send(res);
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
    reply.code(200).send(res.data);
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
    //get orgId and userId from chatbotId
    const { id } = await getOrgFromShortUrl(chatbotId);
    const res = await getPublicAIResponseForQuery({ query, orgId: id, userId });
    reply.code(200).send(res.data);
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
    reply.code(200).send(res);
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
