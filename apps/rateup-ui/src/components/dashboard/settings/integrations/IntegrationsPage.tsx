import { IconPlug, IconPlus } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useIntegrationStatuses } from "@/backend/appsIntegration/integration.query";
import { useWebhook } from "@/backend/webhook/webhook.query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

import { IntegrationPlate } from "./IntegrationPlate.tsx";
import { ALL_INTEGRATIONS, type IntegrationConfig } from "./integrations.config.ts";

/**
 * One integration, as a card. The whole card is the hit area, but the only control is the
 * button, stretched over it with `after:inset-0` so it stays reachable by keyboard.
 */
function IntegrationCard({
  config,
  connected,
  action,
  onOpen,
}: Readonly<{
  config: IntegrationConfig;
  connected: boolean;
  action: string;
  onOpen: () => void;
}>) {
  const { t } = useTranslation();
  const isOwn = config.scope === "internal";

  return (
    <Card size="sm" className="group relative justify-between transition-shadow hover:ring-primary">
      <CardContent className="flex flex-col gap-3">
        <IntegrationPlate icon={config.icon} connected={connected} own={isOwn} size="sm" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-display text-sm font-medium">{config.name}</span>
          <p className="text-xs leading-relaxed text-muted-foreground">{config.description}</p>
        </div>
      </CardContent>
      <CardContent className="flex flex-col gap-3">
        {isOwn ? null : (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              aria-hidden="true"
              className={
                connected
                  ? "size-1.5 shrink-0 rounded-full bg-green-600 dark:bg-green-500"
                  : "size-1.5 shrink-0 rounded-full bg-muted-foreground/40"
              }
            />
            {connected ? t("Connected") : t("Not connected")}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full after:absolute after:inset-0 after:rounded-xl after:content-['']"
          onClick={onOpen}
        >
          {action}
        </Button>
      </CardContent>
    </Card>
  );
}

/** The picker behind "Add integration": everything external that is not connected yet. */
function AddIntegrationDialog({
  open,
  onOpenChange,
  available,
  onPick,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  available: IntegrationConfig[];
  onPick: (id: string) => void;
}>) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("Add an integration")}</DialogTitle>
          <DialogDescription>
            {t("Pick a service to connect. You will be taken to its setup page.")}
          </DialogDescription>
        </DialogHeader>

        {available.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("Everything available is already connected.")}
          </p>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {available.map((config) => (
              <button
                key={config.id}
                type="button"
                onClick={() => onPick(config.id)}
                className="flex items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <IntegrationPlate icon={config.icon} size="sm" />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium">{config.name}</span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {config.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function IntegrationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: webhook } = useWebhook();
  const { data: integrationStatuses = [], isLoading: statusesLoading } = useIntegrationStatuses();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const isConnected = (integrationId: string): boolean => {
    if (integrationId === "webhook") return Boolean(webhook?.url);
    const status = integrationStatuses.find((s: { name?: string }) => s.name === integrationId);
    return Boolean(status?.isConnected);
  };

  const openIntegration = (id: string) => {
    navigate({ to: `/dashboard/settings/integrations/${id}` });
  };

  const internal = ALL_INTEGRATIONS.filter((config) => config.scope === "internal");
  const external = ALL_INTEGRATIONS.filter((config) => config.scope === "external");
  // External lists what this org uses, not a catalogue; the rest sits behind "Add integration".
  const connectedExternal = external.filter((config) => isConnected(config.id));
  const availableExternal = external.filter((config) => !isConnected(config.id));

  const addButton = (
    <Button onClick={() => setIsPickerOpen(true)}>
      <IconPlus className="size-4" />
      {t("Add integration")}
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-265 space-y-8 pb-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display mb-1 text-2xl font-semibold">{t("Integrations")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("Connect RateUp to the tools you already run your business on.")}
          </p>
        </div>
        {addButton}
      </div>

      <section className="space-y-3">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("RateUp services")}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {internal.map((config) => (
            <IntegrationCard
              key={config.id}
              config={config}
              connected
              action={t("Open")}
              onOpen={() => openIntegration(config.id)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("Connected services")}
        </h3>

        {statusesLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={`integration-skeleton-${index}`} className="h-32 rounded-xl" />
            ))}
          </div>
        )}

        {!statusesLoading && connectedExternal.length === 0 && (
          <Card size="sm" className="border border-dashed bg-transparent shadow-none ring-0">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                <IconPlug className="size-5 text-muted-foreground" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium">{t("No external services connected")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("Connect a store, a CRM or a spreadsheet to move data in and out of RateUp.")}
                </p>
              </div>
              {addButton}
            </CardContent>
          </Card>
        )}

        {!statusesLoading && connectedExternal.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {connectedExternal.map((config) => (
              <IntegrationCard
                key={config.id}
                config={config}
                connected
                action={t("Manage")}
                onOpen={() => openIntegration(config.id)}
              />
            ))}
          </div>
        )}
      </section>

      <AddIntegrationDialog
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        available={availableExternal}
        onPick={openIntegration}
      />
    </div>
  );
}
