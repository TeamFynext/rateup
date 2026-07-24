import * as Sentry from "@sentry/tanstackstart-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button.tsx";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

/**
 * App-level error boundary for render errors thrown outside the router's own route boundaries —
 * provider setup, context, and shared shell components. The recovery UI deliberately avoids router
 * hooks, because this boundary also has to survive an error thrown from router context itself.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  resetErrorBoundary = () => {
    this.setState({ error: null });
  };

  handleReload = () => {
    globalThis.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        className="flex h-dvh flex-col items-center justify-center gap-4 p-8 text-center"
      >
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          The page ran into an unexpected problem. You can try again, or reload if the problem keeps
          happening.
        </p>
        <div className="flex items-center gap-2">
          <Button onClick={this.resetErrorBoundary}>Try again</Button>
          <Button variant="outline" onClick={this.handleReload}>
            Reload page
          </Button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
