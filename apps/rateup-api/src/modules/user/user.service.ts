import { PrismaClient } from "@prisma/client";
import { CreateUserParams, CreateUserSignupSchema, userInfoParams } from "./user.schema";
import { FastifyReply, FastifyRequest } from "fastify";
import Session from "supertokens-node/recipe/session";
import { Role } from "../../utils/enums";

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

export async function createUserSignup({ id, email, name, orgName }: CreateUserSignupSchema) {

  try {
    // Start a transaction
    const result = await prisma.$transaction(async (prisma) => {

      const newUser = await prisma.user.create({
        data: {
          id,
          email,
          name
        },
      });

      const org = await prisma.org.create({
        data: {
          name: orgName,
          ownerId: newUser.id
        },
      });

      let orgMember = await prisma.orgMember.create({
        data: {
          orgId: org.id,
          userId: newUser.id,
          role: Role.SUPER_ADMIN,
        },
      });

      const team = await prisma.team.create({
        data: {
          name: "Default Team",
          code:"D1",
          orgId: org.id,
        }
      });

      const teamMember = await prisma.teamMember.create({
        data: {
          teamId: team.id, // Use the teamId from the first action's result
          userId: newUser.id,
        }
      });
    });
    // Commit the transaction
    console.log("Transaction committed..........:", result);
    return result;
  } catch (error) {
    // Rollback the transaction
    console.error("Transaction rolled back.......:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export async function getLoggedUserInfo(  request: FastifyRequest,
  reply: FastifyReply) {
    let session = await Session.getSession(request, reply);

    const accessTokenPayload = session.getAccessTokenPayload();
    let role = accessTokenPayload.role;
    let email = accessTokenPayload.email;
    let orgId = accessTokenPayload.orgId;

    if (session === undefined) {
        throw Error("No session available")
    }
    let userId = session.getUserId();

    if(!role){
      const user = await getOrgIdAndRole({ id: userId });
      role = user?.role
      orgId = user?.orgId

      await session!.mergeIntoAccessTokenPayload(
        { orgId: orgId, role: role }
      );
    }

  return {userId, role, email, orgId}
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
