import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  Link,
  Outlet,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/apiError";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

function RootLayout() {
  return (
    <>
      <Outlet />
      {import.meta.env.DEV && (
        <>
          <TanStackRouterDevtools position="bottom-right" />
          <ReactQueryDevtools buttonPosition="bottom-left" />
        </>
      )}
    </>
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
