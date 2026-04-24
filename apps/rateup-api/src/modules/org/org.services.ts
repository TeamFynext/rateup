import prisma from "../../utils/prisma.js";
import {
  CreateOrgInput,
  IdParamInput,
  PauseOrgInput,
  UpdateLogoInput,
  UpdateOrgDetailsInput,
} from "./org.schema.js";
import { FastifyReply, FastifyRequest } from "fastify";
import Session from "supertokens-node/recipe/session/index.js";
import { defaultTheme } from "../surveyTheme/defaultTheme.js";
import { deleteSuperTokenUserForId } from "../../utils/supertoken/supertoken.js";
import { seedDefaultStages } from "../update/update.controller.js";
import { notificationQueue } from "../../utils/redisConnection.js";
import {
  createInactivityWarningTemplate,
  createOrgDeletionReminderTemplate,
} from "../../utils/email/OrgDeletionWarningEmail.js";

export async function createOrg(input: CreateOrgInput) {
  const org = await prisma.org.create({
    data: {
      name: input.name,
      ownerId: input.owner,
      surveyThemes: {
        create: {
          name: "Default Theme",
          theme: defaultTheme,
        },
      },
    },
  });
  await seedDefaultStages(org.id);
  return org;
}

export async function getOrgById(orgId: string) {
  return await prisma.org.findUnique({
    where: {
      id: orgId,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}
export async function getTeamsMembers(orgId: string) {
  const teams = await prisma.team.findMany({
    where: { orgId: orgId },
    include: {
      members: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              orgMember: true,
            },
          },
        },
      },
    },
  });

  return teams.map((t) => ({
    team_id: t.id,
    team_name: t.name,
    team_code: t.code,
    members: t.members.map((member) => {
      const orgMember = member.user.orgMember.find(
        (orgMember) => orgMember.orgId === orgId,
      );
      return {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        role: orgMember ? orgMember.role : undefined,
      };
    }),
  }));
}
export async function getAllMembersWithTeams(orgId: string) {
  const members = await prisma.orgMember.findMany({
    where: { orgId: orgId, user: { active: true } },
    select: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          teamMember: {
            include: {
              team: true,
            },
          },
          isPaused: true,
        },
      },
      status: true,
      role: true,
    },
  });
  return members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    teams: m.user.teamMember.map((tm) => ({
      team_id: tm.team.id,
      team_name: tm.team.name,
      team_code: tm.team.code,
    })),
    isPaused: m.user.isPaused,
    status: m.status,
  }));
}

