import { handleWebhook } from "../modules/integrations/shopify/shopify.service.js";
import { log } from "./logger.js";
import prisma from "./prisma.js";

import EventEmitter from "node:events";
export const eventEmitter = new EventEmitter();

let isProcessing = false;

eventEmitter.on("queue", async function () {
  log.info("queue event triggered");
  if (isProcessing) return;
  await processQueue();
});

export enum QueueType {
  webhookQueue = "webhookQueue",
}

type jobData = {
  type: QueueType;
  data: Record<string, any>;
};

export async function addToQueue(data: jobData) {
  let isExistingWebhook = null;
  if (data.type === QueueType.webhookQueue)
    isExistingWebhook = await prisma.jobQueue.findFirst({
      where: {
        type: QueueType.webhookQueue,
        data: {
          path: ["webhookId"],
          equals: data?.data?.webhookId,
        },
      },
    });
  if (isExistingWebhook) return;
  const res = await prisma.jobQueue.create({
    data,
  });
  eventEmitter.emit("queue");
}

export async function processQueue() {
  try {
    isProcessing = true;
    await deleteAllExpiredJobs();
    const jobs = await prisma.jobQueue.findMany({
      where: {
        status: "pending",
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    if (!jobs.length) {
      isProcessing = false;
      return;
    }
    for (const job of jobs) {
      await prisma.jobQueue.update({
        where: {
          id: job.id,
        },
        data: {
          status: "processing",
        },
      });
      if (job.type === QueueType.webhookQueue) {
        await handleWebhook(job.data);
      }
      await prisma.jobQueue.delete({
        where: {
          id: job.id,
        },
      });
    }
  } catch (e) {
    log.error(e);
  } finally {
    isProcessing = false;
  }
  processQueue();
}

export async function deleteAllExpiredJobs() {
  await prisma.jobQueue.deleteMany({
    where: {
      createdAt: {
        lte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      },
    },
  });
}
