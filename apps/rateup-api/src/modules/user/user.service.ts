import {
  CreateUserParams,
  CreateUserSignupSchema,
  PauseUserInput,
  UpdateProfilePhotoSchema,
  updateUserLanguageSchema,
  UpdateProfileSchema,
  userInfoParams,
  UserAvailabilityStatus,
} from "./user.schema.js";
import { FastifyReply, FastifyRequest } from "fastify";
import Session from "supertokens-node/recipe/session/index.js";
import { Role } from "../../utils/enums/index.js";
import supertokens from "supertokens-node";
import { log } from "../../utils/logger.js";
import { createFreePlanSubscription } from "../subscription/subscription.service.js";
import { cloneSurvey } from "../survey/survey.service.js";

import { defaultTheme } from "../surveyTheme/defaultTheme.js";
import { updateReferral } from "../referrals/referrals.service.js";
import { deleteSuperTokenUserForId, getUserInfo } from "../../utils/supertoken/supertoken.js";
import { UserRecipes } from "../../types/enums.js";
import dayjs from "dayjs";
import { createHubSpotCompany, createHubSpotContact } from "../../utils/hubspot.js";
import prisma from "../../utils/prisma.js";
import { UserPresenceMode } from "../../../generated/prisma/enums.js";
import { Org, Team, TeamMember, User } from "../../../generated/prisma/client.js";

