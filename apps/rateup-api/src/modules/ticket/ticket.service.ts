import { TicketPriority, TicketStatus, TicketType } from "@prisma/client";
import prisma from "../../utils/prisma";
import {
  CreateCommentInput,
  CreateTicketInput,
  UpdateStatusInput,
  UpdateTicketInput,
} from "./ticket.schema";
import { Role } from "../../utils/enums";
import { formatDateT1 } from "../../utils/date";
import { createEmailBodyTicketAssigned } from "../../utils/email/tickets/ticketAssigned";
import { sendAWSEmail } from "../../utils/email/sendAWSEmail";

export async function createTicket(
  input: CreateTicketInput,
  createdBy: string,
) {
  const {
    title,
    priority,
    teamId,
    deadline,
    assignedToId,
    reviewId,
    surveyResponseId,
    firstComment,
  } = input;

  try {
    if (!reviewId && !surveyResponseId) {
      throw new Error("ReviewId or SurveyResponseId is required");
    } else {
      let ticketType = reviewId
        ? TicketType.REVIEW
        : TicketType.SURVEY_RESPONSE;

      const ticket = await prisma.ticket.findFirst({
        where: {
          ...(ticketType === TicketType.SURVEY_RESPONSE
            ? { surveyResponseId }
            : { reviewId }),
        },
      });

      if (ticket) {
        throw new Error(
          "Ticket already exists for this review or survey response",
        );
      } else {
        const newTicket = await prisma.ticket.create({
          data: {
            title: title,
            createdBy: {
              connect: {
                id: createdBy,
              },
            },
            type: ticketType,
            status: TicketStatus.OPEN,
            priority: priority,
            team: {
              connect: {
                id: teamId,
              },
            },
            deadline: deadline ? new Date(deadline) : null,
            assignedTo: {
              connect: {
                id: assignedToId,
              },
            },
            ...(reviewId && {
              review: {
                connect: {
                  id: reviewId,
                },
              },
            }),
            ...(surveyResponseId && {
              surveyResponse: {
                connect: {
                  id: surveyResponseId,
                },
              },
            }),
            comments: {
              create: {
                text: firstComment,
                createdBy: {
                  connect: {
                    id: createdBy,
                  },
                },
              },
            },
          },
        });

        sendTicketAssignEmail(newTicket);

        return newTicket;
      }
    }
  } catch (error) {
    throw new Error(error);
  }
}

async function sendTicketAssignEmail(newTicket) {
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

export async function getAllTicketsByUser(userId: string) {
  try {
    const teams = await prisma.teamMember.findMany({
      where: {
        userId,
      },
      select: {
        teamId: true,
      },
    });

    const teamIds = teams.map((team) => team.teamId);

    // Fetch all tickets associated with the user's teams
    const tickets = await prisma.ticket.findMany({
      where: {
        teamId: {
          in: teamIds,
        },
      },
    });

    return tickets;
  } catch (error) {
    throw new Error("Failed to fetch tickets");
  }
}

export function getQuestionTitleById(questions, questionId) {
  return questions.find((question) => question.id === questionId).title.English;
}

//get single ticket with associated comments
export async function getSingleTicket(ticketId: string) {
  try {
    const ticketRes = await prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },
      include: {
        team: true,
        review: true,
        surveyResponse: {
          include: {
            surveyTeamMap: {
              include: {
                survey: true,
              },
            },
          },
        },
        comments: {
          include: {
            createdBy: true,
          },
        },
      },
    });

    let { comments, surveyResponse, team, ...restData } = ticketRes;

    let commentsData = comments.map((comment) => {
      let { createdBy, ticketId, ...restCommentData } = comment;
      return {
        ...restCommentData,
        createdBy: {
          id: createdBy.id,
          name: createdBy.name,
          email: createdBy.email,
        },
      };
    });

    let updatedResponse = null;
    if (surveyResponse) {
      const questions = surveyResponse?.surveyTeamMap?.survey?.questions;
      updatedResponse = surveyResponse?.responses?.map((response) => {
        const questionTitle = getQuestionTitleById(
          questions,
          response?.questionId,
        );
        console.log(
          `Question Title: ${questionTitle}, Response: ${response?.response?.Smiley}`,
        );

        return { ...response, questionTitle: questionTitle };
      });
    }

    return {
      ...restData,
      surveyResponse: updatedResponse,
      teamName: team?.name,
      comments: commentsData,
    };
  } catch (error) {
    throw new Error("Failed to fetch ticket");
  }
}

