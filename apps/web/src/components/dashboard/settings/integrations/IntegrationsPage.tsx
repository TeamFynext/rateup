import { IconPlug, IconPlus, IconSearch } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";
import { cn } from "@/lib/utils";

import { IntegrationPlate } from "./IntegrationPlate.tsx";
import {
  ALL_INTEGRATIONS,
  categoryLabel,
  INTEGRATION_CATEGORIES,
  type IntegrationConfig,
} from "./integrations.config.ts";

/**
 * One integration, as a card. The whole card is the hit area, but the only control is the
 * button, stretched over it with `after:inset-0` so it stays reachable by keyboard.
 */
function IntegrationCard({
  config,
  connected,
  failing = false,
  action,
  onOpen,
}: Readonly<{
  config: IntegrationConfig;
  connected: boolean;
  /** Connected, but syncs have been failing since the last one that worked. */
  failing?: boolean;
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
          <p
            className={cn(
              "flex items-center gap-1.5 text-xs",
              failing ? "text-amber-700 dark:text-amber-500" : "text-muted-foreground",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                !connected
                  ? "bg-muted-foreground/40"
                  : failing
                    ? "bg-amber-500"
                    : "bg-green-600 dark:bg-green-500",
              )}
            />
            {!connected ? t("Not connected") : failing ? t("Needs attention") : t("Connected")}
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

/** Whether a catalogue entry matches what was typed into the picker's search. */
function matches(config: IntegrationConfig, category: string, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [config.name, config.description, category, ...(config.keywords ?? [])].some((text) =>
    text.toLowerCase().includes(needle),
  );
}

/**
 * The picker behind "Add integration": everything external that is not connected yet,
 * grouped by what it is for and searchable, since that is how an admin looks for one — "our
 * CRM", "the store" — more often than by the vendor's name.
 */
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
  const [query, setQuery] = useState("");

  const groups = useMemo(
    () =>
      INTEGRATION_CATEGORIES.map((category) => {
        const label = categoryLabel(t, category);
        return {
          category,
          label,
          items: available.filter(
            (config) => config.category === category && matches(config, label, query),
          ),
        };
      }).filter((group) => group.items.length > 0),
    [available, query, t],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery("");
      }}
    >
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
          <div className="flex flex-col gap-4">
            <InputGroup>
              <InputGroupAddon>
                <IconSearch />
              </InputGroupAddon>
              <InputGroupInput
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("Search by name or what it does")}
                aria-label={t("Search integrations")}
              />
            </InputGroup>

            <div className="flex max-h-[55vh] flex-col gap-5 overflow-y-auto pr-1">
              {groups.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t("No integration matches “{query}”.", { query: query.trim() })}
                </p>
              )}

              {groups.map((group) => (
                <section key={group.category} className="flex flex-col gap-2">
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {group.label}
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {group.items.map((config) => (
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
                </section>
              ))}
            </div>
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
  const permissions = usePermissions();
  // Connecting is a manage action; anyone who can read may still open what is connected.
  const canManage = permissions.isPending || permissions.can("integrations.manage");

  const statusOf = (integrationId: string) =>
    integrationStatuses.find((s) => s.name === integrationId);

  const isConnected = (integrationId: string): boolean => {
    if (integrationId === "webhook") return Boolean(webhook?.url);
    return Boolean(statusOf(integrationId)?.isConnected);
  };

  const openIntegration = (id: string) => {
    navigate({ to: `/dashboard/settings/integrations/${id}` });
  };

  const internal = ALL_INTEGRATIONS.filter((config) => config.scope === "internal");
  const external = ALL_INTEGRATIONS.filter((config) => config.scope === "external");
  // External lists what this org uses, not a catalogue; the rest sits behind "Add integration".
  const connectedExternal = external.filter((config) => isConnected(config.id));
  const availableExternal = external.filter((config) => !isConnected(config.id));

  const addButton = canManage ? (
    <Button onClick={() => setIsPickerOpen(true)}>
      <IconPlus className="size-4" />
      {t("Add integration")}
    </Button>
  ) : null;

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
                  {canManage
                    ? t(
                        "Connect a store, a CRM or a spreadsheet to move data in and out of RateUp.",
                      )
                    : t("Ask an admin to connect a store, a CRM or a spreadsheet.")}
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
                failing={(statusOf(config.id)?.consecutiveFailures ?? 0) > 0}
                action={canManage ? t("Manage") : t("View")}
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
