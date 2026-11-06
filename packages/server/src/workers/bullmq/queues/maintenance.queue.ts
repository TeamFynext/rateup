import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/**
 * Update Center tasks too big for one request. Applying one from the admin panel enqueues a
 * job; the worker runs the task round after round (each round resumes from the task's saved
 * cursor) until it reports it finished. See processors/maintenance.processor.ts.
 */
export const maintenanceQueue = new Queue<MaintenanceJobData>("maintenance", { connection });

export interface MaintenanceJobData {
  taskId: string;
  auditId: string;
}

/**
 * One job id per task, and jobs are removed when they end, so BullMQ itself refuses a
 * second run of a task while one is queued, running or waiting to retry.
 */
export const maintenanceJobId = (taskId: string) => `maintenance-${taskId}`;

export async function enqueueMaintenanceRun(data: MaintenanceJobData) {
  return maintenanceQueue.add("run", data, {
    jobId: maintenanceJobId(data.taskId),
    // A crash mid-round loses at most that round: the next attempt resumes from the cursor.
    attempts: 3,
    backoff: { type: "exponential", delay: 30_000 },
    removeOnComplete: true,
    removeOnFail: true,
  });
}
