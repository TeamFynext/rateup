
import SessionNode from 'supertokens-node/recipe/session'
import { appInfo } from './appInfo'
import { TypeInput } from "supertokens-node/types";

export const backendConfig = (): TypeInput => {
  return {
    framework: "express",
    supertokens: {
      // These are the connection details of the app you created on supertokens.com
      connectionURI: process.env.SUPERTOKEN_URI,
      apiKey: process.env.SUPERTOKEN_KEY,
    },
    appInfo,
    recipeList: [
      SessionNode.init(),
    ],
    isInServerlessEnv: false,
  }
}
