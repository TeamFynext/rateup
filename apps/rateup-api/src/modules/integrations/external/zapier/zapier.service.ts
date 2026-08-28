import { zapierTriggerQueue } from "../../../../workers/bullmq/queues/index.js";
import prisma from "../../../../utils/prisma.js";
import { WaMessageAssignStatus } from "../../../../types/enums.js";

export enum ZapierTriggers {
  CONTACT_CREATE = "new_contact_create",
  CONTACT_ASSIGN = "new_contact_assignee",
  NEW_MESSAGE = "new_message_received",
  CONVERSATION_CLOSED = "conversation_closed",
  CONTACT_UPDATED = "contact_updated",
  CONTACT_LIFECYCLE_UPDATED = "contact_lifecycle_updated",
  /**
   * A contact's lead moved to a different pipeline column — the board's
   * counterpart to {@link ZapierTriggers.CONTACT_LIFECYCLE_UPDATED}.
   *
   * Added beside it rather than replacing it: the lifecycle trigger is a live
   * external contract, and every Zap already built on it keeps firing unchanged.
   */
  CONTACT_STAGE_UPDATED = "contact_stage_updated",
  TICKET_CREATED = "new_ticket",
  CONTACT_ADDED_TO_GROUP = "contact_added_to_group",
  RESPONSE_SUBMITTED = "response_submitted",
  CONTACT_DELETED = "contact_deleted",
  TICKET_CARD_MOVED = "ticket_card_moved",
  TICKET_ASSIGNEE_UPDATED = "ticket_assignee_updated",
  NEW_TEAM_MEMBER_CREATED = "new_staff_joined_to_team",
}

