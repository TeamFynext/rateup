import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";
import "./i18n.ts";

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
  } as unknown as any);

  return router;
}
