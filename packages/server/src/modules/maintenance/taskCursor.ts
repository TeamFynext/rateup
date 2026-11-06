import redis from "../../utils/redisConnection.js";

/**
 * Where a long backfill stopped, so the next run resumes there instead of re-scanning rows
 * it could not change. Cleared when a run reaches the end, so a later run starts over.
 * Dry runs never move it.
 */
const START = "00000000-0000-0000-0000-000000000000";
const key = (taskId: string) => `maintenance:cursor:${taskId}`;

export async function readTaskCursor(taskId: string): Promise<string> {
  return (await redis.get(key(taskId))) ?? START;
}

export async function saveTaskCursor(taskId: string, cursor: string | null): Promise<void> {
  if (cursor === null) await redis.del(key(taskId));
  else await redis.set(key(taskId), cursor, "EX", 60 * 60 * 24 * 30);
}
