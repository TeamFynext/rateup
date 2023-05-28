import { PrismaClient } from "@prisma/client";
import { CreateUserParams, userInfoParams } from "./user.schema";
import { FastifyReply, FastifyRequest } from "fastify";
import Session from "supertokens-node/recipe/session";

const prisma = new PrismaClient();

async function createUser({ id, email }: CreateUserParams) {
  const user = await prisma.user.create({
    data: {
      id,
      email,
    },
  });
  return user;
}

export async function getLoggedUserInfo(  request: FastifyRequest,
  reply: FastifyReply) {
    let session = await Session.getSession(request, reply);

    const accessTokenPayload = session.getAccessTokenPayload();
    const role = accessTokenPayload.role;
    const email = accessTokenPayload.email;

    if (session === undefined) {
        throw Error("No session available")
    }
    let userId = session.getUserId();

  return {userId, role, email}
}


async function getOrgIdAndRole({ id }: userInfoParams) {
  let orgMember = await prisma.orgMember.findFirst({
    where: { userId: id },
    select: {
      orgId: true,
      role: true,
    },
  });
  return orgMember;
}


export { createUser, getOrgIdAndRole };
