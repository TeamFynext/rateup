import EmailPasswordReact from "supertokens-auth-react/recipe/emailpassword";
import EmailVerificationReact from "supertokens-auth-react/recipe/emailverification";
import Session from "supertokens-auth-react/recipe/session";
import ThirdParty from "supertokens-auth-react/recipe/thirdparty";

import { appInfo } from "./appInfo.ts";

export const SuperTokensConfig = {
  appInfo,
  clientType: "web",
  recipeList: [
    EmailPasswordReact.init(),
    ThirdParty.init({
      signInAndUpFeature: {
        providers: [ThirdParty.Google.init(), ThirdParty.Apple.init()],
      },
    }),
    EmailVerificationReact.init(),
    // Passwordless.init(),
    Session.init(),
  ],
  getRedirectionURL: async (context: { action: string }) => {
    if (context.action === "SUCCESS") {
      return "/dashboard";
    }
    return undefined;
  },
};
