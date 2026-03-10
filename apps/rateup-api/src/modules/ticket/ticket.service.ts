import prisma from "../../utils/prisma.js";
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
  if (
    !contact ||
    (contact.lastReceivedMessageTimeStamp &&
      dayjs().diff(dayjs(contact.lastReceivedMessageTimeStamp), "hour") < 24)
  ) {
    log.trace(
      "Aborting...contact not found or message sent within the last 24 hours for phone: %s",
      phone,
    );
    return;
  }
  const message = `A ticket has been assigned to you on RateUp.app under *${data.board_name}* board in the *${data.column_name}* column.\nPlease review the ticket and take necessary actions.\n\nTicket ID: *${data.ticketId}*\nLink: https://rateup.app/dashboard/tickets/${data.id}`;
  await sendTextMessage({ phone, orgId }, null, message);
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
    console.error(error);
    throw new Error("Email sending failed. E:" + error);
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
  if (
    !contact ||
    (contact.lastReceivedMessageTimeStamp &&
      dayjs().diff(dayjs(contact.lastReceivedMessageTimeStamp), "hour") < 24)
  ) {
    log.trace(
      "Aborting...contact not found or message sent within the last 24 hours for phone: %s",
      phone,
    );
    return;
  }
  const message = `A new ticket has been created on RateUp.app under *${data.board_name}* board in the *${data.column_name}* column.\nPlease review the ticket and take necessary actions.\n\nTicket ID: *${data.ticketId}*\nLink: https://rateup.app/dashboard/tickets/${data.id}`;
  await sendTextMessage({ phone, orgId }, null, message);
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
    text: `A ticket has been assigned to you on Rateup.app`,
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
    console.error(error);
    throw new Error("Email sending failed. E:" + error);
  }
}

export async function createComment(input: CreateCommentInput, userId: string) {
  const { ticketCardId, msg } = input;

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
