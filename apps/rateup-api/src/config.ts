import Session from "supertokens-node/recipe/session";
import { TypeInput } from "supertokens-node/types";
import EmailVerification from "supertokens-node/recipe/emailverification";
import { createUserSignup, getOrgIdAndRole } from "./modules/user/user.service";
import Dashboard from "supertokens-node/recipe/dashboard";
import { getValueByKey } from "./utils/signUp";
import ThirdPartyEmailPassword from "supertokens-node/recipe/thirdpartyemailpassword";
import { sendResetPasswordMail } from "./utils/email/supertoken/passwordReset";
import { sendVerifyMail } from "./utils/email/supertoken/verifyEmail";
import { log } from "./utils/logger";
import Passwordless from "supertokens-node/recipe/passwordless";
import { SupertokensService } from "supertokens-node/recipe/passwordless/smsdelivery";
import { SwaggerOptions } from "@fastify/swagger";

const frontendUrl = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL
  : "http://localhost:3000";

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
    ThirdPartyEmailPassword.init({
      signUpFeature: {
        formFields: [
          {
            id: "name",
          },
          {
            id: "orgName",
          },
          {
            id: "inviteCode",
          },
        ],
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

      providers: [
        // We have provided you with development keys which you can use for testing.
        // IMPORTANT: Please replace them with your own OAuth keys for production use.

        {
          config: {
            thirdPartyId: "google",
            clients: [
              {
                clientId: process.env.SUPERTOKEN_GOOGLE_CLIENT_ID || "",
                clientSecret: process.env.SUPERTOKEN_GOOGLE_CLIENT_SECRET || "",
              },
            ],
          },
        },
      ],

      override: {
        functions: (originalImplementation) => {
          return {
            ...originalImplementation,
            emailPasswordSignUp: async function (input) {
              let existingUsers = await ThirdPartyEmailPassword.getUsersByEmail(
                "public",
                input.email,
              );

              if (existingUsers.length === 0) {
                // this means this email is new so we allow sign up
                return originalImplementation.emailPasswordSignUp(input);
              }
              return {
                status: "EMAIL_ALREADY_EXISTS_ERROR",
              };
            },
            thirdPartySignInUp: async function (input) {
              let existingUsers = await ThirdPartyEmailPassword.getUsersByEmail(
                "public",
                input.email,
              );
              if (existingUsers.length === 0) {
                // this means this email is new so we allow sign up
                return originalImplementation.thirdPartySignInUp(input);
              }
              if (
                existingUsers.find(
                  (i) =>
                    i.thirdParty !== undefined &&
                    i.thirdParty.id === input.thirdPartyId &&
                    i.thirdParty.userId === input.thirdPartyUserId,
                )
              ) {
                // this means we are trying to sign in with the same social login. So we allow it
                return originalImplementation.thirdPartySignInUp(input);
              }
              // this means that the email already exists with another social or email password login method, so we throw an error.
              throw new Error("Cannot sign up as email already exists");
            },
          };
        },
        apis: (originalImplementation) => {
          return {
            ...originalImplementation,

            // override the email password sign up API
            emailPasswordSignUpPOST: async function (input) {
              if (
                originalImplementation.emailPasswordSignUpPOST === undefined
              ) {
                throw Error("Should never come here");
              }

              // TODO: some pre sign up logic

              let formFields = input.formFields;
              const inviteCode = getValueByKey(formFields, "inviteCode");
              if (inviteCode !== process.env.INVITE_CODE) {
                return {
                  status: "GENERAL_ERROR",
                  message: "Invite Code not valid",
                };
              }

              let response =
                await originalImplementation.emailPasswordSignUpPOST(input);

              if (response.status === "OK") {
                // TODO: some post sign up logic

                const name = getValueByKey(formFields, "name");
                const orgName = getValueByKey(formFields, "orgName");

                let { id, email } = response.user;

                if (name && orgName) {
                  const userSignup = await createUserSignup({
                    id,
                    email,
                    name,
                    orgName,
                  });
                }
              }

              return response;
            },

            // override the email password sign in API
            emailPasswordSignInPOST: async function (input) {
              if (
                originalImplementation.emailPasswordSignInPOST === undefined
              ) {
                throw Error("Should never come here");
              }

              // TODO: some pre sign in logic

              let response =
                await originalImplementation.emailPasswordSignInPOST(input);

              if (response.status === "OK") {
                // TODO: some post sign in logic
              }

              return response;
            },

            // override the thirdparty sign in / up API
            thirdPartySignInUpPOST: async function (input) {
              if (originalImplementation.thirdPartySignInUpPOST === undefined) {
                throw Error("Should never come here");
              }
              // TODO: Some pre sign in / up logic
              try {
                let response =
                  await originalImplementation.thirdPartySignInUpPOST!(input);

                if (response.status === "OK") {
                  if (response.createdNewUser) {
                    // TODO: some post sign up logic
                  } else {
                    // TODO: some post sign in logic
                    log.trace(
                      "Signed in\nemail => %s\nuserId => %s",
                      response?.user?.email,
                      response?.user?.id,
                    );
                    const user = await getOrgIdAndRole({
                      id: response?.user?.id,
                    });
                  }
                }

                return response;
              } catch (err: any) {
                if (err.message === "Cannot sign up as email already exists") {
                  // this error was thrown from our function override above.
                  // so we send a useful message to the user
                  return {
                    status: "GENERAL_ERROR",
                    message:
                      "Seems like you already have an account with another method. Please use Email & Password to Login.",
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
              let userInfo = await ThirdPartyEmailPassword.getUserById(userId);

              log.trace("Init session\nemail => %s", userInfo?.email);
              const user = await getOrgIdAndRole({ id: userId });
              // This goes in the access token, and is availble to read on the frontend.
              input.accessTokenPayload = {
                ...input.accessTokenPayload,
                email: userInfo?.email,
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
              sendVerifyMail(input.emailVerifyLink, input.user.email);
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
                let { id, email } = response.user;
                log.trace("Verifying email\n%o", JSON.stringify(response.user));
                let orgMember = await getOrgIdAndRole({ id: id });
              }
              return response;
            },
          };
        },
      },
    }),
    Dashboard.init(),
  ],
};

export const swaggerConfig: SwaggerOptions = {
  openapi: {
    openapi: "3.0.0",
    info: {
      title: "Fastify Swagger Example",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    tags: [
      {
        name: "Loyalty Campaign",
        description: "Loyalty Campaign related endpoints",
      },
      {
        name: "Loyalty Campaign Reward",
        description: "Loyalty Campaign Reward related endpoints",
      },
      {
        name: "Loyalty Customer",
        description: "Loyalty Customer related endpoints",
      },
      {
        name: "Loyalty Campaign -> RewardEvent",
        description: "RewardEvent of a campaign related endpoints",
      },
      {
        name: "Loyalty Customer -> RewardEvent",
        description: "RewardEvent of a customer related endpoints",
      },
      {
        name: "Loyalty ReferralCode",
        description: "ReferralCode related endpoints",
      },
    ],
  },
  hideUntagged: true,
};
