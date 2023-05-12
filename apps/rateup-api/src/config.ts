import EmailPassword from "supertokens-node/recipe/emailpassword";
import Session from "supertokens-node/recipe/session";
import { TypeInput } from "supertokens-node/types";
import EmailVerification from "supertokens-node/recipe/emailverification";
import { createUser } from "./modules/user/user.service";
import Dashboard from "supertokens-node/recipe/dashboard";

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
        apiDomain: process.env.API_URL ? process.env.API_URL : "",
        websiteDomain: process.env.FRONTEND_URL ? process.env.FRONTEND_URL : "",
        apiBasePath: "/api/auth",
        websiteBasePath: "/auth",
    },
    recipeList: [
        EmailPassword.init(), // initializes signin / sign up features
        EmailVerification.init({
            mode: "REQUIRED", // or "OPTIONAL"
            override: {
                apis: (originalImplementation) => {
                    return {
                        ...originalImplementation,
                        verifyEmailPOST: async function (input) {

                            if (originalImplementation.verifyEmailPOST === undefined) {
                                throw Error("Should never come here");
                            }

                            // First we call the original implementation
                            let response = await originalImplementation.verifyEmailPOST(input);

                            // Then we check if it was successfully completed
                            if (response.status === "OK") {
                                let { id, email } = response.user;

                                const user = await createUser({id, email});
                            }
                            return response;
                        }
                    }
                }
            }
          }),
        Session.init(), // initializes session features
        Dashboard.init(),

    ]
  }