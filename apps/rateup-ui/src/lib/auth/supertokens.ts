import SuperTokens from "supertokens-auth-react";

import { SuperTokensConfig } from "@/config/frontend";

/* Importing this module is what initialises SuperTokens, which also patches fetch/XHR so API
   calls carry the session. The app layouts load it before their first loader (`loadAppRuntime`);
   anything that calls a recipe outside them imports it itself, so the marketing bundle stays
   free of the SDK. */
if (globalThis.window !== undefined) {
  SuperTokens.init(SuperTokensConfig);
}
