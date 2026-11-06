import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleDashed,
  IconExternalLink,
  IconPlugConnected,
  IconTrash,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useDeleteIntegrationMutation } from "@/backend/appsIntegration/integration.query";
import type {
  WooCheckoutOptIn,
  WooTopic,
} from "@/backend/appsIntegration/woocommerce/woocommerce.api";
import {
  useRepairWooWebhooks,
  useStartWooConnect,
  useUpdateWooSettings,
  useWooStatus,
} from "@/backend/appsIntegration/woocommerce/woocommerce.query";
import { IntegrationFormCard } from "@/components/dashboard/settings/integrations/IntegrationFormCard.tsx";
import { INTEGRATIONS_CONFIG } from "@/components/dashboard/settings/integrations/integrations.config.ts";
import { IntegrationShell } from "@/components/dashboard/settings/integrations/IntegrationShell.tsx";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { IntegratedApps } from "@/types/enums.ts";
import { formatIsoDateStringWithTime } from "@/utils/dateTime.ts";

import { WooPluginInstall } from "./WooPluginInstall.tsx";
import { WooWidget } from "./WooWidget.tsx";

/** Literal `t()` calls, so the extractor sees each label. */
function topicLabel(t: TFunction, topic: WooTopic) {
  switch (topic) {
    case "order.created":
      return t("New orders");
    case "order.updated":
      return t("Order status changes");
    case "customer.created":
      return t("New customers");
    case "product.updated":
      return t("Product changes");
  }
}

/**
 * WooCommerce's answer when it sends the admin back: `success=1` once it has delivered the
 * key to our API, `success=0` when the admin declined or the delivery failed. Said once, and
 * taken off the URL so a reload does not say it again.
 */
function useConnectResult() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const result = new URLSearchParams(window.location.search).get("success");
    if (result === null) return;

    if (result === "1") toast.success(t("WooCommerce is connected."));
    else toast.error(t("WooCommerce was not connected. Try again, and approve RateUp when asked."));

    navigate({
      to: "/dashboard/settings/integrations/$id",
      params: { id: IntegratedApps.woocommerce },
      replace: true,
    });
  }, []);
}

/**
 * The address the RateUp plugin's "Connect to RateUp" button sends along (`?store=`), so the
 * admin arriving from WordPress only has to click Connect. Only ever pre-fills: starting the
 * connection still takes that click, so a link alone cannot begin one.
 */
function storeFromLink() {
  return new URLSearchParams(window.location.search).get("store")?.trim() ?? "";
}

function ConnectCard() {
  const { t } = useTranslation();
  const [storeUrl, setStoreUrl] = useState(storeFromLink);
  const start = useStartWooConnect();

  return (
    <IntegrationFormCard
      title={t("Connect your store")}
      description={t(
        "You will be taken to your WordPress admin to approve RateUp, then brought back here.",
      )}
      onSubmit={(event) => {
        event.preventDefault();
        if (storeUrl.trim()) start.mutate(storeUrl.trim());
      }}
      actions={
        <Button
          type="submit"
          loading={start.isPending || start.isSuccess}
          disabled={!storeUrl.trim()}
        >
          <IconPlugConnected data-icon="inline-start" />
          {t("Connect")}
        </Button>
      }
    >
      <Field>
        <FieldLabel htmlFor="woo-store-url">{t("Store address")}</FieldLabel>
        <Input
          id="woo-store-url"
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="https://yourstore.com"
          value={storeUrl}
          onChange={(event) => setStoreUrl(event.target.value)}
        />
        <FieldDescription>
          {t("The address your customers shop at. It must use HTTPS.")}
        </FieldDescription>
      </Field>
    </IntegrationFormCard>
  );
}

/**
 * The WhatsApp opt-in box the RateUp plugin adds to the store's checkout. A tick is marketing
 * consent; order updates go out either way. The switch saves at once, the wording on Save.
 */
