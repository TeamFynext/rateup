import { createRouter } from "@tanstack/react-router";

import ErrorPage from "./components/error.tsx";
import RoutePending from "./components/Loaders/RoutePending.tsx";
import NotFoundPage from "./components/not-found.tsx";
import { routeTree } from "./routeTree.gen";
import "./i18n.ts";

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    // Every route inherits recovery and loading UI, so a route that throws or awaits a loader
    // is contained at its own boundary instead of blanking the shell up to the root.
    defaultErrorComponent: ErrorPage,
    defaultNotFoundComponent: NotFoundPage,
    defaultPendingComponent: RoutePending,
  } as unknown as any);

  return router;
}
