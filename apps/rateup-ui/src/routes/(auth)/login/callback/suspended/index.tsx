import { IconLogout } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMediaQuery } from "@/hooks/use-media-query.ts";
import { rateupIconBw } from "@/utils/constants";

export const Route = createFileRoute("/(auth)/login/callback/suspended/")({
  component: SuspendedPage,
});

/**
 * Where the app lands when the API answers ORG_SUSPENDED: RateUp staff have suspended the
 * whole organisation (src/backend/apiClient.ts sends every such response here). Unlike a
 * paused user, nobody in the org can do anything, so there is no admin to ask — only
 * support. The reason staff recorded is internal and deliberately not shown.
 */
function SuspendedPage() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 480px)");

  return (
    <div className="flex h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <img
            src={rateupIconBw}
            alt="Logo"
            className="object-contain"
            style={{ width: isMobile ? 70 : 80, height: isMobile ? 70 : 80 }}
          />
          <p className="text-xl font-semibold text-muted-foreground">This account is suspended</p>
          <p className="text-muted-foreground">
            Sign-in, messaging and the API are switched off for your organisation. Please contact
            RateUp support to restore it.
          </p>
          <a
            href="mailto:hello@rateup.app"
            className="text-primary underline-offset-4 hover:underline"
          >
            hello@rateup.app
          </a>
          <Button onClick={() => navigate({ to: "/logout" })}>
            <IconLogout />
            Logout
          </Button>
        </div>
      </Card>
    </div>
  );
}
