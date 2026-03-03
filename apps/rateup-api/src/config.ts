import { TypeInput } from "supertokens-node/types/index.js";
import Session from "supertokens-node/recipe/session/index.js";
import EmailVerification from "supertokens-node/recipe/emailverification/index.js";
import Dashboard from "supertokens-node/recipe/dashboard/index.js";
import EmailPassword from "supertokens-node/recipe/emailpassword/index.js";
import ThirdParty from "supertokens-node/recipe/thirdparty/index.js";
import Passwordless from "supertokens-node/recipe/passwordless/index.js";
import jwt from "supertokens-node/recipe/jwt/index.js";
import { SupertokensService } from "supertokens-node/recipe/passwordless/smsdelivery/index.js";
import { SwaggerOptions } from "@fastify/swagger";
import supertokens from "supertokens-node";
import {
  createUserSignup,
  getOrgIdAndRole,
  getUserByEmail,
  getUserRecipeName,
  updateLastLoggedInTime,
} from "./modules/user/user.service.js";
import { getValueByKey } from "./utils/signUp/index.js";
import { sendResetPasswordMail } from "./utils/email/supertoken/passwordReset.js";
import { sendVerifyMail } from "./utils/email/supertoken/verifyEmail.js";
import { log } from "./utils/logger.js";
import { getUserInfo } from "./utils/supertoken/supertoken.js";

// Environment configuration
export const appConfig = {
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  backendUrl: process.env.API_URL || "http://localhost:3001",
  port: Number.parseInt(process.env.PORT || "3001", 10),
  host: process.env.HOST || "::",
  nodeEnv: process.env.NODE_ENV || "development",
  kafkaUrl: process.env.KAFKA_URL,
  supertokens: {
    connectionURI: process.env.SUPERTOKEN_URI || "",
    apiKey: process.env.SUPERTOKEN_KEY,
    smsApiKey: process.env.SUPERTOKEN_SMS_API_KEY,
    googleClientId: process.env.SUPERTOKEN_GOOGLE_CLIENT_ID || "",
    googleClientSecret: process.env.SUPERTOKEN_GOOGLE_CLIENT_SECRET || "",
  },
  cookieDomain: process.env.COOKIE_DOMAIN || "",
};

