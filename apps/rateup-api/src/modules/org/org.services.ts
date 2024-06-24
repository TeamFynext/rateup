import prisma from "../../utils/prisma";
import {
  CreateOrgInput,
  IdParamInput,
  PauseOrgInput,
  UpdateLogoInput,
  UpdateOrgDetailsInput,
} from "./org.schema";
import { FastifyReply, FastifyRequest } from "fastify";
import Session from "supertokens-node/recipe/session";
import { google } from "googleapis";
import { defaultTheme } from "../surveyTheme/defaultTheme";

export async function createOrg(input: CreateOrgInput) {
  const org = await prisma.org.create({
    //data: input,
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
  return org;
}

export async function getOrgById(orgId: string) {
  return await prisma.org.findUnique({
    where: {
      id: orgId,
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
    include: {
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
  }));
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
  { address, phone, name, encryptionKeys }: UpdateOrgDetailsInput,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  let session = await Session.getSession(request, reply);
  const accessTokenPayload = session.getAccessTokenPayload();
  let orgId = accessTokenPayload.orgId;
  console.log(address, phone, name);
  const org = await prisma.org.update({
    where: { id: orgId },
    data: {
      address,
      phone,
      name,
      encryptionKeys,
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
    },
    orderBy: {
      createdAt: "desc",
    },
  });
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

export async function initializeAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    `${process.env.FRONTEND_URL}/auth/oauth2callback`,
  );
  google.options({ auth: oauth2Client });
  return oauth2Client;
}

export async function saveAuthTokens(token, email, orgId) {
  let res = await prisma.googleAccessToken.upsert({
    where: {
      orgId: orgId,
    },
    update: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiryDate: `${token.expiry_date}`,
      scopes: token.scope.split(" "),
      userEmail: email,
    },
    create: {
      orgId: orgId,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiryDate: `${token.expiry_date}`,
      scopes: token.scope.split(" "),
      userEmail: email,
    },
  });
  return res;
}
export async function getAccessToken(orgId) {
  let res = await prisma.googleAccessToken.findUnique({
    where: {
      orgId: orgId,
    },
  });
  return res;
}

export async function deleteGoogleAuthToken(orgId) {
  let res = await prisma.googleAccessToken.delete({
    where: {
      orgId,
    },
  });
  Promise.all([
    await prisma.org.update({
      where: {
        id: orgId,
      },
      data: {
        driveFolderId: null,
      },
    }),
    await prisma.survey.updateMany({
      data: {
        spreadSheetId: null,
      },
    }),
  ]);
  return res;
}

export async function pauseOrg(id, data: PauseOrgInput) {
  return await prisma.org.update({
    where: {
      id,
    },
    data,
  });
}
