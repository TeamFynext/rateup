import prisma from "../../utils/prisma.js";
import { getColumnIdByCardId } from "./ticketCard/card.service.js";
import { getBoardIdByColumnId } from "./ticketColumn/column.service.js";
import { isBoardMember } from "./ticketBoard/board.service.js";
import { CreateCommentInput } from "./ticket.schema.js";
import {
  createEmailBodyTicketAssigned,
  createEmailBodyTicketCreated,
} from "../../utils/email/tickets/ticketAssigned.js";
import { parsePhoneforWa } from "../loyalty/util.js";
import { log } from "../../utils/logger.js";
import { sendTextMessage } from "../whatsapp/whatsappSurvey/wasurvey.service.js";
import { getContactByPhoneNumberAndOrgId } from "../contact/contact.service.js";
import dayjs from "dayjs";
import { notificationQueue } from "../../utils/redisConnection.js";

export async function sendTicketAssignedWaMessage(data: {
  phone: string;
  orgId: string;
  board_name: string;
  column_name: string;
  id: string;
  ticketId: string;
}) {
  const phone = parsePhoneforWa(data.phone);
  if (!phone) {
    log.trace("Phone number not found for the ticket create notifcation user");
    return;
  }
  const contact = await getContactByPhoneNumberAndOrgId(data.phone, data.orgId);
  const { orgId } = data;
  // The guard used to be the INVERSE of the WhatsApp customer-service window: it
  // refused to send inside the 24 hours — when a free-form message is the one thing
  // that is allowed — and sent once the window had closed, or to a contact who had
  // never written at all. `lastReceivedMessageTimeStamp` is inbound recency (the
  // dashboard counts rows newer than 24 hours as the org's active conversations).
  // See issues.txt 30.2.
  const withinServiceWindow =
    Boolean(contact?.lastReceivedMessageTimeStamp) &&
    dayjs().diff(dayjs(contact!.lastReceivedMessageTimeStamp), "hour") < 24;
  if (!contact || !withinServiceWindow) {
    log.trace(
      "Aborting...contact not found or outside the 24 hour service window for phone: %s",
      phone,
    );
    return;
  }
  const message = `A ticket has been assigned to you on RateUp.app under *${data.board_name}* board in the *${data.column_name}* column.\nPlease review the ticket and take necessary actions.\n\nTicket ID: *${data.ticketId}*\nLink: ${process.env.FRONTEND_URL}/dashboard/tickets/${data.id}`;
  // Ticket notifications are system messages — exempt from the conversation limit.
  await sendTextMessage({ phone, orgId }, null, message, true);
}

export async function sendTicketAssignedEmail(data: {
  email: string;
  orgId: string;
  board_name: string;
  column_name: string;
  id: string;
  ticketId: string;
}) {
  let ticket_link = `${process.env.FRONTEND_URL}/dashboard/tickets/` + data.id;
  const msg = {
    to: data.email,
    subject: `Ticket Assigned to You `,
    text: `A ticket has been assigned to you on Rateup.app`,
    html: createEmailBodyTicketAssigned({
      ticket_link,
      ticket_no: data.ticketId,
      board_name: data.board_name,
      column_name: data.column_name,
    }),
  };
  try {
    await notificationQueue.add("notification", {
      emailData: msg,
    });
  } catch (error) {
    // `"..." + error` concatenated the caught value onto a string and discarded the
    // original stack; `{ cause }` keeps it. Same shape as issues.txt 22.4.
    log.error({ err: error }, "Ticket notification email could not be queued");
    throw new Error("Email sending failed", { cause: error });
  }
}

