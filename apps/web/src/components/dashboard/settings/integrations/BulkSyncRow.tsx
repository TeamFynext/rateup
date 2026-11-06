import { Button } from "@rateup/ui/components/button";
import { IconLoader2 } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { formatToRelativeTime } from "@/utils/dateTime.ts";

/** One first-time sync run, as a CRM's status reports it. */
export interface BulkSyncRun {
  status: "running" | "done" | "failed";
  startedAt: string;
  finishedAt?: string;
  created: number;
  linked: number;
  skipped: number;
  failed: number;
  deals?: { created: number; skipped: number; failed: number };
  error?: string;
}

/**
 * One direction of a CRM's first-time sync (HubSpot, Pipedrive): what it does, how
 * its latest run went, and the button that starts another. The run itself happens
 * in the background; the page's status polls while it is going.
 */
export function BulkSyncRow({
  run,
  start,
  icon,
  title,
  description,
  action,
}: Readonly<{
  run: BulkSyncRun | null;
  start: { isPending: boolean; mutate: () => void };
  icon: ReactNode;
  title: string;
  description: string;
  action: string;
}>) {
  const { t } = useTranslation();
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

function RunSummary({ run }: Readonly<{ run: BulkSyncRun }>) {
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
