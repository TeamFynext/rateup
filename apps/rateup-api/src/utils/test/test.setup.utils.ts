import { deleteUser, getUserByEmail } from "../../modules/user/user.service.js";
import supertokens from "supertokens-node";
import { SuperTokensConfig } from "../../config.js";
import { FastifyInstance } from "fastify";
import { log } from "../logger.js";
import {
  createEmailVerificationToken,
  verifyEmailUsingToken,
} from "supertokens-node/recipe/emailverification/index.js";
import Session from "supertokens-node/recipe/session/index.js";
import { randomUUID } from "node:crypto";
import { getAsRecipeUserIdType } from "../supertoken/supertoken.js";

export const test_user_password = "tester1!";
export const test_tenantId = process.env.TEST_TENANT_ID || "public";

export async function createTestUser(fastify: FastifyInstance) {
  let userId = "";
  const test_user_email = randomUUID() + "@test.com";
  try {
    const res = await fastify
      .inject()
      .post("/api/auth/signup")
      .headers({ rid: "thirdpartyemailpassword" })
      .body({
        formFields: [
          { id: "email", value: test_user_email },
          { id: "password", value: test_user_password },
          { id: "name", value: "tester" },
          { id: "orgName", value: "testOrg" },
        ],
      });

    const user = JSON.parse(res.body).user;
    userId = user.id;

    const tokenRes = await createEmailVerificationToken(test_tenantId, user.id);
    if (tokenRes.status === "OK") {
      const token = tokenRes.token;
      await verifyEmailUsingToken(test_tenantId, token);
      const user = await getUserByEmail(test_user_email);
      return user;
    } else {
      throw new Error("Email verification token creation failed");
    }
  } catch (e) {
    log.error(e);
    await deleteUser(userId);
  }
}

export function initTestSupertokens() {
  supertokens.init(SuperTokensConfig);
}

export async function createNewTestSession(email: string) {
  const user = await getUserByEmail(email);
  let recipeUserId = await getAsRecipeUserIdType(user.id);
  return Session.createNewSessionWithoutRequestResponse(
    test_tenantId,
    recipeUserId,
  );
}
