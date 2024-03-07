import { FastifyInstance } from "fastify";
import { $TicketRef } from "./ticket.schema";
import {
  createCommentHandler,
  createTicketHandler,
  deleteSingleTicketHandler,
  getAllTicketsByUserHandler,
  getSingleTicketHandler,
  updateStatusHandler,
  updateTicketHandler,
} from "./ticket.controller";
import { checkSession } from "../../utils/checkSession";
import { checkRoleHandler } from "../../utils/checkRoleHandler";
import { verifyTeamAccess } from "../team/team.auth";
import { verifyTicketAccess } from "./ticket.auth";

export async function ticketRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.post(
    "/create",
    {
      preHandler: [verifyTeamAccess, checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        body: $TicketRef("createTicketRequestSchema"),
        response: {
          201: $TicketRef("createTicketResponseSchema"),
        },
      },
    },
    createTicketHandler,
  );

  //get all tickets
  server.get("/", getAllTicketsByUserHandler);

  //get single ticket with associated comments
  server.get(
    "/:id",
    {
      preHandler: [verifyTicketAccess],
      schema: {
        params: $TicketRef("idParamsSchema"),
      },
    },
    getSingleTicketHandler,
  );

  server.delete(
    "/:id",
    {
      preHandler: [verifyTicketAccess, checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        params: $TicketRef("idParamsSchema"),
      },
    },
    deleteSingleTicketHandler,
  );

  server.put(
    "/:id",
    {
      preHandler: [verifyTicketAccess],
      schema: {
        params: $TicketRef("idParamsSchema"),
        body: $TicketRef("updateTicketRequestSchema"),
      },
    },
    updateTicketHandler,
  );

  //update ticket status
  server.put(
    "/:id/status",
    {
      preHandler: [verifyTicketAccess],
      schema: {
        params: $TicketRef("idParamsSchema"),
        body: $TicketRef("updateStatusRequestSchema"),
      },
    },
    updateStatusHandler,
  );

  server.post(
    "/:id/comment",
    {
      preHandler: [verifyTicketAccess],

      schema: {
        body: $TicketRef("createCommentRequestSchema"),
      },
    },
    createCommentHandler,
  );
}
