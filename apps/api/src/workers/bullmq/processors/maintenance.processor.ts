// Runs an Update Center task to the end. The admin panel runs a task inside its request,
// which caps it at ~20 s; a backfill over every ticket or contact takes many of those. Here
// the task runs round after round — each round resumes from the cursor the last one saved —
// until it reports `details.finished`, or someone presses Stop.
import { Job, UnrecoverableError, Worker } from "bullmq";

import { log } from "../../shared/logger.js";
import baseRedis from "../../../utils/redisConnection.js";
import prisma from "../../../utils/prisma.js";
import { findTask } from "../../../modules/maintenance/maintenance.tasks.js";
import { runTask } from "../../../modules/maintenance/task.js";
import {
  addToTotals,
  readBackgroundRun,
  updateBackgroundRun,
  type BackgroundRun,
} from "../../../modules/maintenance/backgroundRun.js";
import type { MaintenanceJobData } from "../queues/maintenance.queue.js";

const workerConnection = baseRedis.duplicate();

/** A minute per round: short enough that a crash or a Stop costs little, long enough to batch. */
export const DEFAULT_ROUND_MS = 60_000;
/** A task whose cursor stopped moving would otherwise loop forever. ~2 days of rounds. */
const MAX_ROUNDS = 3_000;
/** How often a round's log lines are copied into the run record while the round is going. */
const FLUSH_MS = 3_000;

/**
 * Runs one round, copying its log lines into the run record every few seconds so the
 * admin panel shows progress before the round ends.
 */
async function runRound(task: NonNullable<ReturnType<typeof findTask>>, roundMs: number) {
  let pending: string[] = [];
  let flushing: Promise<unknown> = Promise.resolve();
  const flush = () => {
    if (!pending.length) return flushing;
    const lines = pending;
    pending = [];
    flushing = flushing
      .then(() => updateBackgroundRun(task.id, (r) => void r.lines.push(...lines)))
      .catch((err) => log.warn({ err, taskId: task.id }, "maintenance: progress write failed"));
    return flushing;
  };
  const timer = setInterval(flush, FLUSH_MS);
  try {
    return await runTask(task.run, true, {
      timeLimitMs: roundMs,
      onLine: (line) => void pending.push(line),
    });
  } finally {
    clearInterval(timer);
    await flush();
  }
}

async function closeAudit(run: BackgroundRun | null, after: Record<string, unknown>) {
  if (!run?.auditId) return;
  await prisma.staffAuditLog
    .update({ where: { id: run.auditId }, data: { after: { taskId: run.taskId, ...after } } })
    .catch((err) => log.warn({ err, taskId: run.taskId }, "maintenance: audit update failed"));
}

export async function processMaintenanceRun(job: Job<MaintenanceJobData>) {
  const { taskId } = job.data;
  const task = findTask(taskId);
  if (!task?.background) {
    throw new UnrecoverableError(`"${taskId}" is not a task that runs in the background`);
  }
  const roundMs = task.background.roundMs ?? DEFAULT_ROUND_MS;

  await updateBackgroundRun(taskId, (run) => {
    run.state = "running";
    run.error = null;
    if (job.attemptsMade > 0) run.lines.push(`— retrying (attempt ${job.attemptsMade + 1}) —`);
  });

  for (;;) {
    const current = await readBackgroundRun(taskId);
    if (current?.stopRequested) {
      const run = await updateBackgroundRun(taskId, (r) => {
        r.state = "stopped";
        r.summary = `Stopped after ${r.rounds} round(s). Apply again to carry on from there.`;
      });
      await closeAudit(run, { status: "stopped", rounds: run?.rounds, totals: run?.totals });
      return { stopped: true };
    }

    await updateBackgroundRun(taskId, (r) => {
      r.lines.push(`— round ${r.rounds + 1} —`);
      r.roundStartedAt = new Date().toISOString();
    });
    const result = await runRound(task, roundMs);
    const finished = result.details?.finished !== false;
    const run = await updateBackgroundRun(taskId, (r) => {
      r.rounds += 1;
      r.roundStartedAt = null;
      addToTotals(r.totals, result.details);
      r.summary = finished
        ? `Finished after ${r.rounds} round(s). Last round: ${result.summary}`
        : `Round ${r.rounds}: ${result.summary}`;
      if (finished) r.state = "finished";
    });
    await job.updateProgress({ rounds: run?.rounds ?? 0 });

    if (finished) {
      await closeAudit(run, {
        status: "finished",
        summary: run?.summary,
        rounds: run?.rounds,
        totals: run?.totals,
      });
      log.info({ taskId, rounds: run?.rounds, totals: run?.totals }, "Maintenance task finished");
      return { rounds: run?.rounds ?? 0 };
    }
    if ((run?.rounds ?? 0) >= MAX_ROUNDS) {
      throw new UnrecoverableError(`Gave up after ${MAX_ROUNDS} rounds without finishing`);
    }
  }
}

export const maintenanceWorker = new Worker<MaintenanceJobData>(
  "maintenance",
  processMaintenanceRun,
  {
    connection: workerConnection,
    // Two different tasks may run side by side; the same task never does (one job id each).
    concurrency: 2,
    // A deploy or restart kills the round in flight and the job "stalls". BullMQ's default
    // fails a job on its second stall; these tasks resume from their cursor, so let them
    // ride out restarts instead.
    maxStalledCount: 20,
  },
);

maintenanceWorker.on("failed", async (job, err) => {
  if (!job) return;
  const attempts = job.opts.attempts ?? 1;
  const final = err instanceof UnrecoverableError || job.attemptsMade >= attempts;
  log.error(
    { err, taskId: job.data.taskId, attemptsMade: job.attemptsMade, final },
    "maintenance job failed",
  );
  const run = await updateBackgroundRun(job.data.taskId, (r) => {
    r.error = err.message;
    r.lines.push(`— failed: ${err.message}${final ? "" : " (will retry)"} —`);
    if (final) {
      r.state = "failed";
      r.summary = `Failed after ${r.rounds} round(s): ${err.message}`;
    } else {
      r.state = "queued";
    }
  }).catch(() => null);
  if (final) {
    await closeAudit(run, { status: "failed", error: err.message, rounds: run?.rounds });
  }
});
