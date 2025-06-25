import SuperTokens from "supertokens-node";
import EmailPasswordNode from "supertokens-node/recipe/emailpassword";
import SessionNode from "supertokens-node/recipe/session";
import { TypeInput } from "supertokens-node/types";

import { appInfo } from "./appInfo";

export const backendConfig = (): TypeInput => {
  return {
    supertokens: {
      connectionURI: process.env.SUPERTOKEN_URI,
      apiKey: process.env.SUPERTOKEN_KEY,
    },
    appInfo,
    // use from SuperTokens. See the full list here: https://supertokens.com/docs/guides
    recipeList: [EmailPasswordNode.init(), SessionNode.init()],
    isInServerlessEnv: true,
    framework: "fastify",
  };
};

let initialized = false;
export function ensureSuperTokensInit() {
  if (!initialized) {
    SuperTokens.init(backendConfig());
    initialized = true;
  }
}
