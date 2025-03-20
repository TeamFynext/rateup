import prisma from "../../utils/prisma";
import { CreateCommentInput } from "./ticket.schema";
import { createEmailBodyTicketAssigned } from "../../utils/email/tickets/ticketAssigned";
import { sendAWSEmail } from "../../utils/email/sendAWSEmail";
import { parsePhoneforWa } from "../loyalty/util";
import { log } from "../../utils/logger";
import {
  getSession,
  sendTextMessage,
} from "../whatsapp/whatsappSurvey/wasurvey.service";
import { validateSession } from "../whatsapp/whatsappSurvey/wasurvey.utils";

export async function sendTicketAssignWaMessage(newTicket, data) {
  const user = await prisma.user.findUnique({
    where: {
      id: newTicket.assignedToId,
    },
    select: {
      phone: true,
    },
  });
  const phone = parsePhoneforWa(user.phone);
  if (!phone) {
    log.trace("Phone number not found for the ticket assigned user");
    return;
  }
  const { orgId, team_name, org_name } = data;
  const session = await getSession(orgId, phone);
  if (!validateSession(session)) {
    log.trace("Aborting...session not found for phone: %s", phone);
    return;
  }
  const { number: ticket_no, priority } = newTicket;
  const message = `A ticket has been assigned to you on RateUp.app under *${team_name}* team of *${org_name}*.\nKindly check the ticket and take necessary actions.\n\nTicket No: *#${ticket_no}*\nPriority: *${priority}*`;
  await sendTextMessage({ phone, orgId }, null, message);
}

export async function sendTicketAssignEmail(newTicket) {
  const user = await prisma.user.findUnique({
    where: {
      id: newTicket.assignedToId,
    },
    select: {
      email: true,
    },
  });

  const team = await prisma.team.findUnique({
    where: {
      id: newTicket.teamId,
    },
    include: {
      org: true,
    },
  });

  let teamName = team.name;
  let orgName = team.org.name;

  if (newTicket && user?.email && teamName && orgName) {
    console.log("sending ticket email....");
    let ticket_link =
      `${process.env.FRONTEND_URL}/dashboard/tickets/` + newTicket.id;
    const msg = {
      to: user.email, // Change to your recipient
      // from: 'hello@rateup.app', // Change to your verified sender
      subject: `Ticket Assigned to You - ${orgName}`,
      text: `A ticket has been assigned to you on Rateup.app`,
      html: createEmailBodyTicketAssigned(
        ticket_link,
        newTicket.number,
        teamName,
        orgName,
        newTicket.priority,
      ),
    };
    try {
      sendAWSEmail(msg);
    } catch (error) {
      console.error(error);
      throw new Error("Email sending failed. E:" + error);
    }
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
