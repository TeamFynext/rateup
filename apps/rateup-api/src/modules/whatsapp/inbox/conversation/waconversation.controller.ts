import { FastifyReply, FastifyRequest } from "fastify";
import prisma from "../../../../utils/prisma.js";
import { log } from "../../../../utils/logger.js";
import { Role } from "../../../../utils/enums/index.js";
import { WaMessageAssignStatus } from "../../../../types/enums.js";
import { isTerminalInboxStatus } from "../../constants.js";
import { updateContactById } from "../../../contact/contact.service.js";
import { getOrOpenConversation } from "../../../contact/conversation/conversationLifecycle.service.js";
import {
  assignWaMessageToUser,
  markConversationMessagesAsRead,
} from "../message/wamessage.service.js";
import { sendNewWaMessageHandler } from "../message/wamessage.controller.js";
import {
  filterConversations,
  getConversationCountsByTab,
  getOrgConversation,
  getWaMessagesByConversationId,
} from "./waconversation.service.js";
import {
  AssignConversationBody,
  ByConversationIdParams,
  CloseConversationBody,
  ConversationFilterSchema,
  ReopenConversationBody,
} from "./waconversation.schema.js";

export async function getFilteredConversationsHandler(
  request: FastifyRequest<{ Body: ConversationFilterSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId, id: userId, role } = request.user;
    const rows = await filterConversations(orgId, request.body, userId, role as Role);
    reply.code(200).send(rows);
  } catch (e) {
    log.error("Error filtering conversations: %o", e);
    reply.code(500).send({ message: "Failed to filter conversations" });
  }
}

export async function getConversationCountsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { orgId, id: userId } = request.user;
    reply.code(200).send(await getConversationCountsByTab(orgId, userId));
  } catch (e) {
    log.error("Error counting conversations: %o", e);
    reply.code(500).send({ message: "Failed to count conversations" });
  }
}

