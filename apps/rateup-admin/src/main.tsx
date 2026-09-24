import "./styles/app.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { meQueryOptions } from "./api/auth.query";
import { setUnauthorizedHandler } from "./api/client";
import { queryClient, router } from "./router";

// A 401 mid-session means the staff session expired or was revoked: forget it and go sign in.
setUnauthorizedHandler(() => {
  queryClient.removeQueries({ queryKey: meQueryOptions.queryKey });
  const { pathname, href } = router.state.location;
  if (pathname === "/login") return;
  void router.navigate({ to: "/login", search: { returnTo: href } });
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root element missing from index.html");

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
