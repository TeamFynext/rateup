import { FastifyReply, FastifyRequest } from "fastify";
import { chatbotMessageInput, dataSourceUploadInput } from "./chatbot.schema";
import {
  getAIResponseForQuery,
  uploadFileForAIEmbed,
  uploadSourceForEmbed,
} from "./chatbot.service";
import { createJWT } from "../../utils/jwt";

export async function uploadSourceForEmbedHandler(
  request: FastifyRequest<{
    Body: dataSourceUploadInput;
  }>,
  reply: FastifyReply,
) {
  try {
    //TODO: whether type and source need to save in db?
    const jwtToken = await createJWT(request.user);
    const res = await uploadSourceForEmbed(request.body, jwtToken);
    reply.code(200).send({ message: "success" });
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
    reply.code(200).send({ message: "success" });
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
