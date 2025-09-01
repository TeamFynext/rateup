import Session from "supertokens-node/recipe/session";
import { TypeInput } from "supertokens-node/types";
import EmailVerification from "supertokens-node/recipe/emailverification";
import {
  createUserSignup,
  getOrgIdAndRole,
  getUserByEmail,
  getUserRecipeName,
  updateLastLoggedInTime,
} from "./modules/user/user.service";
import Dashboard from "supertokens-node/recipe/dashboard";
import { getValueByKey } from "./utils/signUp";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import ThirdParty from "supertokens-node/recipe/thirdparty";
import supertokens from "supertokens-node";
import { sendResetPasswordMail } from "./utils/email/supertoken/passwordReset";
import { sendVerifyMail } from "./utils/email/supertoken/verifyEmail";
import { log } from "./utils/logger";
import Passwordless from "supertokens-node/recipe/passwordless";
import { SupertokensService } from "supertokens-node/recipe/passwordless/smsdelivery";
import { SwaggerOptions } from "@fastify/swagger";
import jwt from "supertokens-node/recipe/jwt";
import { getUserInfo } from "./utils/supertoken/supertoken";
import util from "util";

const frontendUrl = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL
  : "http://localhost:3000";
const backendUrl = process.env.API_URL
  ? process.env.API_URL
  : "http://localhost:3001";

export const SuperTokensConfig: TypeInput = {
  framework: "fastify",
  supertokens: {
    // These are the connection details of the app you created on supertokens.com
    connectionURI: process.env.SUPERTOKEN_URI || "",
    apiKey: process.env.SUPERTOKEN_KEY,
  },
  appInfo: {
    // learn more about this on https://supertokens.com/docs/session/appinfo
    appName: "rateup",
    apiDomain: process.env.API_URL
      ? process.env.API_URL
      : "http://localhost:3001",
    websiteDomain: frontendUrl,
    apiBasePath: "/api/auth",
    websiteBasePath: "/login",
  },
  recipeList: [
    EmailPassword.init({
      signUpFeature: {
        formFields: [
          {
            id: "name",
          },
          {
            id: "orgName",
          },
          {
            id: "phoneNumber",
            optional: true,
          },
          {
            id: "planId",
            optional: true,
          },
        ],
      },
      override: {
        functions: (originalImplementation) => {
          return {
            ...originalImplementation,
            signUp: async function (input) {
              // if (process.env.NODE_ENV === "development") {
              //   if (!input.email.includes("999")) {
              //     throw new Error("Not a RATEUP EMPLOYEE");
              //   }
              // }
              let existingUsers = await supertokens.listUsersByAccountInfo(
                input.tenantId,
                {
                  email: input.email,
                },
              );
              if (existingUsers.length === 0) {
                // this means this email is new so we allow sign up
                // return originalImplementation.signUp(input);

                let response = await originalImplementation.signUp(input);

                if (
                  response.status === "OK" &&
                  response.user.loginMethods.length === 1 &&
                  input.session === undefined
                ) {
                  // TODO: some post sign up logic
                }

                return response;
              }
              return {
                status: "EMAIL_ALREADY_EXISTS_ERROR",
              };
            },

            signIn: async function (input) {
              // TODO: some pre sign in logic

              let response = await originalImplementation.signIn(input);

              if (response.status === "OK" && input.session === undefined) {
                // TODO: some post sign in logic
                await updateLastLoggedInTime(response.user.id, new Date());
              }

              return response;
            },
          };
        },
        apis: (originalImplementation) => {
          return {
            ...originalImplementation,
            signUpPOST: async function (input) {
              let formFields = input.formFields;
              // First we call the original implementation of signUpPOST.
              let response = await originalImplementation.signUpPOST!(input);

              // Post sign up response, we check if it was successful
              if (
                response.status === "OK" &&
                response.user.loginMethods.length === 1 &&
                input.session === undefined
              ) {
                //custom fields
                const name = getValueByKey(formFields, "name");
                const orgName = getValueByKey(formFields, "orgName");
                const phoneNumber = getValueByKey(formFields, "phoneNumber");
                const planId = getValueByKey(formFields, "planId");

                let { id, emails, loginMethods } = response.user;

                let email = emails[0]; // TODO: handle multiple emails

                if (name && orgName) {
                  const userSignup = await createUserSignup({
                    id,
                    email,
                    name,
                    orgName,
                    phoneNumber,
                    recipeName: getUserRecipeName(loginMethods[0].recipeId),
                    planId,
                  });
                }

                // Use name..
              }
              return response;
            },
          };
        },
      },
      emailDelivery: {
        override: (originalImplementation) => {
          return {
            ...originalImplementation,
            sendEmail: async function (input) {
              sendResetPasswordMail(input?.passwordResetLink, input.user.email);
            },
          };
        },
      },
    }),
    ThirdParty.init({
      // We have provided you with development keys which you can use for testing.
      // IMPORTANT: Please replace them with your own OAuth keys for production use.
      signInAndUpFeature: {
        providers: [
          {
            config: {
              thirdPartyId: "google",
              clients: [
                {
                  clientId: process.env.SUPERTOKEN_GOOGLE_CLIENT_ID || "",
                  clientSecret:
                    process.env.SUPERTOKEN_GOOGLE_CLIENT_SECRET || "",
                },
              ],
            },
          },
        ],
      },
      override: {
        functions: (originalImplementation) => {
          return {
            ...originalImplementation,
            signInUp: async function (input) {
              let existingUsers = await getUserInfo(
                input.email,
                input.tenantId,
              );
              if (existingUsers.length === 0) {
                // this means this email is new so we allow sign up
                return originalImplementation.signInUp(input);
              }
              if (
                existingUsers.find(
                  (u) =>
                    u.loginMethods.find(
                      (lM) =>
                        lM.hasSameThirdPartyInfoAs({
                          id: input.thirdPartyId,
                          userId: input.thirdPartyUserId,
                        }) && lM.recipeId === "thirdparty",
                    ) !== undefined,
                )
              ) {
                // this means we are trying to sign in with the same social login. So we allow it
                return originalImplementation.signInUp(input);
              }
              // this means that the email already exists with another social or email password login method, so we throw an error.
              throw new Error("Cannot sign up as email already exists");
            },
          };
        },
        apis: (originalImplementation) => {
          return {
            ...originalImplementation,
            signInUpPOST: async function (input) {
              try {
                return await originalImplementation.signInUpPOST!(input);
              } catch (err: any) {
                console.log(err);
                if (err.message === "Cannot sign up as email already exists") {
                  // this error was thrown from our function override above.
                  // so we send a useful message to the user
                  return {
                    status: "GENERAL_ERROR",
                    message:
                      "Seems like you already have an account with another method. Please use that instead.",
                  };
                }
                throw err;
              }
            },
          };
        },
      },
    }),

    Passwordless.init({
      smsDelivery: {
        service: new SupertokensService(process.env.SUPERTOKEN_SMS_API_KEY),
      },
      contactMethod: "PHONE",
      flowType: "USER_INPUT_CODE",
    }),

    Session.init({
      override: {
        functions: (originalImplementation) => {
          return {
            ...originalImplementation,
            createNewSession: async function (input) {
              let userId = input.userId;
              let userInfo = await supertokens.getUser(userId);
              log.trace("Init session\nemail => %s", userInfo?.emails[0]);
              const user = await getOrgIdAndRole({ id: userId });
              // This goes in the access token, and is availble to read on the frontend.
              input.accessTokenPayload = {
                ...input.accessTokenPayload,
                email: userInfo?.emails[0],
                orgId: user?.orgId,
                role: user?.role,
              };

              return originalImplementation.createNewSession(input);
            },
          };
        },
      },
    }),

    EmailVerification.init({
      mode: "REQUIRED",
      emailDelivery: {
        override: (originalImplementation) => {
          return {
            ...originalImplementation,

            sendEmail: async function (input) {
              const dbUser = await getUserByEmail(input.user.email);
              const username = dbUser.name || "there";
              sendVerifyMail(input.emailVerifyLink, input.user.email, username);
            },
          };
        },
      },
      override: {
        apis: (originalImplementation) => {
          return {
            ...originalImplementation,
            verifyEmailPOST: async function (input) {
              if (originalImplementation.verifyEmailPOST === undefined) {
                throw Error("Should never come here");
              }

              // First we call the original implementation
              let response =
                await originalImplementation.verifyEmailPOST(input);

              // Then we check if it was successfully completed
              if (response.status === "OK") {
                log.trace("Verifying email\n%o", JSON.stringify(response.user));
              }
              console.log("email success res", response);
              return response;
            },
          };
        },
      },
    }),
    Dashboard.init(),
    jwt.init(),
  ],
};

