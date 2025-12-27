import "dotenv/config";
import IORedis from "ioredis";
import { Queue } from "bullmq";
const redisURL = new URL(process.env.REDIS_URL);
const connection = new IORedis.default({
  family: 0,
  host: redisURL.hostname,
  port: Number.parseInt(redisURL.port),
  username: redisURL.username,
  password: redisURL.password,
  maxRetriesPerRequest: null,
});
export const waCampaignEnqueue = new Queue("waCampaignEnqueue", { connection });
export const getCampaignCount = (campaignId) => {
  return connection.scard(`campaign:${campaignId}:jobs`);
};
export const waCampaignDequeue = new Queue("waCampaignDequeue", { connection });

export const waMessageQueue = new Queue("waMessageQueue", { connection });
export const waStatusQueue = new Queue("wa-status-queue", { connection });

export const zapierTriggerQueue = new Queue("zapierTriggerQueue", {
  connection,
});
export const userStatusQueue = new Queue("user-availability", { connection });

export default connection;