export async function sendTicketCreateWaMessage(data: {
  phone: string;
  orgId: string;
  board_name: string;
  column_name: string;
  id: string;
  ticketId: string;
}) {
  const phone = parsePhoneforWa(data.phone);
  if (!phone) {
    log.trace("Phone number not found for the ticket create notifcation user");
    return;
  }
  const contact = await getContactByPhoneNumberAndOrgId(data.phone, data.orgId);
  const { orgId } = data;
  // The guard used to be the INVERSE of the WhatsApp customer-service window: it
  // refused to send inside the 24 hours — when a free-form message is the one thing
  // that is allowed — and sent once the window had closed, or to a contact who had
  // never written at all. `lastReceivedMessageTimeStamp` is inbound recency (the
  // dashboard counts rows newer than 24 hours as the org's active conversations).
  // See issues.txt 30.2.
  const withinServiceWindow =
    Boolean(contact?.lastReceivedMessageTimeStamp) &&
    dayjs().diff(dayjs(contact!.lastReceivedMessageTimeStamp), "hour") < 24;
  if (!contact || !withinServiceWindow) {
    log.trace(
      "Aborting...contact not found or outside the 24 hour service window for phone: %s",
      phone,
    );
    return;
  }
  const message = `A new ticket has been created on RateUp.app under *${data.board_name}* board in the *${data.column_name}* column.\nPlease review the ticket and take necessary actions.\n\nTicket ID: *${data.ticketId}*\nLink: ${process.env.FRONTEND_URL}/dashboard/tickets/${data.id}`;
  // Ticket notifications are system messages — exempt from the conversation limit.
  await sendTextMessage({ phone, orgId }, null, message, true);
}

export async function sendTicketCreateEmail(data: {
  email: string;
  orgId: string;
  board_name: string;
  column_name: string;
  id: string;
  ticketId: string;
}) {
  let ticket_link = `${process.env.FRONTEND_URL}/dashboard/tickets/` + data.id;
  const msg = {
    to: data.email,
    subject: `Ticket Created`,
    // Said "assigned to you", the same string the assignment mail uses, so previews
    // and text-only clients announced an assignment that never happened.
    // See issues.txt 30.6.
    text: `A ticket has been created on Rateup.app`,
    html: createEmailBodyTicketCreated({
      ticket_link,
      ticket_no: data.ticketId,
      board_name: data.board_name,
      column_name: data.column_name,
    }),
  };
  try {
    await notificationQueue.add("notification", {
      emailData: msg,
    });
  } catch (error) {
    // `"..." + error` concatenated the caught value onto a string and discarded the
    // original stack; `{ cause }` keeps it. Same shape as issues.txt 22.4.
    log.error({ err: error }, "Ticket notification email could not be queued");
    throw new Error("Email sending failed", { cause: error });
  }
}

/** Raised when the caller may not comment on the named card. issues.txt 30.1. */
export class TicketCommentAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TicketCommentAccessError";
  }
}

/**
 * Attaches a comment to a card the caller can actually reach.
 *
 * The route's access check was commented out AND the path id was ignored — the
 * target came from `body.ticketCardId` — so any authenticated user could plant a
 * comment on any card on the platform, and getCardById renders it over the author's
 * real name and email. Both halves are fixed: the board is resolved from the body's
 * card id and membership is required, which is what a path-based preHandler could
 * not have done. See issues.txt 30.1.
 */
export async function createComment(input: CreateCommentInput, userId: string) {
  const { ticketCardId, msg } = input;

  const columnId = await getColumnIdByCardId(ticketCardId);
  const boardId = columnId ? await getBoardIdByColumnId(columnId) : undefined;
  if (!boardId) {
    throw new TicketCommentAccessError("Card not found");
  }
  if (!(await isBoardMember(boardId, userId))) {
    throw new TicketCommentAccessError("You don't have access to this card");
  }

  const newComment = await prisma.ticketComment.create({
    data: {
      text: msg,
      createdById: userId,
      ticketCardId,
    },
  });

  return newComment;
}

export async function deleteComment(id: string, userId: string) {
  await prisma.ticketComment.delete({
    where: {
      id,
      createdById: userId,
    },
  });
}
