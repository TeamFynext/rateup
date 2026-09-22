import { IconAlertTriangle, IconPlayerPlay } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import {
  maintenanceTasksQueryOptions,
  usePreviewTask,
  type MaintenanceTask,
  type TaskResult,
} from "@/api/ops.api";
import { JsonBlock } from "@/components/ds/json-block";
import { Pill } from "@/components/ds/pill";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getApiErrorMessage } from "@/lib/apiError";

export const Route = createFileRoute("/_app/ops/update-center")({
  component: UpdateCenterPage,
});

function UpdateCenterPage() {
  const query = useQuery(maintenanceTasksQueryOptions);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Update center"
        description="Maintenance tasks. Preview shows exactly what a task would change, and writes nothing."
      />
      <p className="flex items-start gap-2 rounded-2xl bg-tone-peach px-4 py-3 text-xs text-foreground/70">
        <IconAlertTriangle className="mt-px size-4 shrink-0 text-tone-peach-accent" stroke={1.75} />
        <span>
          Applying a task is not available in the console yet. It arrives with the actions phase,
          behind a fresh Google sign-in and a typed confirmation.
        </span>
      </p>
      {query.isPending ? (
        <ListSkeleton rows={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState title="No maintenance tasks" />
      ) : (
        <ul className="flex flex-col gap-4">
          {query.data.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: MaintenanceTask }) {
  const preview = usePreviewTask();
  const [result, setResult] = useState<TaskResult | null>(null);

  return (
    <li className="flex min-w-0 flex-col gap-5 rounded-3xl border p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold">{task.title}</span>
            {task.destructive && <Pill tone="negative">Hard to undo</Pill>}
          </p>
          <p className="font-mono text-xs text-muted-foreground">{task.id}</p>
          <p className="max-w-3xl text-sm text-muted-foreground">{task.description}</p>
        </div>
        <Button
          variant="outline"
          className="h-11 shrink-0 rounded-xl px-4"
          disabled={preview.isPending}
          onClick={() => preview.mutate(task.id, { onSuccess: (data) => setResult(data) })}
        >
          {preview.isPending ? <Spinner /> : <IconPlayerPlay />}
          Preview
        </Button>
      </div>

      {preview.isError && (
        <p className="rounded-2xl bg-negative/10 px-4 py-3 text-sm text-negative">
          {getApiErrorMessage(preview.error, "The preview failed.")}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-3 border-t pt-5">
          <p className="text-sm font-medium">{result.summary}</p>
          {result.lines.length > 0 && (
            <pre className="max-h-80 overflow-auto rounded-2xl bg-muted p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
              {result.lines.join("\n")}
            </pre>
          )}
          {result.details && Object.keys(result.details).length > 0 && (
            <JsonBlock value={result.details} />
          )}
        </div>
      )}
    </li>
  );
}
