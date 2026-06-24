import { Worker, Job } from "bullmq";
import { log } from "../utils/logger.js";
import prisma from "../utils/prisma.js";
import baseRedis from "../utils/redisConnection.js";
import { processNextNode } from "../modules/whatsapp/whatsappSurvey/wasurvey.controller.js";

const workerConnection = baseRedis.duplicate();

interface PausedAutomationJobData {
  automationMessageId: string;
  phone: string;
  orgId: string;
  currentNode: string;
  automationId: string;
}

export const pausedAutomationWorker = new Worker(
  "pausedAutomationQueue",
  async (job: Job<PausedAutomationJobData>) => {
    const { automationMessageId, phone, orgId, currentNode } = job.data;

    log.info(`Processing paused automation resume: ${automationMessageId} for phone ${phone}`);

    try {
      // Fetch the automation message to verify it still exists and is paused
      const automationMessage = await prisma.waAutomatedReplyMessage.findUnique({
        where: { id: automationMessageId },
        include: {
          waAutomatedReply: true,
        },
      });

      if (!automationMessage) {
        log.warn(`Automation message ${automationMessageId} not found, skipping resume`);
        return;
      }

      if (automationMessage.status !== ("paused" as any)) {
        log.warn(
          `Automation message ${automationMessageId} is not paused (status: ${automationMessage.status}), skipping resume`,
        );
        return;
      }

      // Update status to in-progress to prevent double processing
      await prisma.waAutomatedReplyMessage.update({
        where: { id: automationMessageId },
        data: {
          status: "inProgress",
        },
      });

      const automation = automationMessage.waAutomatedReply;
      if (!automation || !currentNode) {
        log.error(`Missing automation or currentNode for message ${automationMessageId}`);
        return;
      }

      // Find next edges in the automation flow
      const nextEdges = (automation.matchData as any)?.json?.edges?.filter(
        (edge: any) => edge.source === currentNode,
      );

      if (nextEdges && nextEdges.length > 0) {
        // Process each next node
        for (const nextEdge of nextEdges) {
          await processNextNode(phone, automation, nextEdge.target, orgId, automationMessageId);
        }
        log.info(
          `Successfully resumed automation ${automationMessageId}, processed ${nextEdges.length} next nodes`,
        );
      } else {
        // No next node, mark as completed
        await prisma.waAutomatedReplyMessage.update({
          where: { id: automationMessageId },
          data: { status: "completed" as any },
        });
        log.info(`Automation ${automationMessageId} completed (no next nodes)`);
      }
    } catch (error) {
      log.error(
        { error },
        `Error processing paused automation ${automationMessageId}: ${error.message}`,
      );
      throw error; // Re-throw to trigger BullMQ retry
    }
  },
  {
    connection: workerConnection,
    concurrency: 2,
    removeOnComplete: { count: 0 },
    removeOnFail: { count: 1000 },
  },
);

// Log worker events
pausedAutomationWorker.on("completed", (job) => {
  log.info(`Paused automation job ${job.id} completed successfully`);
});

pausedAutomationWorker.on("failed", (job, err) => {
  log.error(`Paused automation job ${job?.id} failed: ${err.message}`);
});

pausedAutomationWorker.on("error", (err) => {
  log.error(`Paused automation worker error: ${err.message}`);
});

log.info("Paused automation worker initialized");
