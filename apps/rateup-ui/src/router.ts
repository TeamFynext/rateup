// import * as Sentry from "@sentry/tanstackstart-react";
import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";
import "./i18n.ts";

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
  } as unknown as any);

  // if (!router.isServer) {
  //   Sentry.init({
  //     dsn: import.meta.env.VITE_SENTRY_DSN,
  //     // Adds request headers and IP for users, for more info visit:
  //     // https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/configuration/options/#sendDefaultPii
  //     sendDefaultPii: true,
  //     integrations: [],
  //   });
  // }

  return router;
}