function CheckoutOptInCard({
  optIn,
  pluginMissing,
  storeUrl,
}: {
  optIn: WooCheckoutOptIn;
  pluginMissing: boolean;
  storeUrl: string;
}) {
  const { t } = useTranslation();
  const settings = useUpdateWooSettings();
  const [label, setLabel] = useState(optIn.label);
  const trimmed = label.trim();

  const save = (next: WooCheckoutOptIn) =>
    settings.mutate(
      { checkoutOptIn: next },
      { onSuccess: () => toast.success(t("Saved"), { id: "woo-settings" }) },
    );

  return (
    <IntegrationFormCard
      title={t("WhatsApp opt-in at checkout")}
      description={t(
        "Adds an unticked box to your checkout. Shoppers who tick it agree to get offers on WhatsApp; order updates are sent either way.",
      )}
      onSubmit={(event) => {
        event.preventDefault();
        if (trimmed) save({ ...optIn, label: trimmed });
      }}
      actions={
        <Button
          type="submit"
          variant="outline"
          loading={settings.isPending}
          disabled={!trimmed || trimmed === optIn.label}
        >
          {t("Save")}
        </Button>
      }
    >
      {pluginMissing && (
        <Alert>
          <IconAlertTriangle />
          <AlertTitle>{t("Install the RateUp plugin")}</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>
              {t(
                "The box is shown by the RateUp for WooCommerce plugin, which your store doesn't have yet.",
              )}
            </p>
            <WooPluginInstall storeUrl={storeUrl} />
          </AlertDescription>
        </Alert>
      )}
      <Field orientation="horizontal" className="rounded-lg border border-border p-3">
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor="woo-checkout-optin" className="text-sm font-medium">
            {t("Show the box at checkout")}
          </FieldLabel>
          <FieldDescription className="text-xs">
            {t(
              "Ticked: the contact's consent is turned on. Unticked: a new contact starts with consent off, and an existing one keeps theirs.",
            )}
          </FieldDescription>
        </div>
        <Switch
          id="woo-checkout-optin"
          checked={optIn.enabled}
          disabled={settings.isPending || !trimmed}
          onCheckedChange={(on) => save({ enabled: on, label: trimmed })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="woo-checkout-optin-label">{t("Text beside the box")}</FieldLabel>
        <Input
          id="woo-checkout-optin-label"
          maxLength={200}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </Field>
    </IntegrationFormCard>
  );
}

export function WooCommerce() {
  const { t } = useTranslation();
  const { data: status, isPending } = useWooStatus();
  const repair = useRepairWooWebhooks();
  const settings = useUpdateWooSettings();
  const disconnect = useDeleteIntegrationMutation(IntegratedApps.woocommerce);
  useConnectResult();

  const config = INTEGRATIONS_CONFIG.woocommerce;
  const connected = status?.connected === true;

  if (isPending) {
    return (
      <IntegrationShell icon={config.icon} name={config.name}>
        <Skeleton className="h-48 rounded-xl" />
      </IntegrationShell>
    );
  }

  if (!status?.connected) {
    return (
      <IntegrationShell icon={config.icon} name={config.name} connected={false}>
        <ConnectCard />
      </IntegrationShell>
    );
  }

  const host = new URL(status.storeUrl).host;
  const missing = status.webhooks.filter((webhook) => !webhook.registered);

  return (
    <IntegrationShell
      icon={config.icon}
      name={config.name}
      connected={connected}
      detail={status.store.name ? `${status.store.name} · ${host}` : host}
    >
      <Tabs defaultValue="connection" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="connection">{t("Connection")}</TabsTrigger>
          <TabsTrigger value="widget">{t("WhatsApp widget")}</TabsTrigger>
        </TabsList>
        <TabsContent value="widget">
          <WooWidget />
        </TabsContent>
        <TabsContent value="connection" className="flex flex-col gap-6">
          {missing.length > 0 && (
            <Alert variant="destructive">
              <IconAlertTriangle />
              <AlertTitle>
                {t(
                  "{count, plural, one {One webhook is not registered} other {# webhooks are not registered}}",
                  { count: missing.length },
                )}
              </AlertTitle>
              <AlertDescription>
                {t("Until it is, RateUp does not hear about those changes in your store.")}
              </AlertDescription>
              <AlertAction>
                <Button
                  size="sm"
                  variant="outline"
                  loading={repair.isPending}
                  onClick={() => repair.mutate()}
                >
                  {t("Register again")}
                </Button>
              </AlertAction>
            </Alert>
          )}

          {missing.length === 0 && status.health.consecutiveFailures > 0 && (
            <Alert variant="destructive">
              <IconAlertTriangle />
              <AlertTitle>{t("Recent store updates failed to process")}</AlertTitle>
              {status.health.lastError && (
                <AlertDescription>
                  <code
                    className="block truncate font-mono text-xs"
                    title={status.health.lastError}
                  >
                    {status.health.lastError}
                  </code>
                </AlertDescription>
              )}
            </Alert>
          )}

          <IntegrationFormCard
            title={t("Connection")}
            description={
              status.keyId
                ? t(
                    "To revoke RateUp's access from the store side, delete key #{keyId} under WooCommerce › Settings › Advanced › REST API.",
                    { keyId: status.keyId },
                  )
                : undefined
            }
            actions={
              <Button
                variant="ghost"
                loading={disconnect.isPending}
                onClick={() => disconnect.mutate()}
              >
                <IconTrash data-icon="inline-start" />
                {t("Disconnect")}
              </Button>
            }
          >
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{t("Store")}</dt>
              <dd className="min-w-0">
                <a
                  href={status.storeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 truncate underline-offset-2 hover:underline"
                >
                  {status.storeUrl}
                  <IconExternalLink className="size-3.5 shrink-0" />
                </a>
              </dd>
              {status.store.wcVersion && (
                <>
                  <dt className="text-muted-foreground">{t("WooCommerce version")}</dt>
                  <dd>{status.store.wcVersion}</dd>
                </>
              )}
              {status.store.currency && (
                <>
                  <dt className="text-muted-foreground">{t("Currency")}</dt>
                  <dd>{status.store.currency}</dd>
                </>
              )}
              <dt className="text-muted-foreground">{t("Connected")}</dt>
              <dd>{formatIsoDateStringWithTime(status.connectedAt)}</dd>
            </dl>

            <div className="flex flex-col gap-2 border-t pt-4">
              <p className="text-sm font-medium">{t("What RateUp hears about")}</p>
              <ul className="flex flex-col gap-1.5 text-sm">
                {status.webhooks.map((webhook) => (
                  <li key={webhook.topic} className="flex items-center gap-2">
                    {webhook.registered ? (
                      <IconCircleCheck className="size-4 text-green-600 dark:text-green-500" />
                    ) : (
                      <IconCircleDashed className="size-4 text-muted-foreground" />
                    )}
                    <span className={webhook.registered ? undefined : "text-muted-foreground"}>
                      {topicLabel(t, webhook.topic)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </IntegrationFormCard>

          <IntegrationFormCard title={t("Customers")}>
            <Field orientation="horizontal" className="rounded-lg border border-border p-3">
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="woo-sync-customers" className="text-sm font-medium">
                  {t("Add new customers as contacts")}
                </FieldLabel>
                <FieldDescription className="text-xs">
                  {t(
                    "Each new WooCommerce customer with a phone number becomes a contact. A number that is already a contact is linked to it, not duplicated. Customers from before this is on are not added.",
                  )}
                </FieldDescription>
              </div>
              <Switch
                id="woo-sync-customers"
                checked={status.settings.syncCustomers}
                disabled={settings.isPending}
                onCheckedChange={(on) => settings.mutate({ syncCustomers: on })}
              />
            </Field>
          </IntegrationFormCard>

          {/* Absent from an API older than the opt-in. */}
          {status.settings.checkoutOptIn && (
            <CheckoutOptInCard
              optIn={status.settings.checkoutOptIn}
              pluginMissing={status.plugin?.installed === false}
              storeUrl={status.storeUrl}
            />
          )}
        </TabsContent>
      </Tabs>
    </IntegrationShell>
  );
}
