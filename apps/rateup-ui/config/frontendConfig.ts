import Session from 'supertokens-web-js/recipe/session';
import { appInfo } from './appInfo'
import Router from 'next/router'
import ThirdPartyEmailPassword from 'supertokens-web-js/recipe/thirdpartyemailpassword'
import EmailVerification from "supertokens-web-js/recipe/emailverification";

export const frontendConfig = () => {
  return {
    appInfo,
    recipeList: [
      Session.init(),
      ThirdPartyEmailPassword.init(),
    //   EmailPassword.init({
    //     getRedirectionURL: async (context) => {
    //         if (context.action === "SUCCESS") {
    //             if (context.redirectToPath !== undefined) {
    //                 // we are navigating back to where the user was before they authenticated
    //                 return context.redirectToPath;
    //             }
    //             return "/dashboard";
    //         }
    //         return undefined;
    //     }
    //  }),
      EmailVerification.init(),
    ],
    windowHandler: (oI: any) => {
      return {
        ...oI,
        location: {
          ...oI.location,
          setHref: (href: string) => {
            Router.push(href)
          },
        },
      }
    },
  }
}