import { FastifyRequest, FastifyReply } from "fastify";
import { IdParamsSchema } from "./ticket.schema";
import prisma from "../../utils/prisma";

export async function verifyTicketAccess(
  request: FastifyRequest<{
    Params: IdParamsSchema;
  }>,
  reply: FastifyReply,
) {
  const ticketId = request.params.id;
  const hasAccess = await hasAccessToTicket(ticketId, request.userId);

  if (!hasAccess) {
    reply.code(403).send({ message: "You don't have access to this Ticket" });
  }
}

export async function hasAccessToTicket(ticketId: string, userId: string) {
  try {
    if (!ticketId || !userId) {
      throw new Error("ticketId and userId must not be empty strings");
    }
    const ticket = await prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },
      include: {
        team: true,
      },
    });

    // Check if the user is part of any of the team associated with the ticket
    const teamId = ticket.team.id;
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId,
        teamId,
      },
    });
    if (teamMember) {
      return true;
    }
  } catch (e) {
    console.log(e);
    return false;
  }
}