export async function getConversationMessagesHandler(
  request: FastifyRequest<{
    Params: ByConversationIdParams;
    Querystring: { cursor?: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const conversation = await getOrgConversation(
      request.params.conversationId,
      request.user.orgId,
    );
    if (!conversation) return reply.code(404).send({ message: "Conversation not found" });
    const result = await getWaMessagesByConversationId(conversation.id, request.query.cursor);
    reply.code(200).send({ ...result, conversation });
  } catch (e) {
    log.error("Error fetching conversation messages: %o", e);
    reply.code(500).send({ message: "Failed to fetch messages" });
  }
}

/// Sends into a *session*: 409 when it is closed — the caller reopens (a new
/// session) explicitly instead of silently appending to a finished record.
/// Delegates to the legacy contact-keyed send pipeline, which threads the
/// message into the contact's open conversation (this one, by the invariant).
export async function sendConversationMessageHandler(
  request: FastifyRequest<{ Params: ByConversationIdParams; Body: unknown }>,
  reply: FastifyReply,
) {
  const conversation = await getOrgConversation(request.params.conversationId, request.user.orgId);
  if (!conversation) return reply.code(404).send({ message: "Conversation not found" });
  if (conversation.closedAt) {
    return reply.code(409).send({
      message: "Conversation is closed. Reopen it to start a new session.",
      conversationId: conversation.id,
    });
  }
  (request.params as any).contactId = conversation.contactId;
  return sendNewWaMessageHandler(request as any, reply);
}

export async function closeConversationHandler(
  request: FastifyRequest<{ Params: ByConversationIdParams; Body: CloseConversationBody }>,
  reply: FastifyReply,
) {
  try {
    const { orgId, id: userId } = request.user;
    const conversation = await getOrgConversation(request.params.conversationId, orgId);
    if (!conversation) return reply.code(404).send({ message: "Conversation not found" });
    if (conversation.closedAt) {
      return reply.code(409).send({ message: "Conversation is already closed" });
    }

    // The full legacy close pipeline (InboxStats, rules, Zapier, notifications,
    // close marker, WaInboxAssign wipe) runs through the contact; the
    // transactional mirror closes this conversation — the contact's only open
    // one, by the invariant.
    const contact = await updateContactById(
      conversation.contactId,
      { waMessageAssignStatus: request.body.status, messageId: request.body.messageId },
      userId,
    );
    reply.code(200).send({ conversationId: conversation.id, contact });
  } catch (e) {
    log.error("Error closing conversation: %o", e);
    reply.code(500).send({ message: "Failed to close conversation" });
  }
}

/// Reopening never resurrects the closed record: it opens a NEW session for
/// the same contact, optionally carrying the closed session's assignees over.
export async function reopenConversationHandler(
  request: FastifyRequest<{ Params: ByConversationIdParams; Body: ReopenConversationBody }>,
  reply: FastifyReply,
) {
  try {
    const { orgId, id: userId } = request.user;
    const conversation = await getOrgConversation(request.params.conversationId, orgId);
    if (!conversation) return reply.code(404).send({ message: "Conversation not found" });
    if (!conversation.closedAt) {
      return reply.code(409).send({
        message: "Conversation is already open",
        conversationId: conversation.id,
      });
    }

    // Bring the contact back to a live status first (the mirror refuses to
    // resurrect the closed conversation), then open the successor session.
    if (isTerminalInboxStatus(conversation.contact.waMessageAssignStatus)) {
      await updateContactById(
        conversation.contactId,
        { waMessageAssignStatus: WaMessageAssignStatus.UNASSIGNED },
        userId,
      );
    }
    const { conversation: reopened } = await getOrOpenConversation(conversation.contactId, orgId, {
      trigger: "agent",
      userId,
    });

    if (request.body.copyAssignees) {
      const previousAssignees = await prismaAssigneesOf(conversation.id);
      if (previousAssignees.length) {
        await assignWaMessageToUser(
          {
            contactId: conversation.contactId,
            assignees: previousAssignees,
            assignIfOnline: false,
            messageId: request.body.messageId,
          },
          orgId,
          userId,
        );
      }
    }

    reply.code(200).send({ conversation: reopened, reopenedFrom: conversation.id });
  } catch (e) {
    log.error("Error reopening conversation: %o", e);
    reply.code(500).send({ message: "Failed to reopen conversation" });
  }
}

async function prismaAssigneesOf(conversationId: string) {
  const rows = await prisma.conversationAssignedUserTeamMap.findMany({
    where: { conversationId },
    select: { userId: true, teamId: true },
  });
  return rows.map((r) => ({ userId: r.userId, teamId: r.teamId }));
}

export async function assignConversationHandler(
  request: FastifyRequest<{ Params: ByConversationIdParams; Body: AssignConversationBody }>,
  reply: FastifyReply,
) {
  try {
    const { orgId, id: userId } = request.user;
    const conversation = await getOrgConversation(request.params.conversationId, orgId);
    if (!conversation) return reply.code(404).send({ message: "Conversation not found" });
    if (conversation.closedAt) {
      return reply.code(409).send({
        message: "Conversation is closed. Reopen it to assign a new session.",
      });
    }

    const assignees = await assignWaMessageToUser(
      {
        contactId: conversation.contactId,
        assignees: request.body.assignees,
        assignIfOnline: request.body.assignIfOnline,
        messageId: request.body.messageId,
      },
      orgId,
      userId,
    );
    reply.code(200).send({ conversationId: conversation.id, assignees });
  } catch (e: any) {
    if (e?.statusCode === 400) return reply.code(400).send({ message: e.message });
    log.error("Error assigning conversation: %o", e);
    reply.code(500).send({ message: "Failed to assign conversation" });
  }
}

export async function markConversationReadHandler(
  request: FastifyRequest<{ Params: ByConversationIdParams }>,
  reply: FastifyReply,
) {
  try {
    const { orgId, id: userId } = request.user;
    const conversation = await getOrgConversation(request.params.conversationId, orgId);
    if (!conversation) return reply.code(404).send({ message: "Conversation not found" });
    await markConversationMessagesAsRead(conversation.id, userId);
    reply.code(200).send({ conversationId: conversation.id });
  } catch (e) {
    log.error("Error marking conversation read: %o", e);
    reply.code(500).send({ message: "Failed to mark conversation read" });
  }
}
