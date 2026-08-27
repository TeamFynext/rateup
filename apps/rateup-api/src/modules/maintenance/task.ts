/**
 * The shape every maintenance task shares.
 *
 * Tasks live under `src/` so they are type-checked by the build and compiled into `dist`,
 * which is what lets the admin panel run them. They replaced a `scripts/` folder of
 * standalone CLI files that sat outside tsconfig's `include` — nothing there was
 * type-checked, and a stale script only announced itself when someone ran it against a
 * live database.
 *
 * Admin → Update Center is the way to run one. There is no CLI entry point by design: two
 * ways in meant two things to keep working.
 */

export interface TaskContext {
  /** False means report what would change and write nothing. Every task must honour it. */
  apply: boolean;
  /** Progress, in the order it happened, rendered as the run's transcript. */
  log: (message: string) => void;
}

export interface TaskOutcome {
  /** One-line result, shown as the task's status after a run. */
  summary: string;
  /** Anything structured worth showing — counts, ids, names. */
  details?: Record<string, unknown>;
}

export type TaskRunner = (context: TaskContext) => Promise<TaskOutcome>;

export interface TaskResult extends TaskOutcome {
  applied: boolean;
  lines: string[];
}

/**
 * Runs a task, collecting its log rather than printing it.
 *
 * Tasks are written to describe what they are doing as they go, because a migration you
 * cannot read the transcript of is one you cannot trust.
 */
export async function runTask(runner: TaskRunner, apply: boolean): Promise<TaskResult> {
  const lines: string[] = [];
  const prefix = apply ? "[apply]" : "[dry-run]";

  const outcome = await runner({
    apply,
    log: (message) => lines.push(`${prefix} ${message}`),
  });

  return { ...outcome, applied: apply, lines };
}
