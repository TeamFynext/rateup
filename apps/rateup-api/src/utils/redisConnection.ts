import "dotenv/config";
import IORedis from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL environment variable must be set");
}
const redisURL = new URL(process.env.REDIS_URL);
const connection = new IORedis.default({
  family: 0,
  host: redisURL.hostname,
  port: Number.parseInt(redisURL.port),
  username: redisURL.username,
  password: redisURL.password,
  maxRetriesPerRequest: null,
});

// The BullMQ queues that used to be declared here now live in
// src/workers/bullmq/queues/ — import them from there. This module is the plain
// Redis connection only, so importing it never constructs a queue.
export default connection;
