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
import { QuestionType2, SurveyType } from "../../types/enums";
import { parsePhoneforWa } from "../loyalty/util";
import { log } from "../../utils/logger";
import { getContent } from "../../utils/survey/response.data";
import {
  getSession,
  sendTextMessage,
} from "../whatsapp/whatsappSurvey/wasurvey.service";
import { validateSession } from "../whatsapp/whatsappSurvey/wasurvey.utils";

export async function createTicket(
  input: CreateTicketInput,
  createdBy: string,
  responsePlatform?: string,
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
    type,
    waAutomatedReplyMessageId,
  } = input;

  let isCustomTicket = type === TicketType.CUSTOM;
  let description = "";
  if (isCustomTicket) {
    description = firstComment;
  }

  try {
    if (
      !isCustomTicket &&
      !reviewId &&
      !surveyResponseId &&
      !waAutomatedReplyMessageId
    ) {
      throw new Error(
        "ReviewId or SurveyResponseId or waAutomatedReplyMessageId is required",
      );
    } else {
      let ticketType = reviewId
        ? TicketType.REVIEW
        : isCustomTicket
          ? TicketType.CUSTOM
          : waAutomatedReplyMessageId
            ? TicketType.AUTOMATION
            : responsePlatform === "WHATSAPP"
              ? TicketType.FLOW_RESPONSE
              : TicketType.SURVEY_RESPONSE;

      let ticket;

      if (reviewId || surveyResponseId || waAutomatedReplyMessageId) {
        ticket = await prisma.ticket.findFirst({
          where: {
            ...(ticketType === TicketType.SURVEY_RESPONSE ||
            ticketType === TicketType.FLOW_RESPONSE
              ? { surveyResponseId }
              : ticketType === TicketType.REVIEW
                ? { reviewId }
                : { waAutomatedReplyMessageId }),
          },
        });
      }

      if (ticket) {
        throw new Error(
          "Ticket already exists for this review or survey response or message",
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
            description: description,
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
            ...(waAutomatedReplyMessageId && {
              waAutomatedReplyMessage: {
                connect: {
                  id: waAutomatedReplyMessageId,
                },
              },
            }),
            comments: {
              create: {
                text: isCustomTicket
                  ? `Ticket created on ${formatDateT1(Date.now())}`
                  : firstComment,
                createdBy: {
                  connect: {
                    id: createdBy,
                  },
                },
              },
            },
          },
        });

        if (surveyResponseId) {
          const sRes = await prisma.surveyResponse.findUnique({
            where: {
              id: surveyResponseId,
            },
            select: {
              surveyTeamMapId: true,
            },
          });

          const surveyTeamMap = await prisma.surveyTeamMap.findUnique({
            where: {
              id: sRes.surveyTeamMapId,
            },
            include: {
              survey: {
                select: {
                  id: true,
                  enableTicketEmailAlerts: true,
                  enableTicketWaMessageAlerts: true,
                  type: true,
                  orgId: true,
                  org: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
              team: {
                select: {
                  name: true,
                },
              },
            },
          });

          if (surveyTeamMap?.survey?.enableTicketEmailAlerts) {
            sendTicketAssignEmail(newTicket);
          }
          if (surveyTeamMap?.survey?.enableTicketWaMessageAlerts) {
            const {
              survey: {
                org: { name: org_name },
                orgId,
              },
              team: { name: team_name },
            } = surveyTeamMap;
            await sendTicketAssignWaMessage(newTicket, {
              orgId,
              team_name,
              org_name,
            });
          }
        } else {
          sendTicketAssignEmail(newTicket);
        }
        return newTicket;
      }
    }
  } catch (error) {
    throw new Error(error);
  }
}

async function sendTicketAssignWaMessage(newTicket, data) {
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
      include: {
        surveyResponse: {
          select: {
            surveyTeamMap: {
              select: {
                surveyId: true,
              },
            },
          },
        },
      },
    });

    return tickets.map((t) => ({
      ...t,
      surveyId: t?.surveyResponse?.surveyTeamMap?.surveyId,
      surveyResponse: undefined,
    }));
  } catch (error) {
    throw new Error("Failed to fetch tickets");
  }
}

