import Session from "supertokens-web-js/recipe/session";
import { appInfo } from "./appInfo";
import Router from "next/router";
import ThirdParty from "supertokens-web-js/recipe/thirdparty";
import EmailPassword from "supertokens-web-js/recipe/emailpassword";
import EmailVerification from "supertokens-web-js/recipe/emailverification";
import Passwordless from "supertokens-web-js/recipe/passwordless";

export const frontendConfig = () => {
  return {
    appInfo,
    recipeList: [
      Session.init(),
      ThirdParty.init(),
      EmailPassword.init(),
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
