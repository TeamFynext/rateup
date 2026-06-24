import type { SuperTokensConfig } from "supertokens-auth-react/lib/build/types";
import EmailPasswordReact from "supertokens-auth-react/recipe/emailpassword";
import { EmailPasswordPreBuiltUI } from "supertokens-auth-react/recipe/emailpassword/prebuiltui";
import EmailVerificationReact from "supertokens-auth-react/recipe/emailverification";
import Session from "supertokens-auth-react/recipe/session";
import ThirdPartyReact from "supertokens-auth-react/recipe/thirdparty";

import { appInfo } from "./appInfo.ts";

type RouterAdapter = {
  push: (url: string) => void;
};

const routerInfo: { router?: RouterAdapter; pathName?: string } = {};

function setRouter(router: RouterAdapter, pathName: string) {
  routerInfo.router = router;
  routerInfo.pathName = pathName;
}

export const frontendConfig = (): SuperTokensConfig => {
  return {
    appInfo,
    clientType: "web",
    recipeList: [
      EmailPasswordReact.init(),
      ThirdPartyReact.init({
        signInAndUpFeature: {
          providers: [
            ThirdPartyReact.Google.init(),
            ThirdPartyReact.Apple.init(),
          ],
        },
      }),
      EmailVerificationReact.init(),
      // Passwordless.init(),
      Session.init(),
    ],
    windowHandler: (orig) => {
      return {
        ...orig,
        location: {
          ...orig.location,
          getPathName: () => routerInfo.pathName ?? orig.location.getPathName(),
          assign: (url) => {
            if (routerInfo.router) {
              routerInfo.router.push(url.toString());
              return;
            }
            orig.location.assign(url);
          },
          setHref: (url) => {
            if (routerInfo.router) {
              routerInfo.router.push(url.toString());
              return;
            }
            orig.location.setHref(url);
          },
        },
      };
    },
  };
};

const recipeDetails = {
  docsLink: "https://supertokens.com/docs/emailpassword/introduction",
};
const PreBuiltUIList = [EmailPasswordPreBuiltUI];