// SuperTokens configuration
export const SuperTokensConfig: TypeInput = {
  framework: "fastify",
  supertokens: {
    connectionURI: appConfig.supertokens.connectionURI,
    apiKey: appConfig.supertokens.apiKey,
  },
  appInfo: {
    appName: "rateup",
    apiDomain: appConfig.backendUrl,
    websiteDomain: appConfig.frontendUrl,
    apiBasePath: "/api/auth",
    websiteBasePath: "/login",
  },
  recipeList: [
    EmailPassword.init({
      signUpFeature: {
        formFields: [
          { id: "name" },
          { id: "orgName" },
          { id: "phoneNumber", optional: true },
          { id: "planId", optional: true },
          { id: "location", optional: true },
          { id: "website", optional: true },
          { id: "goals", optional: true },
          { id: "integrationsSelected", optional: true },
        ],
      },
      override: {
        functions: (originalImplementation) => ({
          ...originalImplementation,
          signUp: async function (input) {
            const existingUsers = await supertokens.listUsersByAccountInfo(
              input.tenantId,
              { email: input.email },
            );

            if (existingUsers.length === 0) {
              const response = await originalImplementation.signUp(input);

              if (
                response.status === "OK" &&
                response.user.loginMethods.length === 1 &&
                input.session === undefined
              ) {
                // Post sign up logic can be added here
              }

              return response;
            }

            return { status: "EMAIL_ALREADY_EXISTS_ERROR" };
          },

          signIn: async function (input) {
            const response = await originalImplementation.signIn(input);

            if (response.status === "OK" && input.session === undefined) {
              await updateLastLoggedInTime(response.user.id, new Date());
            }

            return response;
          },
        }),
        apis: (originalImplementation) => ({
          ...originalImplementation,
          signUpPOST: async function (input) {
            const response = await originalImplementation.signUpPOST!(input);

            if (
              response.status === "OK" &&
              response.user.loginMethods.length === 1 &&
              input.session === undefined
            ) {
              const formFields = input.formFields as Array<{
                id: string;
                value: string;
              }>;
              const name = getValueByKey(formFields, "name");
              const orgName = getValueByKey(formFields, "orgName");
              const phoneNumber = getValueByKey(formFields, "phoneNumber");
              const planId = getValueByKey(formFields, "planId");
              const location = getValueByKey(formFields, "location");
              const website = getValueByKey(formFields, "website");
              const goals = getValueByKey(formFields, "goals");
              const integrationsSelected = getValueByKey(
                formFields,
                "integrationsSelected",
              );

              const { id, emails, loginMethods } = response.user;
              const email = emails[0];

              if (name && orgName) {
                await createUserSignup({
                  id,
                  email,
                  name,
                  orgName,
                  phoneNumber,
                  recipeName: getUserRecipeName(loginMethods[0].recipeId),
                  planId,
                  location,
                  website,
                  goals: Array.isArray(goals) ? goals : goals ? [goals] : [],
                  integrationsSelected: Array.isArray(integrationsSelected)
                    ? integrationsSelected
                    : integrationsSelected
                      ? [integrationsSelected]
                      : [],
                });
              }
            }

            return response;
          },
        }),
      },
      emailDelivery: {
        override: (originalImplementation) => ({
          ...originalImplementation,
          sendEmail: async function (input) {
            sendResetPasswordMail(input?.passwordResetLink, input.user.email);
          },
        }),
      },
    }),

    ThirdParty.init({
      signInAndUpFeature: {
        providers: [
          {
            config: {
              thirdPartyId: "google",
              clients: [
                {
                  clientId: appConfig.supertokens.googleClientId,
                  clientSecret: appConfig.supertokens.googleClientSecret,
                },
              ],
            },
          },
        ],
      },
      override: {
        functions: (originalImplementation) => ({
          ...originalImplementation,
          signInUp: async function (input) {
            const existingUsers = await getUserInfo(
              input.email,
              input.tenantId,
            );

            if (existingUsers.length === 0) {
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
        }),
        apis: (originalImplementation) => ({
          ...originalImplementation,
          signInUpPOST: async function (input) {
            try {
              return await originalImplementation.signInUpPOST!(input);
            } catch (err: any) {
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
        }),
      },
    }),

    Passwordless.init({
      smsDelivery: {
        service: new SupertokensService(appConfig.supertokens.smsApiKey),
      },
      contactMethod: "PHONE",
      flowType: "USER_INPUT_CODE",
    }),

    Session.init({
      // TODO: add this when app router pages is ssr
      // cookieDomain: appConfig.cookieDomain,
      // olderCookieDomain: "",
      // cookieSecure: true,
      override: {
        functions: (originalImplementation) => ({
          ...originalImplementation,
          createNewSession: async function (input) {
            const userId = input.userId;
            const userInfo = await supertokens.getUser(userId);
            log.trace("Init session\nemail => %s", userInfo?.emails[0]);

            const user = await getOrgIdAndRole({ id: userId });

            input.accessTokenPayload = {
              ...input.accessTokenPayload,
              email: userInfo?.emails[0],
              orgId: user?.orgId,
              role: user?.role,
            };

            return originalImplementation.createNewSession(input);
          },
        }),
      },
    }),

    EmailVerification.init({
      mode: "REQUIRED",
      emailDelivery: {
        override: (originalImplementation) => ({
          ...originalImplementation,
          sendEmail: async function (input) {
            const dbUser = await getUserByEmail(input.user.email);
            const username = dbUser.name || "there";
            sendVerifyMail(input.emailVerifyLink, input.user.email, username);
          },
        }),
      },
      override: {
        apis: (originalImplementation) => ({
          ...originalImplementation,
          verifyEmailPOST: async function (input) {
            if (originalImplementation.verifyEmailPOST === undefined) {
              throw Error("Should never come here");
            }
            // First we call the original implementation

            const response =
              await originalImplementation.verifyEmailPOST(input);

            if (response.status === "OK") {
              log.trace("Verifying email\n%o", JSON.stringify(response.user));
            }

            return response;
          },
        }),
      },
    }),

    Dashboard.init(),
    jwt.init(),
  ],
};

// Swagger tags
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
  { name: "Contacts", description: "Contact related endpoints" },
  { name: "Contacts/Groups", description: "Contact Group related endpoints" },
  { name: "Team", description: "Team related endpoints" },
  { name: "Campaign", description: "Campaign related endpoints" },
  {
    name: "Campaign/Participants",
    description: "Campaign Participants related endpoints",
  },
  {
    name: "WhatsApp/Template",
    description: "WhatsApp Template related endpoints",
  },
];

// Swagger configuration
export const swaggerConfig: SwaggerOptions = {
  openapi: {
    openapi: "3.0.0",
    info: {
      title: "Rateup API",
      version: "1.0.0",
    },
    servers: [
      {
        url: appConfig.backendUrl,
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
