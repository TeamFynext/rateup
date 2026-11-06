import type { Integration } from "../../../../generated/prisma/client.js";
import { IntegratedApps } from "../../../../types/enums.js";
import { log } from "../../../../utils/logger.js";
import prisma from "../../../../utils/prisma.js";
import {
  AUTOMATION_JOB_OPTIONS,
  deactivateAutomationHook,
  deliverAutomationHook,
  queueAutomationTrigger,
} from "../../automation/automation.deliver.js";
import type {
  ProviderJobData,
  ProviderJobRunContext,
} from "../../providers/integrationProvider.types.js";
import type { ZapierTriggerInput } from "./zapier.payloads.js";
import { ZapierTriggers } from "./zapier.types.js";

/** Zapier's deliveries: the shared automation-platform ones (`automation.deliver.ts`), for Zapier. */
export const ZAPIER_JOB_OPTIONS = AUTOMATION_JOB_OPTIONS;

export function queueZapierTrigger<T extends ZapierTriggers>(
  integration: Pick<Integration, "orgId" | "credential">,
  trigger: T,
  input: ZapierTriggerInput[T],
) {
  return queueAutomationTrigger(IntegratedApps.zapier, integration, trigger, input);
}

export function deactivateZapierHook(orgId: string, hookUrl: string) {
  return deactivateAutomationHook(IntegratedApps.zapier, orgId, hookUrl);
}

export function deliverZapierHook(
  integration: Integration,
  job: ProviderJobData,
  context: ProviderJobRunContext,
) {
  return deliverAutomationHook(IntegratedApps.zapier, integration, job, context);
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
    where: {
      orgid_integration_name_unique: { orgId, name: IntegratedApps.zapier },
    },
  });
  if (!integration?.active) return;

  let input = (data as Record<string, unknown> | null)?.[trigger];
  if (trigger === ZapierTriggers.NEW_TEAM_MEMBER_CREATED) {
    const invite = input as {
      isUser: boolean;
      name: string;
      email: string;
      team: unknown;
    };
    input = { ...invite, isExistingUser: invite.isUser };
  }
  if (input === undefined) return;
  await queueZapierTrigger(integration, trigger as ZapierTriggers, input as never);
}
