import EmailPassword from "supertokens-node/recipe/emailpassword";
import Session from "supertokens-node/recipe/session";
import { TypeInput } from "supertokens-node/types";
import EmailVerification from "supertokens-node/recipe/emailverification";
import { createUser, getOrgIdAndRole } from "./modules/user/user.service";
import Dashboard from "supertokens-node/recipe/dashboard";

const frontendUrl =  process.env.FRONTEND_URL ? process.env.FRONTEND_URL : "http://localhost:3000";

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
    apiDomain: process.env.API_URL ? process.env.API_URL : "http://localhost:3001",
    websiteDomain: frontendUrl,
    apiBasePath: "/api/auth",
    websiteBasePath: "/auth",
  },
  recipeList: [
    EmailPassword.init({
      emailDelivery: {
          override: (originalImplementation) => {
              return {
                  ...originalImplementation,
                  sendEmail: async function (input) {
                      if (input.type === "PASSWORD_RESET") {
                          // You can change the path, domain of the reset password link,
                          // or even deep link it to your mobile app
                          return originalImplementation.sendEmail({
                              ...input,
                              passwordResetLink: input.passwordResetLink.replace(
                                  `${frontendUrl}/auth/reset-password`,
                                  `${frontendUrl}/login/reset-password`,
                                  )
                          })
                      }
                      return originalImplementation.sendEmail(input);
                  }
              }
          }
      }
  }), // initializes signin / sign up features
    EmailVerification.init({
      mode: "REQUIRED", // or "OPTIONAL"
      emailDelivery: {
        override: (originalImplementation) => {
            return {
                ...originalImplementation,
                sendEmail(input) {
                    return originalImplementation.sendEmail({
                        ...input,
                        emailVerifyLink: input.emailVerifyLink.replace(
                            // This is: `${websiteDomain}${websiteBasePath}/verify-email`
                            `${frontendUrl}/auth/verify-email`,
                            `${frontendUrl}/login/verify-email`
                            ),
                        }
                    )
                },
            }
        }
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
              let response = await originalImplementation.verifyEmailPOST(
                input
              );

              // Then we check if it was successfully completed
              if (response.status === "OK") {
                let { id, email } = response.user;

                const user = await createUser({ id, email });

                if(user){
                  let orgMember = await getOrgIdAndRole({ id: id });
                }

              }
              return response;
            },
          };
        },
      },
    }),
    Session.init({
      antiCsrf: "VIA_TOKEN",
      override: {
        functions: (originalImplementation) => {
          return {
            ...originalImplementation,
            createNewSession: async function (input) {
              let userId = input.userId;
              let userInfo = await EmailPassword.getUserById(userId);

              const user = await getOrgIdAndRole({ id: userId });
              // This goes in the access token, and is availble to read on the frontend.
              input.accessTokenPayload = {
                ...input.accessTokenPayload,
                email: userInfo?.email,
                orgId: user?.orgId,
                role: user?.role,
              };
              console.log(input.accessTokenPayload);
              return originalImplementation.createNewSession(input);
            },
          };
        },
      },
    }), // initializes session features
    Dashboard.init(),
  ],
};