export async function getAllMembersWithTeamsAndInvitation(orgId: string) {
  // Fetch active org members
  const members = await prisma.orgMember.findMany({
    where: { orgId, user: { active: true } },
    select: {
      user: {
        select: {
          id: true,
          profilePhoto: true,
          email: true,
          name: true,
          phone: true,
          gender: true,
          teamMember: {
            include: {
              team: true,
            },
          },
          isPaused: true,
        },
      },
      status: true,
      role: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Transform into cleaner structure
  const formattedMembers = members
    .map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      profilePhoto: m.user.profilePhoto,
      role: m.role,
      phone: m.user.phone,
      gender: m.user.gender,
      teams: m.user.teamMember.map((tm) => ({
        team_id: tm.team.id,
        team_name: tm.team.name,
        team_code: tm.team.code,
        team_color: tm.team.color,
      })),
      isPaused: m.user.isPaused,
      status: m.status,
    }))
    .sort((a, b) => {
      if (a.status === "online" && b.status !== "online") return -1;
      if (a.status !== "online" && b.status === "online") return 1;
      return 0;
    });

  // Fetch pending invitations for the same org
  const invitations = await prisma.invitation.findMany({
    where: {
      orgId,
      status: "PENDING",
    },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      type: true,
      invitedBy: true,
      team: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  // Transform invitations
  const formattedInvitations = invitations.map((invite) => ({
    id: invite.id,
    email: invite.email,
    name: invite.name,
    status: invite.status,
    type: invite.type,
    invitedBy: invite.invitedBy,
    teams: invite.team
      ? [
          {
            team_id: invite.team.id,
            team_name: invite.team.name,
            team_code: invite.team.code,
          },
        ]
      : [],
  }));

  // Return unified object
  return {
    members: formattedMembers,
    invitations: formattedInvitations,
  };
}

export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export async function updateOrgUserRole(
  { role }: { role: string },
  params: IdParamInput,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  let session = await Session.getSession(request, reply);
  const accessTokenPayload = session.getAccessTokenPayload();
  const orgId = accessTokenPayload.orgId;

  // Check if the member exists
  const existingMember = await prisma.orgMember.findUnique({
    where: {
      userId_orgId: {
        userId: params.id,
        orgId: orgId,
      },
    },
  });

  // If the member does not exist, return error message
  if (!existingMember) {
    return "User is not a member of this organization";
  }

  // If the member exists, proceed with updating the role
  const member = await prisma.orgMember.update({
    where: {
      userId_orgId: {
        userId: params.id,
        orgId: orgId,
      },
    },
    data: {
      role: role as Role,
    },
  });

  return member;
}

export async function updateOrgLogo(
  { logo }: UpdateLogoInput,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  let session = await Session.getSession(request, reply);
  const accessTokenPayload = session.getAccessTokenPayload();

  let orgId = accessTokenPayload.orgId;

  const user = await prisma.org.update({
    where: { id: orgId },
    data: {
      logo,
    },
  });
  return user;
}

export async function updateOrgDetails(
  {
    address,
    phone,
    name,
    industry,
    location,
    website,
    businessmail,
    encryptionKeys,
    waAssignedChatPermission,
    showLifecycle,
    onboardingChecklistCompleted,
    onboardingChecklist,
  }: UpdateOrgDetailsInput,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  let session = await Session.getSession(request, reply);
  const accessTokenPayload = session.getAccessTokenPayload();
  let orgId = accessTokenPayload.orgId;
  const existingOrg = await prisma.org.findUnique({
    where: { id: orgId },
    select: { onboarding: true, onboardingChecklist: true },
  });
  const existingOnboarding =
    (existingOrg?.onboarding as Record<string, any>) ?? {};
  const existingOnboardingChecklist =
    (existingOrg?.onboardingChecklist as Record<string, any>) ?? {};
  const org = await prisma.org.update({
    where: { id: orgId },
    data: {
      address,
      phone,
      name,
      encryptionKeys,
      waAssignedChatPermission,
      onboarding: {
        ...existingOnboarding,
        industry: industry,
        website: website,
        location: location,
        businessmail: businessmail,
      },
      showLifecycle,
      onboardingChecklistCompleted,
      onboardingChecklist: {
        ...existingOnboardingChecklist,
        ...onboardingChecklist,
      },
    },
  });
  return org;
}

export async function getOrgsByOwnerId(userId: string) {
  const orgs = await prisma.org.findMany({
    where: {
      ownerId: userId,
    },
  });
  return orgs;
}

export async function getAllOrgs() {
  return await prisma.org.findMany({
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          teams: true,
          members: true,
          invitations: true,
          templates: true,
        },
      },
      AuditLog: {
        take: 1,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

//Delete org and everything related

export async function deleteOrg(orgId: string): Promise<string> {
  console.log("..........................deleting org............." + orgId);

  try {
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { name: true },
    });

    if (!org) {
      throw new Error(`Organization with ID ${orgId} not found.`);
    }

    const orgName = org.name;

    const members = await prisma.orgMember.findMany({
      where: { orgId: orgId },
      select: {
        userId: true,
      },
    });

    const memberList = members.map((m) => m.userId);
    // Start a transaction
    const result = await prisma.$transaction(async (prisma) => {
      await prisma.order.updateMany({
        where: { orgId: orgId },
        data: {
          orgId: null,
          deletedOrgInfo: orgName,
        },
      });

      await prisma.order.updateMany({
        where: { createdById: { in: memberList } },
        data: { createdById: null },
      });

      // Delete the organization
      await prisma.org.delete({
        where: {
          id: orgId,
        },
      });

      // Delete users (some invited users missing org relation)
      await prisma.user.deleteMany({
        where: {
          id: {
            in: memberList,
          },
        },
      });

      // Return a promise that resolves to null to indicate success within the transaction
      return null;
    });

    // Only proceed to delete super tokens if the transaction was successful
    if (result === null) {
      for (const m of memberList) {
        await deleteSuperTokenUserForId(m);
      }
    }

    return "Success";
  } catch (error) {
    console.error("Error deleting organization:", error);
    return "Error occurred while deleting organization.";
  }
}

export async function getOrgStats(orgId: string) {
  const org = await prisma.org.findUnique({
    where: {
      id: orgId,
    },
    include: {
      teams: true,
      members: true,
      _count: {
        select: {
          teams: true,
          members: true,
          invitations: true,
          templates: true,
        },
      },
    },
  });

  const teamIds = org.teams.map((t) => t.id);

  const teamMemberCount = await prisma.teamMember.count({
    where: {
      team: {
        orgId,
      },
    },
  });

  const teamInvitationsCount = await prisma.invitation.count({
    where: {
      team: {
        orgId,
      },
      type: "TEAM",
    },
  });

  // TODO: add orgid to survey or also count using createdBy since survey.teams maybe empty
  const webSurveyCount = await prisma.survey.count({
    where: {
      teams: {
        some: {
          team: {
            orgId: orgId,
          },
        },
      },
      type: "web",
    },
  });

  const webSurveyResponseCount = await prisma.surveyResponse.count({
    where: {
      surveyTeamMap: {
        survey: {
          teams: {
            some: {
              team: {
                orgId: orgId,
              },
            },
          },
          type: "web",
        },
      },
    },
  });
  const webSurveyVisitedCount = await prisma.surveyStats.count({
    where: {
      surveyTeamMap: {
        survey: {
          teams: {
            some: {
              team: {
                orgId: orgId,
              },
            },
          },
          type: "web",
        },
      },
    },
  });

  const whatsappSurveyCount = await prisma.survey.count({
    where: {
      teams: {
        some: {
          id: {
            in: teamIds,
          },
        },
      },
      type: "whatsapp",
    },
  });
  const whatsappSurveyVisitedCount = await prisma.surveyStats.count({
    where: {
      surveyTeamMap: {
        survey: {
          teams: {
            some: {
              id: {
                in: teamIds,
              },
            },
          },
          type: "whatsapp",
        },
      },
    },
  });

  const whatsappSurveyResponseCount = await prisma.surveyResponse.count({
    where: {
      surveyTeamMap: {
        survey: {
          teams: {
            some: {
              id: {
                in: teamIds,
              },
            },
          },
          type: "whatsapp",
        },
      },
    },
  });

  const reviews = await prisma.review.count({
    where: {
      team: {
        id: {
          in: teamIds,
        },
      },
    },
  });

  const analyzedReviews = await prisma.reviewAnalysis.count({
    where: {
      review: {
        team: {
          id: {
            in: teamIds,
          },
        },
      },
    },
  });

  const campaigns = await prisma.campaign.count({
    where: {
      team: {
        id: {
          in: teamIds,
        },
      },
    },
  });

  const campaignParticipants = await prisma.campaignParticipant.count({
    where: {
      campaign: {
        team: {
          id: {
            in: teamIds,
          },
        },
      },
    },
  });

  const menuCount = await prisma.menu.count({
    where: {
      team: {
        id: {
          in: teamIds,
        },
      },
    },
  });
  const menuBannerCount = await prisma.menuBanner.count({
    where: {
      menu: {
        team: {
          id: {
            in: teamIds,
          },
        },
      },
    },
  });

  const stats = {
    members: org._count.members,
    invitations: org._count.invitations,
    name: org.name,

    teams: {
      total: org._count.teams,
      members: teamMemberCount,
      invitations: teamInvitationsCount,
    },
    whatsapp: {
      surveys: whatsappSurveyCount,
      responses: whatsappSurveyResponseCount,
      templates: org._count.templates,
      visited: whatsappSurveyVisitedCount,
    },
    web: {
      surveys: webSurveyCount,
      responses: webSurveyResponseCount,
      visited: webSurveyVisitedCount,
    },
    rm: {
      reviews,
      analyzedReviews,
    },
    campaigns: {
      campaigns,
      participants: campaignParticipants,
    },
    menu: {
      total: menuCount,
      banners: menuBannerCount,
    },
  };

  return stats;
}

export async function pauseOrg(id, data: PauseOrgInput) {
  return await prisma.org.update({
    where: {
      id,
    },
    data,
  });
}

export async function completeOrgDetails(
  userId: string,
  data: {
    onboarding?: Record<string, any>;
    onboardingCompleted?: boolean;
  },
) {
  return prisma.$transaction(async (tx) => {
    const org = await tx.org.findFirst({
      where: { ownerId: userId },
      select: { id: true, onboarding: true },
    });

    if (!org) {
      throw new Error("Organization not found for this user");
    }
    const existingOnboarding = (org.onboarding as Record<string, any>) || {};

    const mergedOnboarding = {
      ...existingOnboarding,
      ...(data.onboarding || {}),
    };

    const updatedOrg = await tx.org.update({
      where: { id: org.id },
      data: {
        onboarding: mergedOnboarding,
        ...(typeof data.onboardingCompleted === "boolean" && {
          onboardingCompleted: data.onboardingCompleted,
        }),
      },
    });

    return {
      updatedOrg: {
        ...updatedOrg,
        onboarding: updatedOrg.onboarding,
      },
    };
  });
}

export async function getOrgNameAndUserPhone(userId: string) {
  const userWithOrg = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      phone: true,
      name: true,
      org: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!userWithOrg) {
    throw new Error("User not found");
  }

  return {
    userPhone: userWithOrg.phone,
    orgName: userWithOrg.org.length > 0 ? userWithOrg.org[0].name : null,
    nameOfUser: userWithOrg.name,
  };
}

export async function getOnboardingChecklist(orgId) {
  const org = await prisma.org.findUnique({
    where: { id: orgId },
    select: {
      onboardingChecklist: true,
      onboardingChecklistCompleted: true,
    },
  });

  return {
    onboardingChecklist:
      (org?.onboardingChecklist as Record<string, boolean>) ?? {},
    onboardingChecklistCompleted: org?.onboardingChecklistCompleted ?? false,
  };
}

const DAY = 24 * 60 * 60 * 1000;

export async function sendDeletionMailToOrgOwner({
  ownerEmail,
  ownerName,
  orgName,
  orgId,
  delayInDays,
}) {
  try {
    const days = delayInDays || 7;

    const triggeredAt = new Date();

    const deadline = new Date(triggeredAt);
    deadline.setDate(triggeredAt.getDate() + days);

    const html = createInactivityWarningTemplate({
      orgName,
      ownerName,
      deadlineDate: deadline,
    });

    const internalHtml = createOrgDeletionReminderTemplate({
      orgName,
      ownerName,
      triggeredDate: triggeredAt,
      orgId,
    });

    // Send to user immediately
    await notificationQueue.add("notification", {
      emailData: {
        to: ownerEmail,
        subject: `Action Required: ${orgName} scheduled for deletion`,
        html,
        text: `Hi ${ownerName}, your organization "${orgName}" will be deleted if no activity is detected before ${deadline.toDateString()}.`,
      },
    });
    // reminder
    await notificationQueue.add(
      "notification",
      {
        emailData: {
          to: "hello@rateup.app",
          subject: `Org Deletion Reminder: ${orgName}`,
          html: internalHtml,
          text: `Reminder: "${orgName}" was flagged inactive on ${triggeredAt.toDateString()}.`,
        },
      },
      {
        delay: days * DAY,
      },
    );
  } catch (e) {
    console.error("Failed to send deletion email:", e);
    throw e;
  }
}
