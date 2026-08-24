import { IconAlertTriangle, IconPlayerPlay, IconRefresh, IconTerminal2 } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import type { MaintenanceTaskResult } from "@/backend/maintenance/maintenance.api";
import {
  useMaintenanceTasks,
  useRunMaintenanceTask,
} from "@/backend/maintenance/maintenance.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { getApiErrorMessage } from "@/utils/apiError.ts";

/**
 * Runs the maintenance tasks defined in the API's `maintenance.tasks.ts`.
 *
 * The catalog comes from the server rather than being duplicated here, so adding a task
 * is one file in the API and it appears with no frontend change. Every task dry-runs by
 * default and returns its transcript; applying is a second, deliberate click behind a
 * confirmation naming the task.
 */
export function UpdateCenter() {
  const { data: tasks, isPending, refetch, isRefetching } = useMaintenanceTasks();
  const runTask = useRunMaintenanceTask();

  const [results, setResults] = useState<Record<string, MaintenanceTaskResult>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ id: string; title: string } | null>(null);

  function run(taskId: string, apply: boolean) {
    setRunning(taskId);
    runTask.mutate(
      { taskId, apply },
      {
        onSuccess: (result) => {
          setResults((current) => ({ ...current, [taskId]: result }));
          toast.success(result.summary);
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(error, "The task failed"), {
            // A task that refuses explains why in its message — an unsafe delete, a price
            // mismatch. That reason is the whole value of the failure.
            description: "Nothing was written. See the message above.",
          }),
        onSettled: () => setRunning(null),
      },
    );
  }

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Update Center</h2>
          <p className="text-sm text-muted-foreground">
            One-off data migrations. Every task previews first — nothing is written until you apply
            it, and the preview tells you exactly what would change.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="gap-2"
        >
          <IconRefresh className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : !tasks?.length ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No maintenance tasks are registered.
        </Card>
      ) : (
        tasks.map((task) => {
          const result = results[task.id];
          const busy = running === task.id;

          return (
            <Card key={task.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                      {task.title}
                      {task.destructive && (
                        <Badge variant="destructive" className="gap-1">
                          <IconAlertTriangle className="h-3 w-3" />
                          Writes data
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => run(task.id, false)}
                      className="gap-1"
                    >
                      <IconTerminal2 className="h-4 w-4" />
                      {busy ? "Running…" : "Preview"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={busy}
                      onClick={() => setConfirming({ id: task.id, title: task.title })}
                      className="gap-1"
                    >
                      <IconPlayerPlay className="h-4 w-4" />
                      Apply
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {result && (
                <CardContent className="space-y-2">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <Badge variant={result.applied ? "default" : "secondary"}>
                      {result.applied ? "Applied" : "Preview"}
                    </Badge>
                    {result.summary}
                  </p>
                  {result.lines.length > 0 && (
                    // Bounded height with its own scroll: a transcript can run to hundreds
                    // of lines and must not push every other task off the page.
                    <pre className="max-h-72 overflow-auto overscroll-contain rounded-md bg-muted p-3 text-xs leading-relaxed">
                      {result.lines.join("\n")}
                    </pre>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })
      )}

      <Dialog open={Boolean(confirming)} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconAlertTriangle className="h-5 w-5 text-destructive" />
              Apply “{confirming?.title}”?
            </DialogTitle>
            <DialogDescription>
              This writes to the database, and in some cases to the payment gateway. Preview it
              first if you have not already — the transcript tells you exactly what will change.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirming) run(confirming.id, true);
                setConfirming(null);
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
