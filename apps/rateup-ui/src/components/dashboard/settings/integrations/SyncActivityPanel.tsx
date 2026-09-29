import {
  IconAlertTriangle,
  IconArrowDownLeft,
  IconPlugConnectedX,
  IconRefresh,
  type Icon,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import type { IntegrationActivityEntry } from "@/backend/appsIntegration/integration.api";
import { useIntegrationActivity } from "@/backend/appsIntegration/integration.query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils";
import { usePipelineStore } from "@/store/pipeline.store.ts";
import { formatIsoDateStringWithTime, formatToRelativeTime } from "@/utils/dateTime.ts";

interface Described {
  icon: Icon;
  /** Warm for the entries someone has to act on; neutral chrome for the rest. */
  attention: boolean;
  title: string;
  detail?: string;
}

/**
 * One entry as a sentence about the lead. Mirrors the lead timeline's wording
 * (`LeadDetailModal`), told from the integration's side: here the lead is the variable and
 * the CRM is fixed.
 */
function describe(t: TFunction, entry: IntegrationActivityEntry): Described {
  const details = entry.details ?? {};
  const crm = details.integrationName ?? t("the CRM");

  switch (entry.type) {
    case "INTEGRATION_SYNCED":
      if (details.statusRejected) {
        return {
          icon: IconAlertTriangle,
          attention: true,
          title: t("Synced to {crm}, but not the stage", { crm }),
          detail: t("{crm} would not accept the stage. Check the stage mapping.", { crm }),
        };
      }
      return {
        icon: IconRefresh,
        attention: false,
        title: details.externalCreated
          ? t("Added to {crm}", { crm })
          : t("Updated in {crm}", { crm }),
        detail: details.toStageName
          ? t("Synced as {stage}.", { stage: details.toStageName })
          : undefined,
      };
    case "INTEGRATION_SKIPPED":
      return {
        icon: IconPlugConnectedX,
        attention: true,
        title: t("Not sent to {crm}", { crm }),
        detail:
          details.skipReason === "NO_PHONE"
            ? t("{crm} needs a phone number, and this lead has none.", { crm })
            : details.skipReason === "NOT_CONFIGURED"
              ? t("{crm} is connected but not finished setting up.", { crm })
              : undefined,
      };
    case "INTEGRATION_RECEIVED":
      return {
        icon: IconArrowDownLeft,
        attention: false,
        title: details.inboundCreated
          ? t("Opened from {crm}", { crm })
          : t("Moved by {crm}", { crm }),
        detail: details.statusName
          ? t("{crm} status: {status}.", { crm, status: details.statusName })
          : undefined,
      };
    default:
      // A type this build does not know yet; the raw type beats a blank row.
      return { icon: IconRefresh, attention: false, title: entry.type };
  }
}

/**
 * The integration's recent syncs and whether it is healthy, on its settings page. Answers
 * the question an admin opens an integration page with — "is it working?" — without a trip
 * through individual leads.
 *
 * The health line comes from the integration's failure counter, which only moves when a
 * job's last retry fails, so a warning here is a sync that was actually lost.
 */
export function SyncActivityPanel({ integration }: Readonly<{ integration: string }>) {
  const { t } = useTranslation();
  const patchPipeline = usePipelineStore((state) => state.patch);
  const { data, isPending, isFetching, refetch } = useIntegrationActivity(integration);

  const health = data?.health;
  const failing = (health?.consecutiveFailures ?? 0) > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Sync activity")}</CardTitle>
        <CardDescription>{t("What reached your leads in the last 30 days.")}</CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("Refresh")}
            loading={isFetching}
            onClick={() => refetch()}
          >
            <IconRefresh className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {failing && health && (
          <Alert variant="destructive">
            <IconAlertTriangle />
            <AlertTitle>
              {t("{count, plural, one {The last sync failed} other {The last # syncs failed}}", {
                count: health.consecutiveFailures,
              })}
            </AlertTitle>
            <AlertDescription>
              {health.lastErrorAt && (
                <span>
                  {t("Most recently {time}.", {
                    time: formatToRelativeTime(health.lastErrorAt),
                  })}{" "}
                </span>
              )}
              {health.lastError && (
                <code className="mt-1 block truncate font-mono text-xs" title={health.lastError}>
                  {health.lastError}
                </code>
              )}
            </AlertDescription>
          </Alert>
        )}

        {isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={`activity-skeleton-${index}`} className="h-10 w-full" />
            ))}
          </div>
        ) : !data?.entries.length ? (
          <p className="text-sm text-muted-foreground">
            {t("Nothing synced in the last 30 days.")}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.entries.map((entry) => {
              const described = describe(t, entry);
              const EntryIcon = described.icon;
              return (
                <li key={entry.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                      described.attention
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <EntryIcon className="size-3.5" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="text-sm">
                      {/* A link, not a button: the panel sits inside the page's read-only
                          fieldset, which disables buttons, and viewing a lead is a read. */}
                      <Link
                        to="/dashboard/pipeline"
                        search={{ p: entry.lead.pipelineId }}
                        // The board keeps its open lead in the store, not the URL.
                        onClick={() => patchPipeline({ leadId: entry.lead.id })}
                        className="font-medium underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
                      >
                        {entry.lead.name}
                      </Link>
                      <span className="text-muted-foreground"> · {described.title}</span>
                    </p>
                    {described.detail && (
                      <p className="text-xs text-muted-foreground">{described.detail}</p>
                    )}
                  </div>
                  <time
                    dateTime={entry.createdAt}
                    title={formatIsoDateStringWithTime(entry.createdAt) ?? undefined}
                    className="shrink-0 text-xs text-muted-foreground"
                  >
                    {formatToRelativeTime(entry.createdAt)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
