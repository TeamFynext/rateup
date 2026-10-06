import { IconAlertTriangle, IconCreditCard, IconRefresh } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import type { WaPaymentConfiguration } from "@/backend/appsIntegration/integration.api";
import {
  useRegenerateWaPaymentConfigurationOauthMutation,
  useWaPaymentConfigurations,
} from "@/backend/appsIntegration/integration.query";
import { INTEGRATIONS_CONFIG } from "@/components/dashboard/settings/integrations/integrations.config.ts";
import { IntegrationShell } from "@/components/dashboard/settings/integrations/IntegrationShell.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { getApiErrorMessage } from "@/utils/apiError";

/**
 * The payment gateways linked to the default WhatsApp number's business account
 * in WhatsApp Manager. Opening the page syncs them from Meta; RateUp only lists
 * them and hands out the verification link a new gateway needs.
 */
export function WhatsappPayment() {
  const { t } = useTranslation();
  const { data, error, isPending, isFetching, refetch } = useWaPaymentConfigurations();
  const regenerate = useRegenerateWaPaymentConfigurationOauthMutation();

  const config = INTEGRATIONS_CONFIG.waPayment;
  const configurations = data?.configurations ?? [];

  return (
    <IntegrationShell
      icon={config.icon}
      name={config.name}
      connected={configurations.length > 0}
      detail={
        configurations.length > 0
          ? t("{count, plural, one {# configuration} other {# configurations}}", {
              count: configurations.length,
            })
          : undefined
      }
      action={
        <Button variant="outline" loading={isFetching} onClick={() => refetch()}>
          <IconRefresh data-icon="inline-start" />
          {t("Fetch from WhatsApp")}
        </Button>
      }
    >
      {data?.phone ? (
        <p className="text-sm text-muted-foreground">
          {t(
            "Payment gateways linked to {phone} in WhatsApp Manager. Order messages use the first one.",
            { phone: data.phone },
          )}
        </p>
      ) : null}

      {data?.syncError ? (
        <Alert variant="destructive">
          <IconAlertTriangle />
          <AlertTitle>{t("Showing the last saved list")}</AlertTitle>
          <AlertDescription>{data.syncError}</AlertDescription>
        </Alert>
      ) : null}

      {error && !data ? (
        <Alert variant="destructive">
          <IconAlertTriangle />
          <AlertTitle>{t("Could not load payment configurations")}</AlertTitle>
          <AlertDescription>
            {getApiErrorMessage(error, t("Something went wrong"))}
          </AlertDescription>
        </Alert>
      ) : isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : configurations.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconCreditCard />
            </EmptyMedia>
            <EmptyTitle>{t("No payment configurations yet")}</EmptyTitle>
            <EmptyDescription>
              {t("Set one up in WhatsApp Manager, then fetch it here.")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {configurations.map((configuration) => (
            <WhatsappPaymentCard
              key={configuration.configuration_name}
              configuration={configuration}
              regenerating={
                regenerate.isPending && regenerate.variables === configuration.configuration_name
              }
              onRegenerate={() => regenerate.mutate(configuration.configuration_name)}
            />
          ))}
        </div>
      )}
    </IntegrationShell>
  );
}

function WhatsappPaymentCard({
  configuration,
  regenerating,
  onRegenerate,
}: Readonly<{
  configuration: WaPaymentConfiguration;
  regenerating: boolean;
  onRegenerate: () => void;
}>) {
  const { t } = useTranslation();
  const needsConnecting = configuration.status === "Needs Connecting";
  const linkUsable =
    Boolean(configuration.oauth_url) &&
    Boolean(configuration.expiration) &&
    dayjs.unix(configuration.expiration ?? 0).isAfter(dayjs());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="truncate">{configuration.configuration_name}</CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col justify-between gap-3">
        <div className="text-sm">
          <p>
            {t("MCC")}: {configuration.merchant_category_code?.description ?? "—"}
          </p>
          <p>
            {t("Purpose code")}: {configuration.purpose_code?.description ?? "—"}
          </p>
        </div>
        {needsConnecting ? (
          <div className="flex items-center gap-2">
            {linkUsable ? (
              <Button
                size="sm"
                nativeButton={false}
                render={
                  <a href={configuration.oauth_url} target="_blank" rel="noopener noreferrer" />
                }
              >
                {t("Verify")}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" loading={regenerating} onClick={onRegenerate}>
                <IconRefresh data-icon="inline-start" />
                {t("Get verification link")}
              </Button>
            )}
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{configuration.provider_name ?? "razorpay"}</Badge>
          {configuration.status ? <Badge variant="outline">{configuration.status}</Badge> : null}
        </div>
      </CardContent>
    </Card>
  );
}