export async function deleteTicketById(ticketId: string) {
  try {
    const ticket = await prisma.ticket.delete({
      where: {
        id: ticketId,
      },
    });

    return ticket;
  } catch (error) {
    throw new Error("Failed to delete ticket");
  }
}

export async function createComment(input: CreateCommentInput) {
  const { ticketId, createdBy, msg } = input;

  const newComment = await prisma.ticketComment.create({
    data: {
      text: msg,
      createdBy: {
        connect: {
          id: createdBy,
        },
      },
      ticket: {
        connect: {
          id: ticketId,
        },
      },
    },
  });

  return newComment;
}

//create update ticket status
export async function updateTicketStatus(
  ticketId: string,
  userId: string,
  input: UpdateStatusInput,
) {
  // if (input.status === TicketStatus.CLOSED && input.role !== "SUPER_ADMIN") {
  //   throw new Error("SUPER_ADMIN can only update to CLOSED status");
  // } else if ((input.status === TicketStatus.IN_PROGRESS || input.status === TicketStatus.OPEN || input.status === TicketStatus.RESOLVED) && input.role !== "ADMIN") {
  //  throw new Error("Admin can only update to this status");
  // }

  const updatedTicket = await prisma.ticket.update({
    where: {
      id: ticketId,
    },
    data: {
      status: input.status,
    },
  });

  if (updatedTicket) {
    let ticketData = {
      ticketId: updatedTicket.id,
      createdBy: userId,
      msg: `Note: Updated the Ticket Status to ${input.status}.`,
    };
    createComment(ticketData);
  }

  return updatedTicket;
}

export async function updateTicket(
  ticketId: string,
  userId: string,
  input: UpdateTicketInput,
) {
  let updateData;

  if (input.assignedToId) {
    let assignedTo = {
      assignedTo: {
        connect: {
          id: input.assignedToId,
        },
      },
    };
    updateData = {
      ...assignedTo,
    };
  } else {
    updateData = {
      ...input,
    };
  }

  const updatedTicket = await prisma.ticket.update({
    where: {
      id: ticketId,
    },
    data: updateData,
  });

  if (updatedTicket) {
    const updatedProperties = Object.keys(input).join(", ");

    let ticketData = {
      ticketId: updatedTicket.id,
      createdBy: userId,
      msg: input.assignedToName
        ? `Note: Ticket re-assigned to ${input.assignedToName}.`
        : input.priority
          ? `Note: Ticket priority changed to ${input.priority}.`
          : input.deadline
            ? `Note: Deadline changed to ${formatDateT1(input.deadline)}.`
            : `Note: Updated the ticket ${updatedProperties}.`,
    };
    createComment(ticketData);
  }

  if (input.assignedToId) {
    sendTicketAssignEmail(updatedTicket);
  }

  return updatedTicket;
}

//Autogenerate ticket
export async function autoGenerateTicket(
  teamId: string,
  surveyResponseId: string,
) {
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  let teamMembers = team?.members;

  const memberList = [];

  for (const member of teamMembers) {
    const orgMember = await prisma.orgMember.findFirst({
      where: {
        userId: member.userId,
        orgId: team.orgId,
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        role: true,
      },
    });

    memberList.push({
      userId: orgMember.user.id,
      name: orgMember.user.name,
      role: orgMember.role,
    });
  }

  const createdBy = memberList.find(
    (member) => member.role === Role.SUPER_ADMIN,
  )?.userId;

  const assignedTo =
    memberList.find((member) => member.role === Role.ADMIN)?.userId ||
    memberList.find(
      (member) =>
        member.role === Role.SUPER_ADMIN && member.userId !== createdBy.id,
    )?.userId ||
    createdBy;

  const ticketData = {
    title: "Response Ticket (Auto Generated)",
    priority: TicketPriority.LOW,
    teamId: teamId,
    // deadline: null,
    assignedToId: assignedTo,
    reviewId: null,
    surveyResponseId: surveyResponseId,
    firstComment:
      "This ticket is raised automatically based on the survey response",
  };

  let createdNewTicket = await createTicket(ticketData, createdBy);

  return createdNewTicket;
}
