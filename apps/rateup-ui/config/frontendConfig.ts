import Session from 'supertokens-web-js/recipe/session';
import { appInfo } from './appInfo'
import Router from 'next/router'
import ThirdPartyEmailPassword from 'supertokens-web-js/recipe/thirdpartyemailpassword'
import EmailVerification from "supertokens-web-js/recipe/emailverification";

export const frontendConfig = () => {
  return {
    enableDebugLogs: true,
    appInfo,
    recipeList: [
      Session.init(),
      ThirdPartyEmailPassword.init(),
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