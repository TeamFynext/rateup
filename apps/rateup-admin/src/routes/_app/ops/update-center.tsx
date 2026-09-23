import { IconAlertTriangle, IconBolt, IconPlayerPlay } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useId, useState } from "react";

import { isReauthRequired } from "@/api/client";
import {
  maintenanceTasksQueryOptions,
  useApplyTask,
  usePreviewTask,
  type MaintenanceTask,
  type TaskResult,
} from "@/api/ops.api";
import { ActionDialog, done, Notice } from "@/components/ds/action-dialog";
import { JsonBlock } from "@/components/ds/json-block";
import { Pill } from "@/components/ds/pill";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { StepUpPrompt } from "@/components/ds/step-up";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { getApiErrorMessage } from "@/lib/apiError";
import { rememberIntent, takeIntent } from "@/lib/resume";

const PAGE = "/ops/update-center";

export const Route = createFileRoute("/_app/ops/update-center")({
  component: UpdateCenterPage,
});

function UpdateCenterPage() {
  const query = useQuery(maintenanceTasksQueryOptions);
  // Back from the step-up sign-in: reopen the Apply dialog that sent us there.
  const [resume] = useState(() => takeIntent(PAGE, "apply"));
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Update center"
        description="Maintenance tasks. Preview shows exactly what a task would change and writes nothing; Apply runs it for real."
      />
      <p className="flex items-start gap-2 rounded-2xl bg-tone-peach px-4 py-3 text-xs text-foreground/70">
        <IconAlertTriangle className="mt-px size-4 shrink-0 text-tone-peach-accent" stroke={1.75} />
        <span>
          Always preview first. Applying needs a Google sign-in from the last 15 minutes, the task
          id typed back, and a reason for the audit log.
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
            <TaskCard key={task.id} task={task} resume={resume?.id === task.id} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskCard({ task, resume }: { task: MaintenanceTask; resume: boolean }) {
  const preview = usePreviewTask();
  const [result, setResult] = useState<TaskResult | null>(null);
  const [applying, setApplying] = useState(resume);

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
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            className="h-11 rounded-xl px-4"
            disabled={preview.isPending}
            onClick={() => preview.mutate(task.id, { onSuccess: (data) => setResult(data) })}
          >
            {preview.isPending ? <Spinner /> : <IconPlayerPlay />}
            Preview
          </Button>
          <Button className="h-11 rounded-xl px-4" onClick={() => setApplying(true)}>
            <IconBolt />
            Apply
          </Button>
        </div>
      </div>

      {preview.isError && (
        <p className="rounded-2xl bg-negative/10 px-4 py-3 text-sm text-negative">
          {getApiErrorMessage(preview.error, "The preview failed.")}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-3 border-t pt-5">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {result.summary}
            <Pill tone={result.applied ? "positive" : "muted"}>
              {result.applied ? "Applied" : "Dry run"}
            </Pill>
          </p>
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

      {applying && (
        <ApplyDialog
          task={task}
          onClose={() => setApplying(false)}
          onApplied={(data) => {
            setResult(data);
            setApplying(false);
          }}
        />
      )}
    </li>
  );
}

/**
 * The real run, behind three things the API also checks: the task id typed back, a reason,
 * and a Google sign-in from the last 15 minutes. When the sign-in is too old the dialog
 * turns into the step-up prompt; the trip to Google returns here with it reopened.
 */
function ApplyDialog({
  task,
  onClose,
  onApplied,
}: {
  task: MaintenanceTask;
  onClose: () => void;
  onApplied: (result: TaskResult) => void;
}) {
  const apply = useApplyTask();
  const [confirm, setConfirm] = useState("");
  const confirmId = useId();
  const stepUp = isReauthRequired(apply.error);

  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      destructive={task.destructive}
      title={`Apply ${task.title}`}
      description={task.description}
      submitLabel="Apply for real"
      canSubmit={confirm.trim() === task.id && !stepUp}
      pending={apply.isPending}
      error={stepUp ? null : apply.error}
      onSubmit={(reason) =>
        apply.mutate(
          { taskId: task.id, confirm: confirm.trim(), reason },
          { onSuccess: (data) => done(`${task.title}: ${data.summary}`, () => onApplied(data)) },
        )
      }
    >
      {stepUp ? (
        <StepUpPrompt
          onBeforeLeave={() => rememberIntent({ path: PAGE, kind: "apply", id: task.id })}
        />
      ) : (
        <>
          {task.destructive && (
            <Notice>This writes to the live database and is hard to undo. Preview it first.</Notice>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor={confirmId}>
              Type{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{task.id}</code> to
              confirm
            </Label>
            <Input
              id={confirmId}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="h-11 rounded-xl font-mono"
            />
          </div>
        </>
      )}
    </ActionDialog>
  );
}
