import "dotenv/config";
import IORedis from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL environment variable must be set");
}

/**
 * Connection options from a `redis://[user:pass@]host:port[/db]` URL. The database index in
 * the path used to be ignored, so a URL naming `/9` silently shared database 0.
 */
export function redisOptionsFromUrl(url: string) {
  const parsed = new URL(url);
  const dbPath = parsed.pathname.replace(/^\/+/, "");
  const db = dbPath === "" ? 0 : Number.parseInt(dbPath, 10);
  if (!Number.isInteger(db) || db < 0) {
    throw new Error(`REDIS_URL has an invalid database index: "${dbPath}"`);
  }
  return {
    family: 0,
    host: parsed.hostname,
    port: Number.parseInt(parsed.port),
    username: parsed.username,
    password: parsed.password,
    db,
    maxRetriesPerRequest: null,
  };
}

const connection = new IORedis.default(redisOptionsFromUrl(process.env.REDIS_URL));

// The BullMQ queues that used to be declared here now live in
// src/workers/bullmq/queues/ — import them from there. This module is the plain
// Redis connection only, so importing it never constructs a queue.
export default connection;
