import EmailPassword from 'supertokens-auth-react/recipe/emailpassword'
import SessionReact from 'supertokens-auth-react/recipe/session'
import { appInfo } from './appInfo'
import Router from 'next/router'
import EmailVerification from "supertokens-auth-react/recipe/emailverification";

export const frontendConfig = () => {
  return {
    appInfo,
    recipeList: [
      EmailPassword.init({
        getRedirectionURL: async (context) => {
            if (context.action === "SUCCESS") {
                if (context.redirectToPath !== undefined) {
                    // we are navigating back to where the user was before they authenticated
                    return context.redirectToPath;
                }
                return "/dashboard";
            }
            return undefined;
        }
    }),
      EmailVerification.init({
        mode: "REQUIRED", // or "OPTIONAL"
      }),
      SessionReact.init(),
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