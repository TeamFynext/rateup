import { FastifyReply, FastifyRequest } from "fastify";
import {
  createCard,
  getCards,
  getCardById,
  updateCard,
  deleteCard,
  moveCard,
  getCardActivities,
  reorderCards,
  getCardTeamMembersById,
} from "./card.service.js";
import { TicketPriority, TicketType } from "../../../../generated/prisma/client.js";
import { UpdateCardRequest } from "./card.schema.js";

export async function createCardHandler(
  request: FastifyRequest<{
    Body: {
      title: string;
      description?: string;
      ticketColumnId: string;
      type: TicketType;
      contactId?: string;
      surveyResponseId?: string;
      reviewId?: string;
      priority?: TicketPriority;
      labelIds?: string[] | null;
      deadline?: string | Date | null;
      assignees?: { assigneeId: string }[];
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const {
      title,
      description,
      ticketColumnId,
      type,
      contactId,
      surveyResponseId,
      reviewId,
      priority,
      labelIds,
      deadline,
      assignees,
    } = request.body;
    const userId = request.userId;
    const card = await createCard({
      title,
      description,
      ticketColumnId,
      userId,
      type,
      contactId,
      surveyResponseId,
      reviewId,
      priority,
      labelIds,
      deadline,
      assignees,
      orgId: request.user.orgId,
    });
    return reply.code(201).send(card);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error creating card" });
  }
}

export async function getAllCardsHandler(
  request: FastifyRequest<{
    Params: { ticketColumnId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { ticketColumnId } = request.params;
    const cards = await getCards(ticketColumnId);
    return reply.code(200).send(cards);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving cards" });
  }
}

export async function getSingleCardHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const card = await getCardById(id);

    if (!card) {
      return reply.code(404).send({ message: "Card not found" });
    }

    return reply.code(200).send(card);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving card" });
  }
}

export async function getSingleCardTeamMembersHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const members = await getCardTeamMembersById(id);

    if (!members) {
      return reply.code(404).send({ message: "Members not found" });
    }

    return reply.code(200).send(members);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving members" });
  }
}

export async function updateCardHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateCardRequest;
  }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const body = request.body;
    const userId = request.userId;

    const updatedCard = await updateCard(id, body, userId, request.user.orgId);

    if (!updatedCard) {
      return reply.code(404).send({ message: "Card not found" });
    }

    return reply.code(200).send(updatedCard);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error updating card" });
  }
}

export async function moveCardHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { ticketColumnId: string; order?: number };
  }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const { ticketColumnId, order } = request.body;
    const userId = request.userId;

    const movedCard = await moveCard(id, ticketColumnId, userId, request.user.orgId, order);

    if (!movedCard) {
      return reply.code(404).send({ message: "Card not found" });
    }

    return reply.code(200).send(movedCard);
  } catch (error) {
    console.log("🚀 ~ error:", error);
    request.log.error(error);
    return reply.code(500).send({ message: "Error moving card" });
  }
}

export async function reorderCardsHandler(
  request: FastifyRequest<{
    Body: { cards: { id: string; order: number }[] };
  }>,
  reply: FastifyReply,
) {
  try {
    const { cards } = request.body;

    const updatedCards = await reorderCards(cards);
    return reply.code(200).send(updatedCards);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error reordering cards" });
  }
}

export async function deleteCardHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const userId = request.userId;
    await deleteCard(id, userId);
    return reply.code(204).send();
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error deleting card" });
  }
}

export async function getCardActivitiesHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const activities = await getCardActivities(id);
    return reply.code(200).send(activities);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving card activities" });
  }
}
