import Session from "supertokens-web-js/recipe/session";
import { appInfo } from "./appInfo";
import Router from "next/router";
import ThirdPartyEmailPassword from "supertokens-web-js/recipe/thirdpartyemailpassword";
import EmailVerification from "supertokens-web-js/recipe/emailverification";
import Passwordless from "supertokens-web-js/recipe/Passwordless";

export const frontendConfig = () => {
  return {
    appInfo,
    recipeList: [
      Session.init(),
      ThirdPartyEmailPassword.init(),
      Passwordless.init(),
      EmailVerification.init(),
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
