import { FastifyReply, FastifyRequest } from "fastify";
import {
  auditLog,
  checkEmailExist,
  createUserSignup,
  getAllUsers,
  getLoggedUserInfo,
  getLoggedUserProfile,
  getUserRecipeName,
  pauseUser,
  updateUserActiveStatus,
  updateUserAvailablityStatus,
  updateUserPrefLanguage,
  updateUserProfile,
  updateUserProfileById,
  updateUserProfilePhoto,
  updateUserRecipe,
} from "./user.service.js";
import {
  ChangeUserPasswordSchema,
  CreateUserGoogleSchema,
  PauseUserInput,
  UpdateProfilePhotoSchema,
  UpdateProfileSchema,
  updateUserLanguageSchema,
  userEmailCheckSchemaInput,
  UserStatusSchema,
} from "./user.schema.js";
import supertokens from "supertokens-node";
import Session from "supertokens-node/recipe/session/index.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { log } from "../../utils/logger.js";
import EmailPassword from "supertokens-node/recipe/emailpassword/index.js";
import { IdParamInput } from "../survey/survey.schema.js";
import {
  deleteSuperTokenUserForId,
  getUserInfo,
} from "../../utils/supertoken/supertoken.js";

export async function getLoggedUserInfoHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const userData = await getLoggedUserInfo(request, reply);
    if (!userData) {
      reply.code(200).send({ message: "No user data found" });
    } else {
      reply.code(200).send({ message: "Success", data: userData });
    }
  } catch (e) {
    log.error(e);
    if (
      e?.message === "Session does not exist anymore" ||
      e?.message?.includes("Session")
    ) {
      return reply.code(401).send({
        message: e.message,
      });
    }
    return reply.code(500).send({
      message: "Internal server error",
    });
  }
}

export async function getLoggedUserProfileHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const userData = await getLoggedUserProfile(request, reply);
    if (!userData) {
      reply.code(200).send({ message: "No user profile found" });
    } else {
      reply.code(200).send({ message: "Success", data: userData });
    }
  } catch (e) {
    reply.code(500).send({ message: `Internal server error :  ${e}` });
  }
}

export async function createGoogleUserHandler(
  request: FastifyRequest<{
    Body: CreateUserGoogleSchema;
  }>,
  reply: FastifyReply,
) {
  let session = await Session.getSession(request, reply);
  let userId = session.getUserId();

  let user;
  let userInfo;
  if (request?.body?.type === "google") {
    userInfo = await supertokens.getUser(userId);
  } else {
    // userInfo = await PasswordLess.getUserById({ userId }); //STT
    userInfo = await supertokens.getUser(userId);
    userInfo.emails[0] = request?.body?.email;
    userInfo.phoneNumbers[0] = request?.body?.phoneNumber;
  }
  let data = {
    id: userId,
    email: userInfo?.emails[0] !== undefined ? userInfo?.emails[0] : "",
    phoneNumber: request?.body?.phoneNumber,
    name: request?.body?.name,
    orgName: request?.body?.orgName,
    recipeName: getUserRecipeName("thirdparty") ?? null,
  };
  try {
    user = await createUserSignup(data);
  } catch (e: any) {
    console.error(e);
    let message = e.message;

    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      message = "User already exists. Please logout and Login again.";
    }

    reply.code(500).send({ success: false, message });
    return;
  }

  reply.code(201).send(user);
}

export async function changeUserPasswordHandler(
  req: FastifyRequest<{
    Body: ChangeUserPasswordSchema;
  }>,
  reply: FastifyReply,
) {
  // get the supertokens session object from the req
  //let session = req.session
  let session = await Session.getSession(req, reply);

  // retrive the old password from the request body
  let oldPassword = req.body.existingPassword;

  // retrive the new password from the request body
  let updatedPassword = req.body.newPassword;

  // get the user's Id from the session
  let userId = session!.getUserId();

  // get the signed in user's email from the getUserById function
  let userInfo = await supertokens.getUser(userId);

  if (userInfo === undefined) {
    let message = "Access failed";
    reply.code(500).send({ success: false, message });
    throw new Error("Should never come here");
  }

  let isPasswordValid = await EmailPassword.verifyCredentials(
    session!.getTenantId(),
    userInfo?.emails[0],
    oldPassword,
  );

  if (isPasswordValid.status !== "OK") {
    // TODO: handle incorrect password error
    let message = "Incorrect old password";
    reply.code(500).send({ success: false, message });
    return;
  }

  // update the user's password using updateEmailOrPassword

  let response = await EmailPassword.updateEmailOrPassword({
    recipeUserId: session!.getRecipeUserId(),
    password: updatedPassword,
    tenantIdForPasswordPolicy: session!.getTenantId(),
  });

  if (response?.status === "UNKNOWN_USER_ID_ERROR") {
    console.log("Unknown user id error");
    let message = "Unknown user id error";
    reply.code(500).send({ success: false, message });
    return;
  }

  //  if (response?.status === "PASSWORD_POLICY_VIOLATED_ERROR") {
  //      // TODO: handle incorrect password error
  //      console.log("..........................incorrect password format")
  //      let message ="Incorrect password format"
  //      reply.code(500).send({ success: false, message });
  //      return
  //  }

  // TODO: send successful password update response

  let message = "Successfully updated password";
  reply.code(200).send({ success: true, message });
}

