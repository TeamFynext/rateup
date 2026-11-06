import { IconPlugOff } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useFinishOAuthConnect } from "@/backend/appsIntegration/integration.query";
import { Spinner } from "@/components/ui/spinner.tsx";

import { IntegrationPlate } from "../IntegrationPlate.tsx";
import { INTEGRATIONS_CONFIG } from "../integrations.config.ts";

/**
 * Where every OAuth provider sends the user back: `/dashboard/settings/integrations/$id/callback`.
 *
 * Posts the code and the state to the API with the user's session — the API checks the
 * state was signed for this org and this provider before it exchanges anything — then
 * returns to the integration's page either way, with a toast saying how it went.
 */
export function OAuthCallback({ integration }: Readonly<{ integration: string }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const finish = useFinishOAuthConnect(integration);
  // A code is single-use. React's development double-mount would otherwise spend it on the
  // first run and fail the second.
  const started = useRef(false);

  const config = INTEGRATIONS_CONFIG[integration];
  const name = config?.name ?? integration;

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const back = () =>
      navigate({
        to: "/dashboard/settings/integrations/$id",
        params: { id: integration },
        replace: true,
      });

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    // The user pressed "Deny", or the provider refused the request outright.
    if (params.get("error") || !code || !state) {
      toast.error(t("{name} was not connected.", { name }));
      back();
      return;
    }

    finish.mutate(
      { code, state },
      {
        onSuccess: () => {
          toast.success(t("{name} is connected.", { name }));
          back();
        },
        onError: (error) => {
          // A refusal the user can act on (an account already connected elsewhere) arrives as
          // a 4xx with its own message; anything else is ours, and says so generically.
          const response = (error as { response?: { status?: number; data?: { error?: string } } })
            ?.response;
          const reason =
            response?.status && response.status < 500 ? response.data?.error : undefined;
          toast.error(
            reason ?? t("Could not connect {name}. Try again from its settings page.", { name }),
          );
          back();
        },
      },
    );
  }, []);

  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 text-center">
      <IntegrationPlate icon={config?.icon ?? IconPlugOff} />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        {t("Connecting {name}…", { name })}
      </div>
    </div>
  );
}
