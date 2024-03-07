import {
  CreateCommentInput,
  CreateTicketInput,
  IdParamsSchema,
  UpdateStatusInput,
  UpdateTicketInput,
} from "./ticket.schema";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  createComment,
  createTicket,
  deleteTicketById,
  getAllTicketsByUser,
  getSingleTicket,
  updateTicket,
  updateTicketStatus,
} from "./ticket.service";
import Session from "supertokens-node/recipe/session";

export async function createTicketHandler(
  request: FastifyRequest<{
    Body: CreateTicketInput;
  }>,
  reply: FastifyReply,
) {
  const body = request.body;
  let ticket;

  let session = await Session.getSession(request, reply);
  const userId = session.getUserId();

  let createdBy = userId;

  try {
    ticket = await createTicket(body, createdBy);
    reply.code(201).send(ticket);
  } catch (e: any) {
    reply.code(500).send({ status: "failed", message: e.message });
    return;
  }
}

export async function getAllTicketsByUserHandler(
  request: FastifyRequest<{}>,
  reply: FastifyReply,
) {
  try {
    let session = await Session.getSession(request, reply);
    const userId = session.getUserId();

    const tickets = await getAllTicketsByUser(userId);
    if (!tickets) {
      reply.code(200).send({ message: "No tickets found" });
    } else {
      reply.code(200).send(tickets);
    }
  } catch (e) {
    reply.code(500).send({ message: e.message });
  }
}

export async function getSingleTicketHandler(
  request: FastifyRequest<{
    Params: IdParamsSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const ticket = await getSingleTicket(request.params.id);
    reply.code(200).send(ticket);
  } catch (e) {
    console.error(e);
    reply.code(500).send({ message: e.message });
  }
}

export async function deleteSingleTicketHandler(
  request: FastifyRequest<{
    Params: IdParamsSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const ticket = await deleteTicketById(request.params.id);
    reply.code(200).send("Ticket deleted Successfully");
  } catch (e) {
    console.error(e);
    reply.code(500).send({ message: e.message });
  }
}

export async function createCommentHandler(
  request: FastifyRequest<{
    Params: IdParamsSchema;
    Body: CreateCommentInput;
  }>,
  reply: FastifyReply,
) {
  const body = request.body;
  let comment;
  try {
    comment = await createComment(body);
    reply.code(201).send(comment);
  } catch (e: any) {
    console.error(e);
    reply.code(500).send({ status: "failed", message: e.message });
  }
}

// create updateticket code function
export async function updateTicketHandler(
  request: FastifyRequest<{
    Body: UpdateTicketInput;
    Params: IdParamsSchema;
  }>,
  reply: FastifyReply,
) {
  const body = request.body;
  let ticket;

  try {
    let session = await Session.getSession(request, reply);
    const userId = session.getUserId();

    ticket = await updateTicket(request.params.id, userId, body);
    reply.code(201).send(ticket);
  } catch (e: any) {
    console.error(e);
    reply.code(500).send({ status: "failed", message: e.message });
  }
}

//create update status
export async function updateStatusHandler(
  request: FastifyRequest<{
    Body: UpdateStatusInput;
    Params: IdParamsSchema;
  }>,
  reply: FastifyReply,
) {
  const body = request.body;
  let ticket;
  try {
    let session = await Session.getSession(request, reply);
    const userId = session.getUserId();

    ticket = await updateTicketStatus(request.params.id, userId, body);
    reply.code(201).send(ticket);
  } catch (e: any) {
    console.error(e);
    reply.code(500).send({ status: "failed", message: e.message });
  }
}
