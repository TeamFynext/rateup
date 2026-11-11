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
} from "./modules/settings/user/user.service.js";
import { getValueByKey } from "./utils/signUp/index.js";
import { sendResetPasswordMail } from "./utils/email/supertoken/passwordReset.js";
import { sendVerifyMail } from "./utils/email/supertoken/verifyEmail.js";
import { log } from "./utils/logger.js";
import { getUserInfo } from "./utils/supertoken/supertoken.js";
import { captchaPlugins } from "./utils/supertoken/captcha.js";
import { jsonSchemaTransform } from "fastify-type-provider-zod";
import { errorMessage } from "./utils/commonUtils.js";
import { trimTrailingSlash } from "./utils/url.js";
import { envFlag } from "./utils/envFlag.js";

// Environment configuration
export const appConfig = {
  frontendUrl: trimTrailingSlash(process.env.FRONTEND_URL) || "http://localhost:3000",
  backendUrl: trimTrailingSlash(process.env.API_URL) || "http://localhost:3001",
  port: Number.parseInt(process.env.PORT || "3001", 10),
  host: process.env.HOST || "::",
  nodeEnv: process.env.NODE_ENV || "development",
  supertokens: {
    connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || "",
    apiKey: process.env.SUPERTOKENS_API_KEY,
    smsApiKey: process.env.SUPERTOKENS_SMS_API_KEY,
    googleClientId: process.env.SUPERTOKENS_GOOGLE_CLIENT_ID || "",
    googleClientSecret: process.env.SUPERTOKENS_GOOGLE_CLIENT_SECRET || "",
    appleClientId: process.env.APPLE_CLIENT_ID || "",
    appleKeyId: process.env.APPLE_KEY_ID || "",
    applePrivateKey: process.env.APPLE_PRIVATE_KEY || "",
    appleTeamId: process.env.APPLE_TEAM_ID || "",
    appleIosClientId: process.env.APPLE_IOS_CLIENT_ID || "",
  },
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
          { id: "orgName", optional: true },
          { id: "phoneNumber", optional: true },
          { id: "planId", optional: true },
          { id: "location", optional: true },
          { id: "website", optional: true },
          { id: "goals", optional: true },
          { id: "integrationsSelected", optional: true },
          { id: "teamSize", optional: true },
          { id: "referralCode", optional: true },
        ],
      },
      override: {
        functions: (originalImplementation) => ({
          ...originalImplementation,
          signUp: async function (input) {
            const existingUsers = await supertokens.listUsersByAccountInfo(input.tenantId, {
              email: input.email,
            });

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
              const industry = getValueByKey(formFields, "industry");
              const goals = getValueByKey(formFields, "goals");
              const integrationsSelected = getValueByKey(formFields, "integrationsSelected");
              const teamSize = getValueByKey(formFields, "teamSize");
              const referralCode = getValueByKey(formFields, "referralCode");

              const { id, emails, loginMethods } = response.user;
              const email = emails[0];

              if (name) {
                const recipeName = getUserRecipeName(
                  loginMethods[0].recipeId,
                  loginMethods[0].thirdParty?.id,
                );
                if (!recipeName) {
                  throw new Error(`Unsupported auth recipe: ${loginMethods[0].recipeId}`);
                }

                await createUserSignup({
                  id,
                  email,
                  name,
                  orgName: orgName || undefined,
                  phoneNumber: phoneNumber ?? undefined,
                  recipeName,
                  planId: planId ?? undefined,
                  location: location ?? undefined,
                  website: website ?? undefined,
                  industry: industry ?? undefined,
                  goals: Array.isArray(goals) ? goals : goals ? [goals] : [],
                  integrationsSelected: Array.isArray(integrationsSelected)
                    ? integrationsSelected
                    : integrationsSelected
                      ? [integrationsSelected]
                      : [],
                  phone: phoneNumber ?? undefined,
                  teamSize: teamSize ?? undefined,
                  referralCode: referralCode ?? undefined,
                });
              }
            }

            return response;
          },
          passwordResetPOST: async function (input) {
            const response = await originalImplementation.passwordResetPOST!(input);
            // A reset is how someone takes an account back: every session open before it
            // ends, including any held by whoever had the old password.
            if (response.status === "OK") {
              await Session.revokeAllSessionsForUser(response.user.id);
            }
            return response;
          },
        }),
      },
      emailDelivery: {
        override: (originalImplementation) => ({
          ...originalImplementation,
          sendEmail: async function (input) {
            // Awaited so a queue failure surfaces to SuperTokens instead of becoming an
            // unhandled rejection while the caller is told the reset email was sent.
            await sendResetPasswordMail(input?.passwordResetLink, input.user.email);
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
                  clientType: "web",
                },
                {
                  clientId: appConfig.supertokens.googleClientId,
                  clientSecret: appConfig.supertokens.googleClientSecret,
                  clientType: "mobile",
                },
              ],
            },
          },
          {
            config: {
              thirdPartyId: "apple",
              clients: [
                {
                  clientId: appConfig.supertokens.appleClientId,
                  clientType: "web",
                  additionalConfig: {
                    keyId: appConfig.supertokens.appleKeyId,
                    privateKey: appConfig.supertokens.applePrivateKey.replace(/\\n/g, "\n"),
                    teamId: appConfig.supertokens.appleTeamId,
                  },
                },
                {
                  clientId: appConfig.supertokens.appleIosClientId,
                  clientType: "mobile",
                  additionalConfig: {
                    keyId: appConfig.supertokens.appleKeyId,
                    privateKey: appConfig.supertokens.applePrivateKey.replace(/\\n/g, "\n"),
                    teamId: appConfig.supertokens.appleTeamId,
                  },
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
            const clientType = input.userContext.clientType;
            const existingUsers = await getUserInfo(input.email, input.tenantId);

            if (clientType === "mobile" && existingUsers.length === 0) {
              throw new Error(
                "Signup is not available on mobile. Please sign up on the web first, then log in here.",
              );
            }

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
              const body = await input.options.req.getJSONBody();
              input.userContext.clientType = body.clientType;
              return await originalImplementation.signInUpPOST!(input);
            } catch (err) {
              if (errorMessage(err) === "Cannot sign up as email already exists") {
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
        // SUPERTOKENS_SMS_API_KEY is unset in development and in the test env,
        // where this module is imported but no SMS is ever sent — the value is
        // passed through as-is, as it always has been.
        service: new SupertokensService(appConfig.supertokens.smsApiKey!),
      },
      contactMethod: "PHONE",
      flowType: "USER_INPUT_CODE",
      override: {
        apis: (originalImplementation) => ({
          ...originalImplementation,
          createCodePOST: async function (input) {
            // Phone sign-up is a product flow today (the dashboard's /signup?auth=phone), so it
            // stays on unless PASSWORDLESS_PHONE_SIGNUP_ENABLED=false: then an SMS is only ever sent
            // to a number that already has an account, which ends SMS pumping to arbitrary
            // numbers. The per-IP/per-number limits in plugins/index.ts apply either way.
            if (
              !envFlag("PASSWORDLESS_PHONE_SIGNUP_ENABLED", true) &&
              "phoneNumber" in input &&
              input.phoneNumber
            ) {
              const existing = await supertokens.listUsersByAccountInfo(input.tenantId, {
                phoneNumber: input.phoneNumber,
              });
              if (existing.length === 0) {
                return {
                  status: "GENERAL_ERROR",
                  message: "No account uses this phone number. Sign up with your email first.",
                };
              }
            }
            return originalImplementation.createCodePOST!(input);
          },
        }),
      },
    }),

    Session.init({
      // TODO: add this when app router pages is ssr
      // cookieDomain: <domain>,
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
            const username = dbUser?.name || "there";
            // Awaited for the same reason as the password-reset override above: an
            // un-awaited enqueue failure becomes an unhandled rejection while SuperTokens
            // reports the verification email as sent.
            await sendVerifyMail(input.emailVerifyLink, input.user.email, username);
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

            const response = await originalImplementation.verifyEmailPOST(input);

            if (response.status === "OK") {
              log.trace("Verifying email\n%o", JSON.stringify(response.user));
            }

            return response;
          },
        }),
      },
    }),

    // The SuperTokens admin dashboard is an admin login surface at /api/auth/dashboard; off
    // unless explicitly enabled, and then limited to the listed admin emails.
    ...(envFlag("SUPERTOKENS_DASHBOARD_ENABLED")
      ? [
          Dashboard.init({
            admins: (process.env.SUPERTOKENS_DASHBOARD_ADMINS ?? "")
              .split(",")
              .map((email) => email.trim())
              .filter(Boolean),
          }),
        ]
      : []),
    jwt.init(),
  ],
  // CAPTCHA on sign-up and SMS codes, when TURNSTILE_SECRET_KEY is set.
  experimental: { plugins: captchaPlugins() },
};

// Swagger tags

const publicTags = [
  { name: "Contacts", description: "Contacts, looked up by id or phone; bulk import up to 1000" },
  {
    name: "Audiences",
    description:
      "Audiences (formerly contact groups) and their members: `/audiences` in v2, " +
      "`/contact-groups` in v1. Field names and error codes keep the `contactGroup` spelling.",
  },
  { name: "Teams", description: "Teams, for routing sends" },
  { name: "Campaigns", description: "WhatsApp campaigns: create, send and read responses" },
  { name: "Surveys", description: "Surveys and their responses" },
  {
    name: "WhatsApp/Template",
    description:
      "Send approved WhatsApp templates and read message status. Each send is a paid " +
      "message, so send an Idempotency-Key with it: a retry then replays instead of sending twice.",
  },
  {
    name: "Loyalty",
    description:
      "Points, members, rewards and vouchers for a till or e-commerce integration. " +
      "Members are named by phone number or card code. Send an Idempotency-Key with every " +
      "write, so a retried award or redemption is not applied twice.",
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
  transform: jsonSchemaTransform,
};