export function getQuestionTitleById(questions, questionId) {
  const question = questions.find((question) => question.id === questionId);
  return question?.title?.English ?? question?.label;
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
                survey: {
                  select: {
                    questions: true,
                    type: true,
                    WaFlow: {
                      select: {
                        json: true,
                        ticketIssued: true,
                      },
                    },
                    enableAutoGenerateTicket: true,
                  },
                },
              },
            },
          },
        },
        comments: {
          include: {
            createdBy: true,
          },
        },
        waAutomatedReplyMessage: {
          select: {
            message: true,
            phone: true,
            waAutomatedReply: {
              select: {
                name: true,
              },
            },
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
          profilePhoto: createdBy.profilePhoto,
        },
      };
    });

    let updatedResponse = null;
    if (surveyResponse) {
      const isFlow =
        surveyResponse?.surveyTeamMap?.survey?.type === SurveyType.WaFlow;
      if (isFlow) {
        const questions = (
          surveyResponse?.surveyTeamMap?.survey?.WaFlow
            ?.json as unknown as WaFlowJson
        )?.screens?.flatMap((screen) =>
          screen?.layout?.children?.filter(
            (child) => child?.type !== "Footer" && child.name,
          ),
        ) as unknown as Question2[];
        const filteredResponses = surveyResponse?.surveyTeamMap?.survey
          ?.enableAutoGenerateTicket
          ? surveyResponse?.responses
          : (
              surveyResponse?.responses as unknown as {
                questionId: string;
                response: any;
              }[]
            )?.filter((response) =>
              (
                surveyResponse?.surveyTeamMap?.survey?.WaFlow
                  ?.ticketIssued as unknown as FlowTicket[]
              ).some((t) => t.questionId === response.questionId),
            );
        updatedResponse = filteredResponses.map((response) => {
          const question = questions.find(
            (question) => question.id === response?.questionId,
          );
          return {
            ...response,
            question: {
              title: question.label,
              choices: question["data-source"],
            },
            type: QuestionType2[question.metaType],
          };
        });
      } else {
        const questions = surveyResponse?.surveyTeamMap?.survey
          ?.questions as unknown as Question[];
        const filteredResponses = surveyResponse?.surveyTeamMap?.survey
          ?.enableAutoGenerateTicket
          ? surveyResponse?.responses
          : (
              surveyResponse?.responses as unknown as QuestionResponse[]
            )?.filter((response) => {
              const question = questions.find(
                (question) => question.id === response?.questionId,
              );
              return question.ticketIssue;
            });
        updatedResponse = filteredResponses.map((response) => {
          const question = questions.find(
            (question) => question.id === response?.questionId,
          );
          return {
            ...response,
            question: {
              title: getContent(question?.title?.English),
              choices: question.choices,
            },
          };
        });
      }
    }

    return {
      ...restData,
      surveyResponse: updatedResponse,
      teamName: team?.name,
      comments: commentsData,
      responseLanguage: surveyResponse?.language,
    };
  } catch (error) {
    log.error(error);
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
export async function autoGenerateTicket({
  teamId,
  surveyResponseId,
  responsePlatform,
  waAutomatedReplyMessageId,
}: {
  teamId: string;
  surveyResponseId?: string;
  responsePlatform?: string;
  waAutomatedReplyMessageId?: string;
}) {
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
    title: surveyResponseId
      ? "Response Ticket (Auto Generated)"
      : "WhatsApp Automation Ticket",
    priority: TicketPriority.LOW,
    teamId: teamId,
    // deadline: null,
    assignedToId: assignedTo,
    reviewId: null,
    surveyResponseId: surveyResponseId,
    firstComment: surveyResponseId
      ? "This ticket is raised automatically based on the survey response"
      : "This ticket is raised automatically for the whatsapp message based on the automated reply rule",
    waAutomatedReplyMessageId,
  };

  let createdNewTicket = await createTicket(
    ticketData,
    createdBy,
    responsePlatform,
  );

  return createdNewTicket;
}
