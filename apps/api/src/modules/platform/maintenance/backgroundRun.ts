import redis from "../../../utils/redisConnection.js";

/**
 * The state of a task the background worker is running to the end, kept in Redis so the
 * admin panel can poll it from any API replica. One record per task: a new run replaces
 * the last one's record.
 */
export type BackgroundRunState = "queued" | "running" | "finished" | "failed" | "stopped";

export interface BackgroundRun {
  taskId: string;
  jobId: string;
  /** The `StaffAuditLog` row of the Apply that started it, updated when the run ends. */
  auditId: string;
  startedBy: string | null;
  state: BackgroundRunState;
  /** How many rounds have finished; each round is one run of the task. */
  rounds: number;
  /** When the round in progress began, or null between rounds. */
  roundStartedAt: string | null;
  /** Numeric `details` summed over every round (tickets scanned, identities written, ...). */
  totals: Record<string, number>;
  /** The latest round's summary, or the final one. */
  summary: string | null;
  /** The newest transcript lines across rounds. */
  lines: string[];
  error: string | null;
  stopRequested: boolean;
  queuedAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

/**
 * Every write of a run record is also published here, whole, so the API can push it to the
 * staff console's socket (staff/ops/maintenance.ws.ts) instead of the page polling.
 */
export const MAINTENANCE_RUN_CHANNEL = "staff:maintenance-run";

const MAX_LINES = 200;
const TTL_SECONDS = 30 * 24 * 60 * 60;
const key = (taskId: string) => `maintenance:run:${taskId}`;

export const ACTIVE_RUN_STATES: BackgroundRunState[] = ["queued", "running"];

export async function readBackgroundRun(taskId: string): Promise<BackgroundRun | null> {
  const raw = await redis.get(key(taskId));
  return raw ? (JSON.parse(raw) as BackgroundRun) : null;
}

async function write(run: BackgroundRun) {
  run.updatedAt = new Date().toISOString();
  run.lines = run.lines.slice(-MAX_LINES);
  const raw = JSON.stringify(run);
  await redis.set(key(run.taskId), raw, "EX", TTL_SECONDS);
  // Best effort: a missed push only means the page shows this update on its next fetch.
  await redis.publish(MAINTENANCE_RUN_CHANNEL, raw).catch(() => undefined);
  return run;
}

export function newBackgroundRun(
  taskId: string,
  jobId: string,
  auditId: string,
  startedBy: string | null,
): Promise<BackgroundRun> {
  const now = new Date().toISOString();
  return write({
    taskId,
    jobId,
    auditId,
    startedBy,
    state: "queued",
    rounds: 0,
    roundStartedAt: null,
    totals: {},
    summary: null,
    lines: [],
    error: null,
    stopRequested: false,
    queuedAt: now,
    updatedAt: now,
    finishedAt: null,
  });
}

/**
 * Read-modify-write of the record. Only the one worker running the job and a Stop click
 * write it, and Stop only sets a flag, so a lost update costs at most one round's lines.
 */
export async function updateBackgroundRun(
  taskId: string,
  change: (run: BackgroundRun) => void,
): Promise<BackgroundRun | null> {
  const run = await readBackgroundRun(taskId);
  if (!run) return null;
  change(run);
  if (run.state === "finished" || run.state === "failed" || run.state === "stopped") {
    run.finishedAt ??= new Date().toISOString();
  }
  return write(run);
}

/** Adds one round's numeric details to the running totals; `finished` and lists are skipped. */
export function addToTotals(totals: Record<string, number>, details?: Record<string, unknown>) {
  for (const [name, value] of Object.entries(details ?? {})) {
    if (typeof value === "number" && Number.isFinite(value)) {
      totals[name] = (totals[name] ?? 0) + value;
    }
  }
}
