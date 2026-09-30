import { IconCloudDownload, IconCloudUpload, IconLoader2 } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type {
  HubSpotBulkKind,
  HubSpotBulkRun,
} from "@/backend/appsIntegration/hubspot/hubspot.api";
import { useStartHubSpotBulk } from "@/backend/appsIntegration/hubspot/hubspot.query";
import { IntegrationFormCard } from "@/components/dashboard/settings/integrations/IntegrationFormCard.tsx";
import { Button } from "@/components/ui/button.tsx";
import { formatToRelativeTime } from "@/utils/dateTime.ts";

/**
 * The first-time sync: pulling HubSpot's contacts in, and sending RateUp's existing
 * contacts (and, with deals on, Leads board leads) out. Both run in the background
 * and only add and link; each shows how its latest run went.
 */
export function HubSpotBulkSync({
  runs,
}: Readonly<{ runs: Record<HubSpotBulkKind, HubSpotBulkRun | null> }>) {
  const { t } = useTranslation();

  return (
    <IntegrationFormCard
      title={t("First-time sync")}
      description={t(
        "For records from before HubSpot was connected. Nothing already linked is changed, so running either again is safe.",
      )}
    >
      <div className="flex flex-col gap-3">
        <BulkRow
          kind="import"
          run={runs.import}
          icon={<IconCloudDownload data-icon="inline-start" />}
          title={t("Import contacts from HubSpot")}
          description={t(
            "HubSpot contacts with a phone number, including its country code, become RateUp contacts. A number or email RateUp already has is linked, not duplicated.",
          )}
          action={t("Import")}
        />
        <BulkRow
          kind="export"
          run={runs.export}
          icon={<IconCloudUpload data-icon="inline-start" />}
          title={t("Send existing contacts to HubSpot")}
          description={t(
            "RateUp contacts with an email or phone number are linked to the HubSpot contact they match, or created there. With deals on, leads in mapped columns are sent as deals.",
          )}
          action={t("Send")}
        />
      </div>
    </IntegrationFormCard>
  );
}

function BulkRow({
  kind,
  run,
  icon,
  title,
  description,
  action,
}: Readonly<{
  kind: HubSpotBulkKind;
  run: HubSpotBulkRun | null;
  icon: ReactNode;
  title: string;
  description: string;
  action: string;
}>) {
  const { t } = useTranslation();
  const start = useStartHubSpotBulk(kind);
  const running = run?.status === "running";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        {run && <RunSummary run={run} />}
      </div>
      <Button
        variant="outline"
        className="w-fit shrink-0"
        loading={start.isPending}
        disabled={running}
        onClick={() => start.mutate()}
      >
        {running ? <IconLoader2 className="animate-spin" data-icon="inline-start" /> : icon}
        {running ? t("Running…") : action}
      </Button>
    </div>
  );
}

function RunSummary({ run }: Readonly<{ run: HubSpotBulkRun }>) {
  const { t } = useTranslation();
  const counts = t("{linked} linked, {created} created, {skipped} skipped, {failed} failed", {
    linked: run.linked,
    created: run.created,
    skipped: run.skipped,
    failed: run.failed,
  });
  const deals = run.deals
    ? t("Deals: {created} created, {skipped} skipped, {failed} failed", run.deals)
    : null;

  if (run.status === "running") {
    return (
      <p className="text-xs text-muted-foreground">
        {t("Running: {counts}", { counts })}
        {deals && ` · ${deals}`}
      </p>
    );
  }
  if (run.status === "failed") {
    return (
      <p className="text-xs text-destructive">
        {t("Stopped with an error {when}: {counts}", {
          when: formatToRelativeTime(run.finishedAt ?? run.startedAt),
          counts,
        })}
        {run.error && (
          <code className="mt-1 block truncate font-mono" title={run.error}>
            {run.error}
          </code>
        )}
      </p>
    );
  }
  return (
    <p className="text-xs text-muted-foreground">
      {t("Last run {when}: {counts}", {
        when: formatToRelativeTime(run.finishedAt ?? run.startedAt),
        counts,
      })}
      {deals && ` · ${deals}`}
    </p>
  );
}