export async function getSampleDataForTrigger(
  triggerKey: ZapierTriggers,
  orgId: string,
  page?: number,
) {
  let data = [];
  switch (triggerKey) {
    case ZapierTriggers.CONTACT_CREATE:
    case ZapierTriggers.CONTACT_DELETED:
    case ZapierTriggers.CONTACT_UPDATED:
    case ZapierTriggers.CONVERSATION_CLOSED: {
      const contacts = await prisma.contact.findMany({
        where: {
          orgId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          igsId: true,
          source: true,
          waMessageAssignStatus: true,
        },
        ...(page !== undefined
          ? {
              skip: page * 20,
              take: 20,
            }
          : {}),
        orderBy: {
          createdAt: "desc",
        },
      });
      data = [...contacts];
      break;
    }
    case ZapierTriggers.CONTACT_ASSIGN:
      const contactAssigns = await prisma.contact.findMany({
        where: {
          orgId,
          waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          igsId: true,
          waInboxAssign: {
            select: {
              assignedUser: {
                select: {
                  name: true,
                  email: true,
                },
              },
              Team: {
                select: {
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
        ...(page !== undefined
          ? {
              skip: page * 20,
              take: 20,
            }
          : {}),
        orderBy: {
          createdAt: "desc",
        },
      });
      data = contactAssigns.map((c) => ({
        contactId: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        igsId: c.igsId,
        assignees: c.waInboxAssign.map((a) => ({
          name: a.assignedUser.name,
          email: a.assignedUser.email,
          teamName: a.Team.name,
          teamCode: a.Team.code,
        })),
      }));
      break;
    case ZapierTriggers.CONTACT_ADDED_TO_GROUP:
      const groupContacts = await prisma.contactGroupMap.findMany({
        where: {
          contact: {
            orgId,
          },
        },
        select: {
          contactId: true,
          contactGroupId: true,
        },
        ...(page !== undefined
          ? {
              skip: page * 20,
              take: 20,
            }
          : {}),
      });
      data = [...groupContacts];
      break;
    case ZapierTriggers.CONTACT_LIFECYCLE_UPDATED:
      const contactLifecyles = await prisma.contact.findMany({
        where: {
          orgId,
          lifecycleId: {
            not: null,
          },
        },
        select: {
          id: true,
          lifecycleId: true,
          Lifecycle: {
            select: {
              name: true,
            },
          },
        },
        ...(page !== undefined
          ? {
              skip: page * 20,
              take: 20,
            }
          : {}),
        orderBy: {
          createdAt: "desc",
        },
      });
      data = contactLifecyles.map((l) => ({
        contactId: l.id,
        lifecycleId: l.lifecycleId,
        lifecycleName: l.Lifecycle?.name ?? null,
      }));
      break;
    case ZapierTriggers.CONTACT_STAGE_UPDATED: {
      const leads = await prisma.lead.findMany({
        where: { contactId: { not: null }, pipeline: { orgId } },
        select: {
          id: true,
          contactId: true,
          pipelineId: true,
          pipeline: { select: { name: true } },
          stageId: true,
          stage: { select: { name: true, status: true } },
        },
        ...(page !== undefined
          ? {
              skip: page * 20,
              take: 20,
            }
          : {}),
        orderBy: {
          createdAt: "desc",
        },
      });
      data = leads.map((lead) => ({
        contactId: lead.contactId,
        leadId: lead.id,
        pipelineId: lead.pipelineId,
        pipelineName: lead.pipeline.name,
        stageId: lead.stageId,
        stageName: lead.stage.name,
        stageStatus: lead.stage.status,
      }));
      break;
    }
    case ZapierTriggers.NEW_MESSAGE:
      const messages = await prisma.waMessage.findMany({
        where: {
          contact: {
            orgId,
          },
          messageBody: {
            path: ["exchangeProcess"],
            equals: "receive",
          },
        },
        select: {
          contact: {
            select: {
              phone: true,
            },
          },
          sourcePlatform: true,
          sourceIdentifier: true,
          messageId: true,
          messageBody: true,
        },
        ...(page !== undefined
          ? {
              skip: page * 20,
              take: 20,
            }
          : {}),
        orderBy: {
          createdAt: "desc",
        },
      });
      data = messages.map((m) => ({
        from: m.contact?.phone ?? null,
        messageBody: m.messageBody.receive,
        platform: m.sourcePlatform,
        source: m.sourceIdentifier,
        messageId: m.messageId,
      }));
      break;
    case ZapierTriggers.NEW_TEAM_MEMBER_CREATED:
      const users = await prisma.teamMember.findMany({
        where: {
          team: {
            orgId,
          },
        },
        select: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          team: {
            select: {
              name: true,
              code: true,
            },
          },
        },
        ...(page !== undefined
          ? {
              skip: page * 20,
              take: 20,
            }
          : {}),
        orderBy: {
          createdAt: "desc",
        },
      });
      data = users.map((u) => ({
        isExistingUser: true,
        name: u.user.name,
        email: u.user.email,
        teamName: u.team.name,
        teamCode: u.team.code,
      }));
      break;
    case ZapierTriggers.RESPONSE_SUBMITTED:
      const responses = await prisma.surveyResponse.findMany({
        where: {
          surveyTeamMap: {
            team: {
              orgId,
            },
          },
        },
        select: {
          responses: true,
          language: true,
          platform: true,
          createdAt: true,
          tag: true,
          deviceData: true,
          location: true,
          surveyTeamMap: {
            select: {
              survey: {
                select: {
                  title: true,
                },
              },
              team: {
                select: {
                  name: true,
                },
              },
            },
          },
          contactId: true,
        },
        ...(page !== undefined
          ? {
              skip: page * 20,
              take: 20,
            }
          : {}),
        orderBy: {
          createdAt: "desc",
        },
      });
      data = responses.map((r) => {
        const { surveyTeamMap, ...rest } = r;
        return {
          ...rest,
          survey: surveyTeamMap.survey.title,
          team: surveyTeamMap.team.name,
        };
      });
      break;
    case ZapierTriggers.TICKET_ASSIGNEE_UPDATED:
      const ticketAssigne = await prisma.ticketCard.findMany({
        where: {
          ticketColumn: {
            ticketBoard: {
              teams: {
                some: {
                  team: {
                    orgId,
                  },
                },
              },
            },
          },
        },
        select: {
          ticketId: true,
          title: true,
          description: true,
          type: true,
          ticketColumn: {
            select: {
              title: true,
            },
          },
          deadline: true,
          priority: true,
          assignees: {
            select: {
              assignee: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        ...(page !== undefined
          ? {
              skip: page * 20,
              take: 20,
            }
          : {}),
        orderBy: {
          createdAt: "desc",
        },
      });
      data = ticketAssigne.map((t) => {
        const { ticketColumn, assignees, ...rest } = t;
        return {
          ...rest,
          ticketColumnName: ticketColumn.title,
          assignees: assignees.map((a) => a.assignee),
        };
      });
      break;
    case ZapierTriggers.TICKET_CARD_MOVED:
    case ZapierTriggers.TICKET_CREATED:
      const tickerCards = await prisma.ticketCard.findMany({
        where: {
          ticketColumn: {
            ticketBoard: {
              teams: {
                some: {
                  team: {
                    orgId,
                  },
                },
              },
            },
          },
        },
        select: {
          ticketId: true,
          title: true,
          description: true,
          type: true,
          ticketColumn: {
            select: {
              title: true,
            },
          },
          deadline: true,
          priority: true,
        },
        ...(page !== undefined
          ? {
              skip: page * 20,
              take: 20,
            }
          : {}),
        orderBy: {
          createdAt: "desc",
        },
      });
      data = tickerCards.map((t) => {
        const { ticketColumn, ...rest } = t;
        return {
          ...rest,
          ticketColumnName: ticketColumn.title,
        };
      });
      break;
  }
  return data;
}

// `data` genuinely varies by trigger (contact rows, message rows, ticket
// rows, ...) — this just forwards it into the BullMQ job payload, it's never
// inspected here, so `unknown` is accurate rather than a cop-out.
export async function addZapierTriggerToQueue(name: ZapierTriggers, data: unknown, orgId: string) {
  await zapierTriggerQueue.add(name, { data, orgId });
}

export async function deleteContactByPhoneNumberAndOrgId(orgId: string, phone: string) {
  const contact = await prisma.contact.delete({
    where: {
      contact_phone_org_id_unique: {
        orgId,
        phone,
      },
    },
  });
  await addZapierTriggerToQueue(
    ZapierTriggers.CONTACT_DELETED,
    { [ZapierTriggers.CONTACT_DELETED]: contact },
    contact.orgId,
  );
  return contact;
}

export async function getTicketBoardsByTeamId(teamId: string, page?: number) {
  const boards = await prisma.ticketBoard.findMany({
    where: {
      teams: {
        some: {
          teamId,
        },
      },
    },
    select: {
      id: true,
      title: true,
    },
    ...(page !== undefined
      ? {
          skip: page * 25,
          take: 25,
        }
      : {}),
  });
  return boards.map((b) => ({ id: b.id, name: b.title }));
}

export async function getTicketColumnsByBoardId(boardId: string, page?: number) {
  const columns = await prisma.ticketColumn.findMany({
    where: {
      ticketBoardId: boardId,
    },
    select: {
      id: true,
      title: true,
    },
    ...(page !== undefined
      ? {
          skip: page * 20,
          take: 20,
        }
      : {}),
  });
  return columns.map((c) => ({ id: c.id, name: c.title }));
}

export async function getLifecyclesByOrgId(orgId: string) {
  return await prisma.lifecycle.findMany({
    where: {
      orgId,
    },
    select: {
      id: true,
      name: true,
    },
  });
}

export async function getContactsByPhoneNumberAndOrgId(phone: string, orgId: string) {
  return await prisma.contact.findMany({
    where: {
      phone: {
        contains: phone,
      },
      orgId,
    },
  });
}

export async function getUserIdByEmailAndOrgId(email: string, orgId: string) {
  return await prisma.orgMember.findFirst({
    where: {
      user: {
        email,
      },
      orgId,
    },
    select: {
      userId: true,
    },
  });
}
