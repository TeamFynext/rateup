import { IconLogout } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMediaQuery } from "@/hooks/use-media-query.ts";

export const Route = createFileRoute("/(auth)/login/callback/paused/")({
  /** Declares the search params this route reads, so links to it type-check. */
  validateSearch: (search: Record<string, unknown>): { pausedby?: string } => ({
    pausedby: typeof search.pausedby === "string" ? search.pausedby : undefined,
  }),
  component: PausedPage,
});

function PausedPage() {
  const navigate = useNavigate();
  const searchParams = Route.useSearch();
  const pausedby = searchParams.pausedby;
  const isMobile = useMediaQuery("(max-width: 480px)");

  return (
    <div className="flex h-screen items-center justify-center">
      <Card className="p-8 w-fit">
        <div className="flex flex-col items-center gap-4">
          <img
            src={`${import.meta.env.VITE_FRONTEND_URL}/images/bw-logo.png`}
            alt="Logo"
            className="object-contain"
            style={{ width: isMobile ? 70 : 80, height: isMobile ? 70 : 80 }}
          />
          <p className="text-xl font-semibold text-muted-foreground">Your account is Paused !</p>
          {getPausedText(pausedby)}
          <Button
            onClick={() =>
              navigate({
                to: "/logout",
              })
            }
          >
            <IconLogout />
            Logout
          </Button>
        </div>
      </Card>
    </div>
  );
}

function getPausedText(pausedby: string | undefined) {
  switch (pausedby) {
    case "org":
      return (
        <div className="flex flex-col items-center gap-2">
          <p className="text-muted-foreground">
            Kindly contact your organization Super Admin for details.
          </p>
        </div>
      );
    case "rateup":
      return (
        <div className="flex flex-col items-center gap-2">
          <p className="text-muted-foreground">Kindly contact Rateup Support for details.</p>
          <a className="text-primary underline-offset-4 hover:underline">Mail: hello@rateup.app</a>
        </div>
      );
  }
}
