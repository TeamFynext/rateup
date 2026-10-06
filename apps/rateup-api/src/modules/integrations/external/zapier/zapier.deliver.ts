import axios from "axios";

import type { Integration } from "../../../../../generated/prisma/client.js";
import { IntegratedApps } from "../../../../types/enums.js";
import { log } from "../../../../utils/logger.js";
import prisma from "../../../../utils/prisma.js";
import { integrationTriggerQueue } from "../../../../workers/bullmq/queues/index.js";
import type {
  ProviderJobData,
  ProviderJobRunContext,
} from "../../providers/integrationProvider.types.js";
import { buildZapierPayload, type ZapierTriggerInput } from "./zapier.payloads.js";
import {
  activeZapierHooks,
  ZAPIER_DELIVERY,
  type ZapierDeliveryJobData,
  ZapierTriggers,
} from "./zapier.types.js";

/**
 * One job per hook, so a retry re-sends only to the Zap that missed it. Four
 * tries over about seven minutes ride out a Zapier blip; a hook still failing
 * after that is switched off, as it always was.
 */
export const ZAPIER_JOB_OPTIONS = {
  attempts: 4,
  backoff: { type: "exponential" as const, delay: 60_000 },
};

const POST_TIMEOUT_MS = 15_000;

/**
 * Builds the trigger's payload once and queues a delivery to every hook the org
 * has active for it. Nothing is built when no Zap listens.
 */
export async function queueZapierTrigger<T extends ZapierTriggers>(
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
      integrationName: IntegratedApps.zapier,
      triggerKey: ZAPIER_DELIVERY,
      orgId,
      data: { trigger, hookUrl: hook.hookUrl, payload },
    };
    await integrationTriggerQueue.add(`zapier-${trigger}`, job, ZAPIER_JOB_OPTIONS);
  }
}

/**
 * Switches off one hook, in one statement, leaving every other subscription and
 * the rest of the credential alone. A read-modify-write here would race the
 * app's subscribe calls and the other hooks' deliveries.
 */
export async function deactivateZapierHook(orgId: string, hookUrl: string) {
  const now = new Date().toISOString();
  await prisma.$executeRaw`UPDATE "Integration" SET credential = jsonb_set(credential, '{triggerSubscriptions}', (SELECT COALESCE(jsonb_agg(CASE WHEN sub->>'hookUrl' = ${hookUrl} THEN sub || jsonb_build_object('active', false, 'updatedAt', ${now}::text) ELSE sub END ORDER BY i), '[]'::jsonb) FROM jsonb_array_elements(credential->'triggerSubscriptions') WITH ORDINALITY AS t(sub, i))) WHERE "orgId" = ${orgId}::uuid AND name = ${IntegratedApps.zapier} AND jsonb_typeof(credential->'triggerSubscriptions') = 'array'`;
}

/**
 * Posts one payload to one hook — the provider's `processJob`.
 *
 * Any 2xx is delivered. A 410 is Zapier saying the Zap is off or deleted, so
 * the hook is switched off and not retried. Anything else is thrown for the
 * queue to retry, and the hook is switched off once the last try fails.
 */
export async function deliverZapierHook(
  integration: Integration,
  job: ProviderJobData,
  { finalAttempt }: ProviderJobRunContext,
) {
  const { trigger, hookUrl, payload } = job.data as ZapierDeliveryJobData;
  // Unsubscribed or switched off while the job waited.
  if (!activeZapierHooks(integration.credential, trigger).some((h) => h.hookUrl === hookUrl)) {
    return;
  }

  try {
    await axios.post(hookUrl, payload, { timeout: POST_TIMEOUT_MS });
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status === 410 || finalAttempt) {
      log.warn(
        { integrationId: integration.id, trigger, status },
        "Switching off a Zapier hook that no longer accepts deliveries",
      );
      await deactivateZapierHook(job.orgId, hookUrl);
    }
    if (status === 410) return;
    throw error;
  }
}

/**
 * A job left on the old `zapierTriggerQueue` by a deploy before this one: the
 * job name is the trigger and `data` is keyed by it. Formats it the new way and
 * hands it to the per-hook deliveries. Remove with that queue's worker once it
 * has drained.
 */
export async function drainLegacyZapierJob(trigger: string, data: unknown, orgId: string) {
  if (!Object.values(ZapierTriggers).includes(trigger as ZapierTriggers)) {
    log.warn("Dropping a legacy Zapier job for unknown trigger %s", trigger);
    return;
  }
  const integration = await prisma.integration.findUnique({
    where: { orgid_integration_name_unique: { orgId, name: IntegratedApps.zapier } },
  });
  if (!integration?.active) return;

  let input = (data as Record<string, unknown> | null)?.[trigger];
  if (trigger === ZapierTriggers.NEW_TEAM_MEMBER_CREATED) {
    const invite = input as { isUser: boolean; name: string; email: string; team: unknown };
    input = { ...invite, isExistingUser: invite.isUser };
  }
  if (input === undefined) return;
  await queueZapierTrigger(integration, trigger as ZapierTriggers, input as never);
}
