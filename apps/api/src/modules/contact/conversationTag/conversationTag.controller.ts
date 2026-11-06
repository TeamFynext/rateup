import { FastifyReply, FastifyRequest } from "fastify";

import { Prisma } from "../../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import {
  AssignTagsToConversationSchema,
  ByConversationIdSchema,
  ByTagIdSchema,
  CreateConversationTagSchema,
  UpdateConversationTagSchema,
} from "./conversationTag.schema.js";
import {
  assignTagsToConversation,
  createConversationTag,
  deleteConversationTag,
  getConversationTagById,
  getConversationTagsByOrgId,
  getTagsForConversation,
  updateConversationTag,
} from "./conversationTag.service.js";

const DUPLICATE_NAME = "A conversation tag with this name already exists";
const NOT_FOUND = "Conversation tag not found";

export async function createConversationTagHandler(
  request: FastifyRequest<{ Body: CreateConversationTagSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const tag = await createConversationTag(orgId, request.body);
    reply.code(201).send(tag);
  } catch (error) {
    log.error(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      reply.code(409).send({ error: DUPLICATE_NAME });
    } else {
      reply.code(500).send({ error: "Something went wrong" });
    }
  }
}

export async function getAllConversationTagsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { orgId } = request.user;
    reply.code(200).send(await getConversationTagsByOrgId(orgId));
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function getConversationTagByIdHandler(
  request: FastifyRequest<{ Params: ByTagIdSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const tag = await getConversationTagById(request.params.tagId, orgId);
    if (!tag) return reply.code(404).send({ error: NOT_FOUND });
    reply.code(200).send(tag);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function updateConversationTagHandler(
  request: FastifyRequest<{ Params: ByTagIdSchema; Body: UpdateConversationTagSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const tag = await updateConversationTag(request.params.tagId, orgId, request.body);
    reply.code(200).send(tag);
  } catch (error) {
    log.error(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      reply.code(409).send({ error: DUPLICATE_NAME });
    } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      reply.code(404).send({ error: NOT_FOUND });
    } else {
      reply.code(500).send({ error: "Something went wrong" });
    }
  }
}

export async function deleteConversationTagHandler(
  request: FastifyRequest<{ Params: ByTagIdSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const tag = await deleteConversationTag(request.params.tagId, orgId);
    reply.code(200).send(tag);
  } catch (error) {
    log.error(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      reply.code(404).send({ error: NOT_FOUND });
    } else {
      reply.code(500).send({ error: "Something went wrong" });
    }
  }
}

export async function getConversationTagsHandler(
  request: FastifyRequest<{ Params: ByConversationIdSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const tags = await getTagsForConversation(request.params.conversationId, orgId);
    if (!tags) return reply.code(404).send({ error: "Conversation not found" });
    reply.code(200).send(tags);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function assignConversationTagsHandler(
  request: FastifyRequest<{
    Params: ByConversationIdSchema;
    Body: AssignTagsToConversationSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const tags = await assignTagsToConversation(
      request.params.conversationId,
      request.body.tagIds,
      orgId,
    );
    if (!tags) return reply.code(404).send({ error: "Conversation not found" });
    reply.code(200).send(tags);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}
