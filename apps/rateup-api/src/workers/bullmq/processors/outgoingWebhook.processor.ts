import { Worker, Job } from "bullmq";
import baseRedis from "../../../utils/redisConnection.js";
import { log } from "../../../utils/logger.js";
import { OutgoingWebhookJobData } from "../../../modules/webhook/webhook.service.js";
import prisma from "../../../utils/prisma.js";

export const outgoingWebhookWorker = new Worker(
  "outgoingWebhookQueue",
  async (job: Job<OutgoingWebhookJobData>) => {
    const { phoneId, event, payload } = job.data;

    const webhook = await prisma.whatsappSettings.findUnique({
      where: { phoneId },
      select: {
        org: {
          select: {
            Webhook: {
              select: {
                url: true,
                events: true,
              },
            },
          },
        },
      },
    });

    if (!webhook?.org?.Webhook?.events.includes(event)) return;
    log.info({ url: webhook.org.Webhook.url, id: job?.id }, "🚀 ~ webhook.org.Webhook.url:");

    const response = await fetch(webhook.org.Webhook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...payload }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(
        `Webhook POST to ${webhook.org.Webhook.url} failed with status ${response.status}`,
      );
    }
  },
  {
    connection: baseRedis.duplicate(),
    concurrency: 10,
    removeOnComplete: {
      count: 1,
    },
  },
)
  .on("failed", (job, err) => {
    log.error("Outgoing webhook job %s failed: %s", job?.id, err.message);
  })
  .on("error", (err) => {
    log.error("Outgoing webhook worker error: %s", err.message);
  });

log.info("Outgoing webhook worker initialized");