const loyaltyTags = [
  {
    name: "Loyalty/Campaign",
    description: "Loyalty Campaign related endpoints",
  },
  {
    name: "Loyalty/Campaign Reward",
    description: "Loyalty Campaign Reward related endpoints",
  },
  {
    name: "Loyalty/Customer",
    description: "Loyalty Customer related endpoints",
  },
  {
    name: "Loyalty/Campaign -> RewardEvent",
    description: "RewardEvent of a campaign related endpoints",
  },
  {
    name: "Loyalty/Customer -> RewardEvent",
    description: "RewardEvent of a customer related endpoints",
  },
  {
    name: "Loyalty/ReferralCode",
    description: "ReferralCode related endpoints",
  },
];

const publicTags = [
  {
    name: "Contacts",
    description: "Contact related endpoints",
  },
  {
    name: "Contacts/Groups",
    description: "Contact Group related endpoints",
  },
  {
    name: "Team",
    description: "Team related endpoints",
  },
  {
    name: "Campaign",
    description: "Campaign related endpoints",
  },
  {
    name: "Campaign/Participants",
    description: "Campaign Participants related endpoints",
  },
  {
    name: "WhatsApp/Template",
    description: "WhatsApp Template related endpoints",
  },
];

export const swaggerConfig: SwaggerOptions = {
  openapi: {
    openapi: "3.0.0",
    info: {
      title: "Rateup API",
      version: "1.0.0",
    },
    servers: [
      {
        url: backendUrl,
        description: "server",
      },
    ],
    tags: publicTags,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "access_token",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  hideUntagged: true,
};
