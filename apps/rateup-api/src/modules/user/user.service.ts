import {
  CreateUserParams,
  CreateUserSignupSchema,
  PauseUserInput,
  UpdateProfilePhotoSchema,
  updateUserLanguageSchema,
  UpdateProfileSchema,
  userInfoParams,
} from "./user.schema";
import { FastifyReply, FastifyRequest } from "fastify";
import Session from "supertokens-node/recipe/session";
import { Role } from "../../utils/enums";
import supertokens from "supertokens-node";
import { log } from "../../utils/logger";
import { createFreePlanSubscription } from "../subscription/subscription.service";
import PasswordLess from "supertokens-node/recipe/passwordless";
import { cloneSurvey } from "../survey/survey.service";
import { cloneMenu } from "../menu/menu.service";
import { defaultTheme } from "../surveyTheme/defaultTheme";
import {
  deleteSuperTokenUserForId,
  getUserInfo,
} from "../../utils/supertoken/supertoken";
import { UserRecipes } from "../../types/enums";
import dayjs from "dayjs";
import {
  createHubSpotCompany,
  createHubSpotContact,
} from "../../utils/hubspot";
import prisma from "../../utils/prisma";

async function createUser({
  id,
  email,
  recipeName,
  prefLanguage,
}: CreateUserParams) {
  const user = await prisma.user.create({
    data: {
      id,
      email,
      recipeName,
      prefLanguage,
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
  phoneNumber,
  recipeName,
  prefLanguage,
  planId,
}: CreateUserSignupSchema) {
  log.info("Creating user....");
  try {
    // Start a transaction
    let team, teamMember, newUser, org;
    const result = await prisma.$transaction(async (prisma) => {
      newUser = await prisma.user.create({
        data: {
          id,
          email,
          name,
          phone,
          recipeName,
          prefLanguage,
        },
      });

      org = await prisma.org.create({
        data: {
          name: orgName,
          ownerId: newUser.id,
          phone: phoneNumber,
          surveyThemes: {
            create: {
              name: "Default Theme",
              theme: defaultTheme,
            },
          },
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
      // creating free plan subscription
      await createFreePlanSubscription(org.id, prisma as any, planId);
    });

    if (team.id && teamMember.userId) {
      //create an initial default survey
      let teamIds = [team.id];
      let surveyId = process.env.INITIAL_SAMPLE_SURVEY_ID;
      let menuId = process.env.INITIAL_SAMPLE_MENU_ID;
      let cloneNewSurvey;

      try {
        if (surveyId) {
          cloneNewSurvey = await cloneSurvey(
            surveyId,
            teamMember.userId,
            teamIds,
            true,
          );
        } else {
          log.error("Initial Survey creation failed...surveyId...missing");
        }
        //create an initial default menu
        if (
          menuId &&
          typeof cloneNewSurvey === "object" &&
          cloneNewSurvey?.teams &&
          cloneNewSurvey?.teams?.length > 0
        ) {
          menuId &&
            cloneNewSurvey.teams[0].id &&
            (await cloneMenu(menuId, team.id, cloneNewSurvey.teams[0].id));
        } else {
          log.error("Initial Menu creation failed..." + cloneNewSurvey);
        }
      } catch (e) {
        log.error("Initial Survey/Menu Creations failed..." + e);
      }
    }

    // Commit the transaction
    log.trace(" create user transaction committed..........:", result);
    const companyId = await createHubSpotCompany({
      name: orgName,
      joined_date: org.createdAt,
      owner_email: email,
    });
    await createHubSpotContact(
      {
        firstname: name,
        email,
        phone: phone ?? undefined,
        company: orgName,
        joined_date: newUser.createdAt,
      },
      companyId,
    );
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
  //let userInfo = await ThirdPartyEmailPassword.getUserById(userId);
  let userInfo = await supertokens.getUser(userId);

  // if (!role) {
  const user = await getOrgIdAndRole({ id: userId });
  role = user?.role;
  orgId = user?.orgId;

  await session!.mergeIntoAccessTokenPayload({ orgId: orgId, role: role });
  // }

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
      isPaused: true,
      pausedBy: true,
      prefLanguage: true,
    },
  });

  // STT

  if (email && !profile) {
    if (userInfo?.thirdParty && userInfo?.thirdParty[0]?.id) {
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
      isPaused: true,
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
    isPaused: profile?.isPaused,
    pausedBy: profile?.pausedBy,
    isOrgPaused: orgData?.isPaused,
    prefLanguage: profile?.prefLanguage,
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
  //let passwordlessLogin = await PasswordLess.getUserById({ userId });
  //STT  update above code

  let passwordlessLogin = null;

  //userInfo = await supertokens.getUser(userId)

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

export async function updateUserPrefLanguage(
  { prefLanguage }: updateUserLanguageSchema,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  let session = await Session.getSession(request, reply);
  let userId = session.getUserId();

  const result = await prisma.user.update({
    where: { id: userId },
    data: {
      prefLanguage,
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
//email id also invalidated & removed from supertoken

export async function updateUserActiveStatus(userId: string) {
  const userData = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      email: true,
    },
  });

  const formattedDate = dayjs().format("ms");
  const deletedUserEmail = "deleted" + formattedDate + "#" + userData?.email;

  console.log("Soft Deleted User: ", deletedUserEmail);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      email: deletedUserEmail,
      active: false,
      deletedAt: new Date(),
    },
  });

  if (user.id) {
    await deleteSuperTokenUserForId(user.id); // REMOVE FROM SUPERTOKEN
  }

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

export async function getAllUsers() {
  const users = await prisma.user.findMany({
    include: {
      teamMember: {
        select: {
          teamId: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const usersData = await Promise.all(
    users.map(async (user) => {
      const orgRole = await getOrgIdAndRole({ id: user?.id });
      let orgData = await prisma.org.findUnique({
        where: { id: orgRole.orgId },
        select: {
          logo: true,
          name: true,
          address: true,
          phone: true,
          isPaused: true,
        },
      });
      return {
        userId: user?.id,
        userName: user?.name,
        role: orgRole.role,
        email: user.email,
        phone: user.phone,
        profilePhoto: user?.profilePhoto,
        orgId: orgRole.orgId,
        orgName: orgData?.name,
        orgLogo: orgData?.logo,
        orgPhone: orgData?.phone,
        orgAddress: orgData?.address,
        teams: user?.teamMember?.map((team) => team.teamId),
        recipeName: user?.recipeName,
        active: user?.active,
        createdAt: user?.createdAt,
        isPaused: user?.isPaused,
        pausedBy: user?.pausedBy,
        isOrgPaused: orgData?.isPaused,
      };
    }),
  );

  return usersData;
}

export async function updateUserRecipe() {
  const users = await getAllUsers();
  for (const user of users) {
    const userInfo = await getUserInfo(user.email);
    if (userInfo.length) {
      const recipeId = userInfo[0].loginMethods[0].recipeId;
      const recipeName = getUserRecipeName(recipeId);
      await prisma.user.update({
        where: {
          email: user.email,
        },
        data: {
          recipeName,
        },
      });
    }
  }
}

export async function pauseUser(id, data: PauseUserInput) {
  return await prisma.user.update({
    where: {
      id,
    },
    data,
  });
}

export function getUserRecipeName(recipeId) {
  switch (recipeId) {
    case "thirdparty":
      return UserRecipes.ThirdPartyGoogle;
    case "emailpassword":
      return UserRecipes.EmailPassword;
    case "passwordless":
      return UserRecipes.PasswordLess;
  }
}

export async function updateLastLoggedInTime(userId, date) {
  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      lastLoggedInAt: date,
    },
  });
}
