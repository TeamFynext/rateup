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
  /**
   * How long a resumable task may keep going before it saves its place and returns
   * `details.finished: false`. A run from the admin panel is inside a request (30 s timeout),
   * so it gets {@link INLINE_TIME_LIMIT_MS}; the background worker passes a longer round.
   */
  timeLimitMs: number;
}

export const INLINE_TIME_LIMIT_MS = 20_000;

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
export async function runTask(
  runner: TaskRunner,
  apply: boolean,
  {
    timeLimitMs = INLINE_TIME_LIMIT_MS,
    onLine,
  }: {
    timeLimitMs?: number;
    /** Called with each line as it is logged, for a caller that shows progress mid-run. */
    onLine?: (line: string) => void;
  } = {},
): Promise<TaskResult> {
  const lines: string[] = [];
  const prefix = apply ? "[apply]" : "[dry-run]";

  const outcome = await runner({
    apply,
    log: (message) => {
      const line = `${prefix} ${message}`;
      lines.push(line);
      onLine?.(line);
    },
    timeLimitMs,
  });

  return { ...outcome, applied: apply, lines };
}