export async function updateProfileHandler(
  request: FastifyRequest<{
    Body: UpdateProfileSchema;
  }>,
  reply: FastifyReply,
) {
  const body = request.body;
  let user;

  try {
    user = await updateUserProfile(body, request, reply);
  } catch (e: any) {
    console.error(e);
    reply.code(500).send({ success: false, message: e.message });
    return;
  }

  reply.code(201).send({ success: true, data: user });
}

export async function updateProfileByIdHandler(
  request: FastifyRequest<{
    Body: UpdateProfileSchema;
    Params: IdParamInput;
  }>,
  reply: FastifyReply,
) {
  const body = request.body;
  let user;

  try {
    user = await updateUserProfileById({ ...body, userId: request.params.id });
  } catch (e: any) {
    console.error(e);
    reply.code(500).send({ success: false, message: e.message });
    return;
  }

  reply.code(201).send({ success: true, data: user });
}

export async function updateUserPrefLanguageHandler(
  request: FastifyRequest<{
    Body: updateUserLanguageSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const user = await updateUserPrefLanguage(request.body, request, reply);
    reply.code(200).send({ success: true, data: user });
  } catch (e: any) {
    console.error(e);
    reply.code(500).send({ success: false, message: e.message });
  }
}

export async function updateProfilePhotoHandler(
  request: FastifyRequest<{
    Body: UpdateProfilePhotoSchema;
  }>,
  reply: FastifyReply,
) {
  const body = request.body;
  let user;

  try {
    user = await updateUserProfilePhoto(body, request, reply);
  } catch (e: any) {
    console.error(e);
    reply.code(500).send({ success: false, message: e.message });
    return;
  }

  reply.code(201).send({ success: true, data: "Photo Updated..!" });
}

//this controller is for updating the account-active status of user. Currently used for soft deleting the user.
export async function updateUserActiveStatusHandler(
  request: FastifyRequest<{
    Params: { userId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    await updateUserActiveStatus(request.params.userId);
  } catch (e: any) {
    console.error(e);
    reply.code(500).send({ success: false, message: e.message });
    return;
  }

  reply.code(201).send({ success: true, data: "User deleted successfully..!" });
}
// controller to check if email is already exist or not
export async function checkEmailExistHandler(
  request: FastifyRequest<{
    Body: userEmailCheckSchemaInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const user = await checkEmailExist(request.body.email);
    return reply.code(200).send({ success: !!user });
  } catch (e: any) {
    return reply.code(500).send({ success: false, message: e.message });
  }
}

export async function getAllUsersHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const users = await getAllUsers();
    reply.code(200).send(users);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateRecipeNameHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const res = await updateUserRecipe();
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function pauseUserHandler(
  request: FastifyRequest<{ Body: PauseUserInput; Params: IdParamInput }>,
  reply: FastifyReply,
) {
  try {
    const userId = request.params.id;
    const res = await pauseUser(userId, request.body);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function deleteUserFromSuperTokenHandler(
  request: FastifyRequest<{ Body: userEmailCheckSchemaInput }>,
  reply: FastifyReply,
) {
  try {
    const userInfo = await getUserInfo(request.body.email);
    if (!userInfo.length) reply.code(404).send("No user found");
    const userId = userInfo[0].id;
    await deleteSuperTokenUserForId(userId);
    reply.code(200).send("Success");
  } catch (e) {
    reply.code(500).send(e);
  }
}

export async function updateUserAvailabilityStatusHandler(
  request: FastifyRequest<{ Body: UserStatusSchema }>,
  reply: FastifyReply,
) {
  try {
    const { userId, orgId } = request.user;
    const { presenceMode, status } = request.body;
    const res = await updateUserAvailablityStatus(
      userId,
      orgId,
      status,
      presenceMode,
    );
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Unable to update status" });
  }
}

export async function auditLogHandler(
  request: FastifyRequest<{
    Querystring: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { page = 1, limit = 25, sortBy, sortOrder } = request.query;
    const logs = await auditLog(
      orgId,
      Number(page),
      Number(limit),
      sortBy,
      sortOrder,
    );
    reply.send(logs);
  } catch (error) {
    log.error("Error fetching audit logs: %o", error);
    reply.code(500).send({ message: "Failed to fetch audit logs" });
  }
}
