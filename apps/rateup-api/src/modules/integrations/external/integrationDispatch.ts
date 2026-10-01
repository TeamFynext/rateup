import type { Job } from "bullmq";

import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { INTEGRATION_EVENT_JOB } from "../events/emitIntegrationEvent.js";
import { processIntegrationEvent } from "../events/integrationEvent.fanout.js";
import type { IntegrationEventJobData } from "../events/integrationEvent.types.js";
import type { ProviderJobData } from "../providers/integrationProvider.types.js";
import { getIntegrationProvider } from "../providers/registry.js";
import { markIntegrationHealthy, recordIntegrationFailure } from "../shared/integrationHealth.js";

/**
 * Failed provider jobs in a row before admins hear about it. A single rejected
 * record is routine — a CRM refusing one contact's data — but three with no
 * success between them means the sync as a whole is not getting through.
 */
const JOB_FAILURES_NOTIFY_AFTER = 3;

/**
 * Everything the integration worker runs: an event still to be fanned out
 * (`INTEGRATION_EVENT_JOB`), or one provider's job that its `handleEvent`
 * enqueued.
 */
export type IntegrationWorkerJob = Job<ProviderJobData> | Job<IntegrationEventJobData>;

function isEventJob(job: IntegrationWorkerJob): job is Job<IntegrationEventJobData> {
  return job.name === INTEGRATION_EVENT_JOB;
}

/**
 * Entry point for `integrationTriggerQueue`. An event is fanned out to the
 * providers, which enqueue their own jobs back onto the same queue; those come
 * back through here and go to their provider.
 */
export async function processIntegrationJob(job: IntegrationWorkerJob) {
  if (isEventJob(job)) return processIntegrationEvent(job.data);
  return processIntegration(job);
}

/**
 * Runs one provider job through the provider that enqueued it, looked up in the
 * registry by the job's `integrationName`.
 *
 * A job for an org that has since deactivated the provider is silently dropped:
 * the fan-out checked when it enqueued, but a job can sit on the queue while the
 * integration is switched off.
 */
export async function processIntegration(job: Job<ProviderJobData>) {
  const { integrationName, orgId } = job.data;

  const provider = getIntegrationProvider(integrationName);
  if (!provider) throw new Error(`Unsupported integration: ${integrationName}`);
  if (!provider.processJob) {
    log.warn("Integration %s has no queued jobs to run; dropping %s", integrationName, job.name);
    return;
  }

  const integration = await prisma.integration.findUnique({
    where: {
      orgid_integration_name_unique: {
        orgId,
        name: integrationName,
      },
    },
  });

  if (!integration || !integration.active) {
    return;
  }

  const finalAttempt = job.attemptsMade + 1 >= (job.opts?.attempts ?? 1);
  try {
    await provider.processJob(integration, job.data, { finalAttempt });
  } catch (error) {
    // Counted once the job has run out of retries, so a GetLead 429 that its
    // backoff rides out is not reported as a failure.
    if (finalAttempt) {
      await recordIntegrationFailure(integration, provider.label, error, {
        notifyAfter: JOB_FAILURES_NOTIFY_AFTER,
      });
    }
    throw error;
  }
  await markIntegrationHealthy(integration);
}
