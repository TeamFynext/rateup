import { PrismaClient } from "@prisma/client";
import {
  CreateUserParams,
  CreateUserSignupSchema,
  UpdateProfilePhotoSchema,
  UpdateProfileSchema,
  userInfoParams,
} from "./user.schema";
import { FastifyReply, FastifyRequest } from "fastify";
import Session from "supertokens-node/recipe/session";
import { Role } from "../../utils/enums";
import supertokens from "supertokens-node";
import { log } from "../../utils/logger";
import { createTrialSubscription } from "../subscription/subscription.service";
import PasswordLess from "supertokens-node/recipe/passwordless";
import ThirdPartyEmailPassword from "supertokens-node/recipe/thirdpartyemailpassword";
import { cloneSurvey } from "../survey/survey.service";
import { cloneMenu } from "../menu/menu.service";

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

export async function createUserSignup({
  id,
  email,
  name,
  orgName,
  phone,
}: CreateUserSignupSchema) {
  log.info("Creating user");
  try {
    // Start a transaction
    let team, teamMember;
    const result = await prisma.$transaction(async (prisma) => {
      const newUser = await prisma.user.create({
        data: {
          id,
          email,
          name,
          phone,
        },
      });

      const org = await prisma.org.create({
        data: {
          name: orgName,
          ownerId: newUser.id,
        },
      });

      let orgMember = await prisma.orgMember.create({
        data: {
          orgId: org.id,
          userId: newUser.id,
          role: Role.SUPER_ADMIN,
        },
      });

      team = await prisma.team.create({
        data: {
          name: "Main",
          code: "MAIN",
          orgId: org.id,
        },
      });

      teamMember = await prisma.teamMember.create({
        data: {
          teamId: team.id, // Use the teamId from the first action's result
          userId: newUser.id,
        },
      });
      // creating 1 week trial subscription
      await createTrialSubscription(org.id, prisma as any);
    });

    if (team.id && teamMember.userId) {
      //create an initial default survey
      let teamIds = [team.id];
      let surveyId = process.env.INITIAL_SAMPLE_SURVEY_ID;
      let clone;
      surveyId &&
        (clone = await cloneSurvey(surveyId, teamMember.userId, teamIds, true));

      //create an initial default menu
      let menuId = process.env.INITIAL_SAMPLE_MENU_ID;
      menuId &&
        clone.teams[0].id &&
        (await cloneMenu(menuId, team.id, clone.teams[0].id));
    }

    // Commit the transaction
    log.trace(" create user transaction committed..........:", result);
    return result;
  } catch (error) {
    // Rollback the transaction
    log.error("create user transaction failed %o", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export async function getLoggedUserInfo(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  let session = await Session.getSession(request, reply);

  const accessTokenPayload = session.getAccessTokenPayload();

  let role = accessTokenPayload.role;
  let email = accessTokenPayload.email;
  let orgId = accessTokenPayload.orgId;

  if (session === undefined) {
    throw Error("No session available");
  }
  let userId = session.getUserId();
  let userInfo = await ThirdPartyEmailPassword.getUserById(userId);

  if (!role) {
    const user = await getOrgIdAndRole({ id: userId });
    role = user?.role;
    orgId = user?.orgId;

    await session!.mergeIntoAccessTokenPayload({ orgId: orgId, role: role });
  }

  let profile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      profilePhoto: true,
      teamMember: {
        select: {
          teamId: true,
        },
      },
    },
  });

  if (email && !profile) {
    if (userInfo?.thirdParty?.id) {
      throw Error("Google User missing in Rateup");
    } else {
      throw Error("User missing in Rateup");
    }
  }

  if (!profile && !email) {
    throw Error("User not found in Rateup");
  }

  let orgData = await prisma.org.findUnique({
    where: { id: orgId },
    select: {
      logo: true,
      name: true,
      address: true,
      phone: true,
      encryptionKeys: true,
    },
  });
  return {
    userId,
    userName: profile?.name,
    role,
    email,
    profilePhoto: profile?.profilePhoto,
    orgId,
    orgName: orgData?.name,
    orgLogo: orgData?.logo,
    orgPhone: orgData?.phone,
    orgAddress: orgData?.address,
    teams: profile?.teamMember?.map((team) => team.teamId),
    encryptionKeys: orgData?.encryptionKeys ?? undefined,
  };
}

export async function getLoggedUserProfile(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  let session = await Session.getSession(request, reply);

  const accessTokenPayload = session.getAccessTokenPayload();
  let role = accessTokenPayload.role;
  //let orgId = accessTokenPayload.orgId;

  if (session === undefined) {
    throw Error("No session available");
  }
  let userId = session.getUserId();

  let profile = await prisma.user.findUnique({
    where: { id: userId },
  });
  let passwordlessLogin = await PasswordLess.getUserById({ userId });
  let userProfileData = {
    role,
    ...profile,
    passwordlessLogin: !!passwordlessLogin,
  };

  return userProfileData;
}

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export async function updateUserProfile(
  { title, name, phone }: UpdateProfileSchema,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  let session = await Session.getSession(request, reply);
  let userId = session.getUserId();

  const result = await prisma.user.update({
    where: { id: userId },
    data: {
      gender: title as Gender,
      name,
      phone,
    },
  });

  return result;
}

export async function updateUserProfilePhoto(
  { profilePhoto }: UpdateProfilePhotoSchema,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  let session = await Session.getSession(request, reply);
  let userId = session.getUserId();

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      profilePhoto,
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

export async function getUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email },
  });
  return user;
}

export { createUser, getOrgIdAndRole };

//this service is for updating the account-active status of user. Currently used for soft deleting the user.
export async function updateUserActiveStatus(userId: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      active: false,
    },
  });
  return user;
}

export async function checkEmailExist(email: string) {
  const user = await prisma.user.findFirst({
    where: {
      email,
    },
  });
  return user;
}

export async function deleteUser(userId: string) {
  // TODO: if cascading is safe, then use it
  try {
    await prisma.teamMember.deleteMany({
      where: { userId: userId },
    });
    await prisma.orgMember.deleteMany({
      where: { userId: userId },
    });
    const orgs = await prisma.org.findMany({
      where: { ownerId: userId },
    });
    await prisma.team.deleteMany({
      where: { orgId: { in: orgs.map((org) => org.id) } },
    });
    await prisma.org.deleteMany({
      where: { ownerId: userId },
    });
    await prisma.user.delete({
      where: { id: userId },
    });
  } catch (error) {
    log.error("delete user transaction failed in db %o", error);
  }
  await supertokens.deleteUser(userId);
}
