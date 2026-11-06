import axios from "axios";

import type { Integration } from "../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import { assertPublicUrl, publicAxiosOptions } from "../../../utils/ssrf.js";
import prisma from "../../../utils/prisma.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import type {
  ProviderJobData,
  ProviderJobRunContext,
} from "../providers/integrationProvider.types.js";
import { buildZapierPayload, type ZapierTriggerInput } from "../external/zapier/zapier.payloads.js";
import {
  activeZapierHooks,
  type ZapierDeliveryJobData,
  type ZapierTriggers,
} from "../external/zapier/zapier.types.js";
import {
  AUTOMATION_PLATFORM_LABELS,
  automationDeliveryKey,
  type AutomationPlatform,
} from "./automation.platforms.js";

/**
 * One job per hook, so a retry re-sends only to the scenario that missed it.
 * Four tries over about seven minutes ride out a platform blip; a hook still
 * failing after that is switched off.
 */
export const AUTOMATION_JOB_OPTIONS = {
  attempts: 4,
  backoff: { type: "exponential" as const, delay: 60_000 },
};

const POST_TIMEOUT_MS = 15_000;

/**
 * Builds the trigger's payload once and queues a delivery to every hook the org
 * has active for it on this platform. Nothing is built when no hook listens.
 */
export async function queueAutomationTrigger<T extends ZapierTriggers>(
  platform: AutomationPlatform,
  integration: Pick<Integration, "orgId" | "credential">,
  trigger: T,
  input: ZapierTriggerInput[T],
) {
  const { orgId } = integration;
  const hooks = activeZapierHooks(integration.credential, trigger);
  if (!orgId || !hooks.length) return;

  const payload = await buildZapierPayload(trigger, input);
  for (const hook of hooks) {
    const job: ProviderJobData<ZapierDeliveryJobData> = {
      integrationName: platform,
      triggerKey: automationDeliveryKey(platform),
      orgId,
      data: { trigger, hookUrl: hook.hookUrl, payload },
    };
    await integrationTriggerQueue.add(`${platform}-${trigger}`, job, AUTOMATION_JOB_OPTIONS);
  }
}

/**
 * Switches off one hook, in one statement, leaving every other subscription and
 * the rest of the credential alone. A read-modify-write here would race the
 * platform's subscribe calls and the other hooks' deliveries.
 */
export async function deactivateAutomationHook(
  platform: AutomationPlatform,
  orgId: string,
  hookUrl: string,
) {
  const now = new Date().toISOString();
  await prisma.$executeRaw`UPDATE "Integration" SET credential = jsonb_set(credential, '{triggerSubscriptions}', (SELECT COALESCE(jsonb_agg(CASE WHEN sub->>'hookUrl' = ${hookUrl} THEN sub || jsonb_build_object('active', false, 'updatedAt', ${now}::text) ELSE sub END ORDER BY i), '[]'::jsonb) FROM jsonb_array_elements(credential->'triggerSubscriptions') WITH ORDINALITY AS t(sub, i))) WHERE "orgId" = ${orgId}::uuid AND name = ${platform} AND jsonb_typeof(credential->'triggerSubscriptions') = 'array'`;
}

/**
 * Posts one payload to one hook — the platform provider's `processJob`.
 *
 * Any 2xx is delivered. A 410 is the platform saying the hook is gone, so it is
 * switched off and not retried. Anything else is thrown for the queue to retry,
 * and the hook is switched off once the last try fails.
 */
export async function deliverAutomationHook(
  platform: AutomationPlatform,
  integration: Integration,
  job: ProviderJobData,
  { finalAttempt }: ProviderJobRunContext,
): Promise<void | "skipped"> {
  const { trigger, hookUrl, payload } = job.data as ZapierDeliveryJobData;
  // Unsubscribed or switched off while the job waited.
  if (!activeZapierHooks(integration.credential, trigger).some((h) => h.hookUrl === hookUrl)) {
    return "skipped";
  }

  try {
    // The hook URL came from the platform's subscribe call, i.e. from whoever
    // holds the org's key; re-checked on every send since DNS can move.
    await assertPublicUrl(hookUrl);
  } catch (error) {
    log.warn(
      { integrationId: integration.id, trigger, err: error },
      `Switching off a ${AUTOMATION_PLATFORM_LABELS[platform]} hook with a non-public URL`,
    );
    await deactivateAutomationHook(platform, job.orgId, hookUrl);
    return "skipped";
  }

  try {
    await axios.post(hookUrl, payload, publicAxiosOptions(POST_TIMEOUT_MS));
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status === 410 || finalAttempt) {
      log.warn(
        { integrationId: integration.id, trigger, status },
        `Switching off a ${AUTOMATION_PLATFORM_LABELS[platform]} hook that no longer accepts deliveries`,
      );
      await deactivateAutomationHook(platform, job.orgId, hookUrl);
    }
    if (status === 410) return "skipped";
    throw error;
  }
}
