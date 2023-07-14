import { PrismaClient } from "@prisma/client";
import { CreateUserParams, CreateUserSignupSchema, UpdateProfilePhotoSchema, UpdateProfileSchema, userInfoParams } from "./user.schema";
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
console.log(".....Creating user.....")
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
          name: "Main",
          code:"MAIN",
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

    let profile = await prisma.user.findUnique({
      where: { id: userId },
      select:{
        profilePhoto: true
      }
    });

  return {userId, role, email, orgId, profilePhoto: profile?.profilePhoto}
}


export async function getLoggedUserProfile(  request: FastifyRequest,
  reply: FastifyReply) {
    let session = await Session.getSession(request, reply);

    const accessTokenPayload = session.getAccessTokenPayload();
    let role = accessTokenPayload.role;
    //let orgId = accessTokenPayload.orgId;

    if (session === undefined) {
        throw Error("No session available")
    }
    let userId = session.getUserId();

    let profile = await prisma.user.findUnique({
      where: { id: userId },
    });

    let userProfileData = {role, ...profile}

   return userProfileData
}

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER"
}

export async function updateUserProfile({ title, name, phone }: UpdateProfileSchema, request: FastifyRequest,
  reply: FastifyReply) {
    let session = await Session.getSession(request, reply);
    let userId = session.getUserId();

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      gender: title as Gender,
      name,
      phone
    },
  });

  return user;
}

export async function updateUserProfilePhoto({ profilePhoto}: UpdateProfilePhotoSchema, request: FastifyRequest,
  reply: FastifyReply) {
    let session = await Session.getSession(request, reply);
    let userId = session.getUserId();

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      profilePhoto
    },
  });

  return user;
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
