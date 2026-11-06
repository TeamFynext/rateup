import { IconPlugConnected } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { useStartOAuthConnect } from "@/backend/appsIntegration/integration.query";
import { Button } from "@/components/ui/button.tsx";

/**
 * "Connect with …" for any provider that connects through a consent screen. The API builds
 * the authorize URL, with a signed state tying the round-trip to this org, and the provider
 * returns to the shared callback page (`OAuthCallback`), which finishes the connect.
 *
 * Stays in its loading state after the URL arrives: the page is about to leave, and a button
 * that springs back to idle for that moment invites a second click.
 */
export function OAuthConnectButton({
  integration,
  label,
  disabled = false,
}: Readonly<{
  /** The provider name — the `$id` of its integration page. */
  integration: string;
  label?: string;
  disabled?: boolean;
}>) {
  const { t } = useTranslation();
  const start = useStartOAuthConnect(integration);

  return (
    <Button
      onClick={() => start.mutate()}
      disabled={disabled}
      loading={start.isPending || start.isSuccess}
    >
      <IconPlugConnected data-icon="inline-start" />
      {label ?? t("Connect")}
    </Button>
  );
}
