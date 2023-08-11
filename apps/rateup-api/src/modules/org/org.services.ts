import prisma from "../../utils/prisma";
import { CreateOrgInput, IdParamInput } from "./org.schema";
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
      const orgMember = member.user.orgMember.find((orgMember) => orgMember.orgId === orgId);
      return {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        role: orgMember ? orgMember.role : undefined,
      };
    }),
  }));
};

export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export async function updateOrgUserRole({ role }: { role: string }, params: IdParamInput, request: FastifyRequest, reply: FastifyReply) {
  let session = await Session.getSession(request, reply);
  const accessTokenPayload = session.getAccessTokenPayload();
  const orgId = accessTokenPayload.orgId;

  // Check if the member exists
  const existingMember = await prisma.orgMember.findUnique({
    where: { 
      userId_orgId: {
        userId: params.id,
        orgId: orgId
      }
    }
  });

  // If the member does not exist, return error message
  if (!existingMember) {
    return 'User is not a member of this organization';
  }

  // If the member exists, proceed with updating the role
  const member = await prisma.orgMember.update({
    where: { 
      userId_orgId: {
        userId: params.id,
        orgId: orgId
      }
    },
    data: {
      role: role as Role
    },
  });

  return member;
}
