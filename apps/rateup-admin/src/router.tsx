import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

import { meQueryOptions } from "./api/auth.query";
import { setUnauthorizedHandler } from "./api/client";
import { routeTree } from "./routeTree.gen";

/**
 * Called once in the browser and once per request on the server (which only renders the
 * `<html>` shell, see `start.ts`), so every server request gets its own QueryClient.
 */
export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    // Loaders read through React Query, so the router's own cache would only double it.
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  });

  if (typeof window !== "undefined") {
    // A 401 mid-session means the staff session expired or was revoked: forget it and go sign in.
    setUnauthorizedHandler(() => {
      queryClient.removeQueries({ queryKey: meQueryOptions.queryKey });
      const { pathname, href } = router.state.location;
      if (pathname === "/login") return;
      void router.navigate({ to: "/login", search: { returnTo: href } });
    });
  }

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
