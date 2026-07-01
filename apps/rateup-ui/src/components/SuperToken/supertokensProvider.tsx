import React from "react";
import SuperTokens, { SuperTokensWrapper } from "supertokens-auth-react";

import { SuperTokensConfig } from "@/config/frontend";

if (globalThis.window !== undefined) {
  SuperTokens.init(SuperTokensConfig);
}

export const SuperTokensProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  return <SuperTokensWrapper>{children}</SuperTokensWrapper>;
};
