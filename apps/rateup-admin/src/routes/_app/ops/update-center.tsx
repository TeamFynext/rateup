import {
  IconAlertTriangle,
  IconBolt,
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useId, useState } from "react";

import {
  backgroundRunQueryOptions,
  isActiveRun,
  maintenanceTasksQueryOptions,
  useApplyTask,
  usePreviewTask,
  useMaintenanceRunSocket,
  useStopTask,
  type BackgroundRun,
  type BackgroundRunState,
  type MaintenanceTask,
  type TaskResult,
} from "@/api/ops.api";
import { ActionDialog, done, Notice } from "@/components/ds/action-dialog";
import { JsonBlock } from "@/components/ds/json-block";
import { PageHeading } from "@/components/ds/page-heading";
import type { PillTone } from "@/components/ds/pill";
import { Pill } from "@/components/ds/pill";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { getApiErrorMessage } from "@/lib/apiError";

export const Route = createFileRoute("/_app/ops/update-center")({
  component: UpdateCenterPage,
});

function UpdateCenterPage() {
  const query = useQuery(maintenanceTasksQueryOptions);
  useMaintenanceRunSocket();
  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title="Update center"
        description="Maintenance tasks. Preview shows exactly what a task would change and writes nothing; Apply runs it for real."
      />
      <p className="flex items-start gap-2 rounded-lg bg-tone-peach px-4 py-3 text-xs text-foreground/70">
        <IconAlertTriangle className="mt-px size-4 shrink-0 text-tone-peach-accent" stroke={1.75} />
        <span>
          Always preview first. Applying needs the task id typed back and a reason for the audit
          log.
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
  const [applying, setApplying] = useState(false);
  const runQuery = useQuery({ ...backgroundRunQueryOptions(task.id), enabled: task.background });
  const running = isActiveRun(runQuery.data);

  return (
    <li className="flex min-w-0 flex-col gap-5 rounded-xl border p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold">{task.title}</span>
            {task.destructive && <Pill tone="negative">Hard to undo</Pill>}
            {task.background && <Pill tone="brand">Runs in the background</Pill>}
          </p>
          <p className="font-mono text-xs text-muted-foreground">{task.id}</p>
          <p className="max-w-3xl text-sm text-muted-foreground">{task.description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            className="h-9 rounded-lg px-4"
            disabled={preview.isPending}
            onClick={() => preview.mutate(task.id, { onSuccess: (data) => setResult(data) })}
          >
            {preview.isPending ? <Spinner /> : <IconPlayerPlay />}
            Preview
          </Button>
          <Button
            className="h-9 rounded-lg px-4"
            disabled={running}
            onClick={() => setApplying(true)}
          >
            {running ? <Spinner /> : <IconBolt />}
            {running ? "Running" : "Apply"}
          </Button>
        </div>
      </div>

      {preview.isError && (
        <p className="rounded-lg bg-negative/10 px-4 py-3 text-sm text-negative">
          {getApiErrorMessage(preview.error, "The preview failed.")}
        </p>
      )}

      {task.background && runQuery.data && <RunPanel run={runQuery.data} />}

      {result && (
        <div className="flex flex-col gap-3 border-t pt-5">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {result.summary}
            <Pill tone={result.applied ? "positive" : "muted"}>
              {result.applied ? "Applied" : "Dry run"}
            </Pill>
          </p>
          {result.lines.length > 0 && (
            <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
              {result.lines.join("\n")}
            </pre>
          )}
          {result.details && Object.keys(result.details).length > 0 && (
            <JsonBlock value={result.details} />
          )}
        </div>
      )}

      {applying && (
        <ApplyDialog
          task={task}
          onClose={() => setApplying(false)}
          onApplied={(data) => {
            setResult(data);
            setApplying(false);
          }}
          onQueued={() => {
            setResult(null);
            setApplying(false);
          }}
        />
      )}
    </li>
  );
}

/** The real run, behind two things the API also checks: the task id typed back and a reason. */
function ApplyDialog({
  task,
  onClose,
  onApplied,
  onQueued,
}: {
  task: MaintenanceTask;
  onClose: () => void;
  onApplied: (result: TaskResult) => void;
  onQueued: () => void;
}) {
  const apply = useApplyTask();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState("");
  const confirmId = useId();

  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      destructive={task.destructive}
      title={`Apply ${task.title}`}
      description={task.description}
      submitLabel={task.background ? "Start in the background" : "Apply for real"}
      blocked={confirm.trim() !== task.id && `Type "${task.id}" to confirm`}
      pending={apply.isPending}
      error={apply.error}
      onSubmit={(reason) =>
        apply.mutate(
          { taskId: task.id, confirm: confirm.trim(), reason },
          {
            onSuccess: (data) => {
              if ("background" in data) {
                queryClient.setQueryData(backgroundRunQueryOptions(task.id).queryKey, data.run);
                done(`${task.title}: started in the background`, onQueued);
              } else {
                done(`${task.title}: ${data.summary}`, () => onApplied(data));
              }
            },
          },
        )
      }
    >
      <>
        {task.destructive && (
          <Notice>This writes to the live database and is hard to undo. Preview it first.</Notice>
        )}
        {task.background && (
          <p className="text-sm text-muted-foreground">
            The worker runs it round after round until it is done. You can leave this page; come
            back to see its progress, or stop it.
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor={confirmId}>
            Type <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{task.id}</code>{" "}
            to confirm
          </Label>
          <Input
            id={confirmId}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="h-9 rounded-lg font-mono"
          />
        </div>
      </>
    </ActionDialog>
  );
}

const RUN_STATE: Record<BackgroundRunState, { label: string; tone: PillTone }> = {
  queued: { label: "Queued", tone: "muted" },
  running: { label: "Running", tone: "brand" },
  finished: { label: "Finished", tone: "positive" },
  failed: { label: "Failed", tone: "negative" },
  stopped: { label: "Stopped", tone: "warning" },
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** The latest background run of a task, refreshed every few seconds while it is going. */
function RunPanel({ run }: { run: BackgroundRun }) {
  const stop = useStopTask();
  const active = isActiveRun(run);
  const state = RUN_STATE[run.state];
  const totals = Object.entries(run.totals);

  return (
    <div className="flex flex-col gap-3 border-t pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <Pill tone={state.tone}>{state.label}</Pill>
            {run.stopRequested && active && <Pill tone="warning">Stopping after this round</Pill>}
            <span>
              {run.rounds} round{run.rounds === 1 ? "" : "s"} done
              {active &&
                (run.roundStartedAt
                  ? ` · round ${run.rounds + 1} in progress (rounds last up to a minute)`
                  : " · waiting for the worker")}
            </span>
          </p>
          {run.summary && <p className="text-sm text-muted-foreground">{run.summary}</p>}
          <p className="text-xs text-muted-foreground">
            Started {formatTime(run.queuedAt)}
            {run.startedBy && ` by ${run.startedBy}`}
            {run.finishedAt
              ? ` · ended ${formatTime(run.finishedAt)}`
              : ` · updated ${formatTime(run.updatedAt)}`}
          </p>
        </div>
        {active && (
          <Button
            variant="outline"
            className="h-9 shrink-0 rounded-lg px-4"
            disabled={stop.isPending || run.stopRequested}
            onClick={() => stop.mutate(run.taskId)}
          >
            {stop.isPending ? <Spinner /> : <IconPlayerStop />}
            Stop
          </Button>
        )}
        {!active && run.state !== "finished" && (
          <p className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <IconRefresh className="size-3.5" stroke={1.75} />
            Apply again to carry on from where it stopped
          </p>
        )}
      </div>

      {stop.isError && (
        <p className="rounded-lg bg-negative/10 px-4 py-3 text-sm text-negative">
          {getApiErrorMessage(stop.error, "Could not stop the task.")}
        </p>
      )}
      {run.error && run.state === "failed" && (
        <p className="rounded-lg bg-negative/10 px-4 py-3 text-sm text-negative">{run.error}</p>
      )}

      {totals.length > 0 && (
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {totals.map(([name, value]) => (
            <div key={name} className="flex items-baseline gap-1.5">
              <dt className="text-muted-foreground">{name}</dt>
              <dd className="font-medium tabular-nums">{value.toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      )}

      {run.lines.length > 0 && (
        <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {run.lines.join("\n")}
        </pre>
      )}
    </div>
  );
}
