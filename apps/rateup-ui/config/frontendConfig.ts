import Router from "next/router";

import { SuperTokensConfig } from "supertokens-auth-react/lib/build/types";
import EmailPasswordReact from "supertokens-auth-react/recipe/emailpassword";
import { EmailPasswordPreBuiltUI } from "supertokens-auth-react/recipe/emailpassword/prebuiltui";
import EmailVerificationReact from "supertokens-auth-react/recipe/emailverification";
import PasswordlessReact from "supertokens-auth-react/recipe/passwordless";
import SessionReact from "supertokens-auth-react/recipe/session";
import ThirdPartyReact from "supertokens-auth-react/recipe/thirdparty";

import { appInfo } from "./appInfo";

export const frontendConfig = (): SuperTokensConfig => {
  return {
    appInfo,
    recipeList: [
      EmailPasswordReact.init(),
      SessionReact.init(),
      ThirdPartyReact.init({
        signInAndUpFeature: {
          providers: [ThirdPartyReact.Google.init()],
        },
      }),
      // PasswordlessReact.init({
      //   contactMethod: "EMAIL_OR_PHONE",
      // }),
      EmailVerificationReact.init(),
    ],
    windowHandler: (oI: any) => {
      return {
        ...oI,
        location: {
          ...oI.location,
          setHref: (href: string) => {
            Router.push(href);
          },
        },
      };
    },
  };
};

export const recipeDetails = {
  docsLink: "https://supertokens.com/docs/emailpassword/introduction",
};

export const PreBuiltUIList = [EmailPasswordPreBuiltUI];
