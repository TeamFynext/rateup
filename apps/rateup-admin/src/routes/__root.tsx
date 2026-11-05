import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { THEME_INIT_SCRIPT, ThemeProvider } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getApiErrorMessage } from "@/lib/apiError";

import appCss from "../styles/app.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { name: "robots", content: "noindex, nofollow" },
      { title: "RateUp Admin" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // The RateUp star. SVG for the tab, PNG for the browsers and phones that want a bitmap.
      { rel: "icon", type: "image/svg+xml", href: "/rateup-star.svg" },
      { rel: "icon", type: "image/png", sizes: "256x256", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
    ],
    scripts: [{ children: THEME_INIT_SCRIPT }],
  }),
  shellComponent: RootShell,
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

/** The `<html>` document. The only part rendered on the server; everything inside renders in the browser. */
function RootShell({ children }: { children: React.ReactNode }) {
  return (
    // The theme script adds `light`/`dark` to <html> before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Written here, not in `head()`: it de-duplicates meta by name, so one would be dropped. */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#141416" />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootLayout() {
  const { queryClient } = Route.useRouteContext();
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Outlet />
          <Toaster position="top-right" />
        </TooltipProvider>
        {import.meta.env.DEV && (
          <>
            <TanStackRouterDevtools position="bottom-right" />
            <ReactQueryDevtools buttonPosition="bottom-left" />
          </>
        )}
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function CenteredMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-[60svh] flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-display text-xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}

function NotFound() {
  return (
    <CenteredMessage title="Page not found">
      <Button variant="outline" render={<Link to="/" />}>
        Back to overview
      </Button>
    </CenteredMessage>
  );
}

function RootError({ error, reset }: ErrorComponentProps) {
  return (
    <CenteredMessage title="Something went wrong">
      <p className="max-w-md text-sm text-muted-foreground">{getApiErrorMessage(error)}</p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </CenteredMessage>
  );
}