async function createUser({ id, email, recipeName, prefLanguage }: CreateUserParams) {
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
  location,
  website,
  industry,
  goals,
  integrationsSelected,
  teamSize,
  referralCode,
}: CreateUserSignupSchema) {
  log.info("Creating user....");
  try {
    // Start a transaction
    let team: Team | undefined;
    let teamMember: TeamMember | undefined;
    let newUser: User | undefined;
    let org: Org | undefined;
    const result = await prisma.$transaction(async (prisma) => {
      newUser = await prisma.user.create({
        data: {
          id,
          email,
          name,
          phone: phoneNumber,
          recipeName,
          prefLanguage,
        },
      });

      org = await prisma.org.create({
        data: {
          name: orgName,
          ownerId: newUser.id,
          phone: phoneNumber,
          onboarding: {
            industry: industry || null,
            location: location || null,
            website: website || null,
            goals: goals?.length ? goals : null,
            integrationsSelected: integrationsSelected?.length ? integrationsSelected : null,
            teamSize: teamSize || null,
          },
          surveyThemes: {
            create: {
              name: "Default Theme",
              theme: defaultTheme,
            },
          },
        },
      });

      await prisma.orgMember.create({
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
      // Create the free-plan subscription. (Loyalty is no longer a subscription
      // feature, so signup no longer injects any loyalty-based feature overrides.)
      await createFreePlanSubscription(org.id, prisma, planId);
    });

    if (!newUser || !org || !team || !teamMember) {
      throw new Error("User signup transaction did not complete as expected");
    }

    if (team.id && teamMember.userId) {
      //create an initial default survey
      let teamIds = [team.id];
      let surveyId = process.env.INITIAL_SAMPLE_SURVEY_ID;
      try {
        if (surveyId) {
          await cloneSurvey(surveyId, teamMember.userId, teamIds, true);
        } else {
          log.error("Initial Survey creation failed...surveyId...missing");
        }
      } catch (e) {
        log.error("Initial Survey creation failed..." + e);
      }
    }

    // Commit the transaction
    log.trace({
      message: "create user transaction committed..........:",
      result,
    });

    if (referralCode) {
      try {
        await updateReferral(referralCode, "signup");
      } catch (err) {
        log.error({ err }, "Failed to increment referral signup_count");
      }
    }

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
    log.error({ err: error }, "create user transaction failed");
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export async function getLoggedUserInfo(request: FastifyRequest, reply: FastifyReply) {
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
      presenceMode: true,
      orgMember: {
        where: {
          orgId,
        },
        select: {
          status: true,
        },
      },
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
      onboardingCompleted: true,
      onboarding: true,
      waAssignedChatPermission: true,
      WhatsappSettings: {
        select: {
          appId: true,
          status: true,
        },
      },
      showLifecycle: true,
      isConversionApiActive: true,
      onboardingChecklistCompleted: true,
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
    waAssignedChatPermission: orgData?.waAssignedChatPermission,
    status: profile?.orgMember?.[0]?.status,
    hasWhatsAppSettings:
      !!orgData?.WhatsappSettings?.[0]?.appId &&
      orgData?.WhatsappSettings?.[0]?.status !== "DISCONNECTED",
    onboardingCompleted: orgData?.onboardingCompleted,
    onboarding: orgData?.onboarding,
    presenceMode: profile?.presenceMode,
    showLifecycle: orgData?.showLifecycle,
    isConversionApiActive: orgData?.isConversionApiActive,
    onboardingChecklistCompleted: orgData?.onboardingChecklistCompleted,
  };
}

export async function getLoggedUserProfile(request: FastifyRequest, reply: FastifyReply) {
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
    include: {
      orgMember: {
        where: {
          orgId: accessTokenPayload.orgId,
        },
        select: {
          status: true,
        },
      },
    },
  });
  //let passwordlessLogin = await PasswordLess.getUserById({ userId });
  //STT  update above code

  if (!profile) {
    throw Error("User not found in Rateup");
  }

  let passwordlessLogin = null;

  //userInfo = await supertokens.getUser(userId)
  const { orgMember, ...rest } = profile;

  let userProfileData = {
    role,
    ...rest,
    status: orgMember[0]?.status,
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
export async function updateUserProfileById({
  title,
  name,
  phone,
  userId,
}: UpdateProfileSchema & { userId: string }) {
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

// Called at login, where there is no org in context — picking one IS the job. The
// ordering makes that pick deterministic: a user who belongs to several orgs always
// lands in their oldest membership rather than whichever row the DB happened to return
// first, which is what previously made their session org effectively arbitrary.
// Choosing between several orgs deliberately would need an org switcher.
async function getOrgIdAndRole({ id }: userInfoParams) {
  let orgMember = await prisma.orgMember.findFirst({
    where: { userId: id },
    orderBy: { createdAt: "asc" },
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

/**
 * Whether an email is already taken, checked against BOTH stores.
 *
 * The signup wizard gates step one on this, but the rejection at "Finish setup"
 * comes from SuperTokens (`config.ts`, the EmailPassword `signUp` override), whose
 * user store can hold an email the local `User` table does not: a signup that
 * created the SuperTokens user but never reached `createUserSignup`, a row deleted
 * from Prisma alone, or an account that only exists via Google/Apple/passwordless.
 * Checking only Prisma let those through step one and failed three steps later, on
 * a screen with no email field to correct. Both stores are asked here so the gate
 * and the rejection can never disagree.
 *
 * SuperTokens stores emails lower-cased, and local rows are seeded from what it
 * returns, so the address is normalised before either lookup.
 */
export async function checkEmailExist(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
    },
  });

  if (user) {
    return true;
  }

  const superTokensUsers = await getUserInfo(normalizedEmail);
  return superTokensUsers.length > 0;
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
    log.error({ err: error }, "delete user transaction failed in db");
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
      let orgData = orgRole
        ? await prisma.org.findUnique({
            where: { id: orgRole.orgId },
            select: {
              logo: true,
              name: true,
              address: true,
              phone: true,
              isPaused: true,
            },
          })
        : null;
      return {
        userId: user?.id,
        userName: user?.name,
        role: orgRole?.role,
        email: user.email,
        phone: user.phone,
        profilePhoto: user?.profilePhoto,
        orgId: orgRole?.orgId,
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
      const loginMethod = userInfo[0].loginMethods[0];
      const recipeName = getUserRecipeName(loginMethod.recipeId, loginMethod.thirdParty?.id);
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

export async function pauseUser(id: string, data: PauseUserInput) {
  return await prisma.user.update({
    where: {
      id,
    },
    data,
  });
}

/**
 * Maps a SuperTokens recipe to the stored UserRecipes value.
 *
 * `thirdPartyId` is the provider on the login method ("google" / "apple", as configured
 * in config.ts). Without it every third-party sign-in was recorded as Google, so an
 * Apple user's stored recipe depended on which code path created them —
 * createAppleUserHandler sets ThirdPartyApple explicitly, this did not.
 */
export function getUserRecipeName(
  recipeId: string,
  thirdPartyId?: string,
): UserRecipes | undefined {
  switch (recipeId) {
    case "thirdparty":
      switch (thirdPartyId) {
        case "apple":
          return UserRecipes.ThirdPartyApple;
        case "google":
          return UserRecipes.ThirdPartyGoogle;
        default:
          // An unrecognised (or absent) provider is not silently called Google.
          return undefined;
      }
    case "emailpassword":
      return UserRecipes.EmailPassword;
    case "passwordless":
      return UserRecipes.PasswordLess;
  }
}

export async function updateLastLoggedInTime(userId: string, date: Date | string | null) {
  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      lastLoggedInAt: date,
    },
  });
}

export async function getUserIdsByTeamId(teamId: string) {
  const teamMembers = await prisma.teamMember.findMany({
    where: {
      teamId,
    },
    select: {
      userId: true,
    },
  });
  return teamMembers.map((member) => member.userId);
}

export async function updateUserAvailablityStatus(
  userId: string,
  orgId: string,
  status: UserAvailabilityStatus,
  presenceMode?: UserPresenceMode,
) {
  if (presenceMode) {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        presenceMode,
      },
    });
  }

  await prisma.orgMember.update({
    where: {
      userId_orgId: {
        userId,
        orgId,
      },
    },
    data: {
      status,
    },
  });
}

export async function auditLog(
  orgId: string,
  page: number = 1,
  limit: number = 25,
  sortBy?: string,
  sortOrder?: "asc" | "desc",
) {
  const skip = (page - 1) * limit;
  let orderBy = {};

  if (sortBy === "user") {
    orderBy = {
      user: {
        name: sortOrder ?? "desc",
      },
    };
  } else {
    orderBy = {
      [sortBy ?? "createdAt"]: sortOrder ?? "desc",
    };
  }

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where: {
        orgId,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.auditLog.count({
      where: {
        orgId,
      },
    }),
  ]);

  return {
    data: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  };
}
