import { integrationTriggerQueue } from "../../../../workers/bullmq/queues/index.js";
import { IntegratedApps } from "../../../../types/enums.js";
import type { GetLeadTriggers } from "./getlead.types.js";
import type { GetLeadSource } from "./getlead.utils.js";

/**
 * The producer side of the GetLead sync, kept apart from `getlead.utils.ts`.
 *
 * Importing the queue opens a Redis connection at module load, so anything that
 * pulls it in inherits that dependency. The pure helpers — phone conversion,
 * payload building — must stay importable without it: `getlead.service.ts` uses
 * them inside the worker, and a test or script that only wants to build a payload
 * should not have to stand up Redis to do it.
 */

/**
 * BullMQ options for a GetLead job.
 *
 * GetLead is the only provider on `integrationTriggerQueue` that opts into
 * retries. The shared worker no longer swallows failures, and BullMQ defaults to
 * a single attempt, so setting these here gives GetLead backoff without changing
 * anything for Zoho.
 *
 * The 60s base is the rate-limit window: an observed 429 asks for
 * `retry_after: 60`, so the first retry lands just after the budget resets rather
 * than spending another request into a closed window.
 */
export const GETLEAD_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 60_000 },
};

/** Queues a board lead for push. Mirrors `addZohoContactToQueue`. */
export async function addGetLeadSyncToQueue(
  trigger: GetLeadTriggers,
  orgId: string,
  data: GetLeadSource,
  ids: { rateupLeadId?: string; rateupContactId?: string },
) {
  await integrationTriggerQueue.add(
    `getlead-${trigger}`,
    {
      integrationName: IntegratedApps.getlead,
      triggerKey: trigger,
      orgId,
      data,
      ...ids,
    },
    GETLEAD_JOB_OPTIONS,
  );
}
