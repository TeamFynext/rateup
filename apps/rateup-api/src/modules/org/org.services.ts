import prisma from "../../utils/prisma";
import {
  CreateOrgInput,
  IdParamInput,
  UpdateLogoInput,
  UpdateOrgDetailsInput,
} from "./org.schema";
import { FastifyReply, FastifyRequest } from "fastify";
import Session from "supertokens-node/recipe/session";

export async function createOrg(input: CreateOrgInput) {
  const org = await prisma.org.create({
    //data: input,
    data: {
      name: input.name,
      ownerId: input.owner,
    },
  });
  return org;
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
        (orgMember) => orgMember.orgId === orgId
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
  reply: FastifyReply
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
  reply: FastifyReply
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
  { address, phone, name }: UpdateOrgDetailsInput,
  request: FastifyRequest,
  reply: FastifyReply
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