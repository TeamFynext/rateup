"use client";

import React from "react";

import SuperTokensReact, { SuperTokensWrapper } from "supertokens-auth-react";

import { frontendConfig } from "../../config/frontend.tsx";

if (globalThis.window !== undefined) {
  // we only want to call this init function on the frontend, so we check typeof window !== 'undefined'
  SuperTokensReact.init(frontendConfig());
}

export const SuperTokensProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  return <SuperTokensWrapper>{children}</SuperTokensWrapper>;
};
