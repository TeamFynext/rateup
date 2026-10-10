import { randomUUID } from "node:crypto";

import prisma from "../../../utils/prisma.js";
import {
  readZapierSubscriptions,
  type ZapierTriggers,
  type ZapierTriggerSubscription,
} from "../external/zapier/zapier.types.js";
import type { AutomationPlatform } from "./automation.platforms.js";

/**
 * Subscribes a hook URL to a trigger and returns the stored subscription, whose
 * `id` the platform uses to unsubscribe. Subscribing the same URL to the same
 * trigger again reactivates the existing one rather than adding a second.
 *
 * A read-modify-write of the credential, as the Zapier subscribe has always
 * been: subscriptions are made by hand, one at a time.
 */
export async function addAutomationHook(
  platform: AutomationPlatform,
  orgId: string,
  input: { hookUrl: string; trigger: ZapierTriggers },
): Promise<ZapierTriggerSubscription | null> {
  const where = { orgid_integration_name_unique: { orgId, name: platform } };
  const integration = await prisma.integration.findUnique({ where });
  if (!integration) return null;

  const now = new Date().toISOString();
  const subscriptions = [...readZapierSubscriptions(integration.credential)];
  const index = subscriptions.findIndex(
    (s) => s.hookUrl === input.hookUrl && s.subscribed_field === input.trigger,
  );

  let subscription: ZapierTriggerSubscription;
  if (index === -1) {
    subscription = {
      id: randomUUID(),
      hookUrl: input.hookUrl,
      subscribed_field: input.trigger,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    subscriptions.push(subscription);
  } else {
    // Rows saved before hooks had ids get one on their next subscribe.
    subscription = {
      ...subscriptions[index],
      id: subscriptions[index].id ?? randomUUID(),
      active: true,
      updatedAt: now,
    };
    subscriptions[index] = subscription;
  }

  await prisma.integration.update({
    where,
    data: {
      credential: {
        ...(integration.credential as Record<string, unknown>),
        triggerSubscriptions: subscriptions,
      } as never,
    },
  });
  return subscription;
}

/**
 * Removes one subscription by its id, in one statement, leaving the others and
 * the rest of the credential alone. Returns whether one was removed.
 */
export async function removeAutomationHookById(
  platform: AutomationPlatform,
  orgId: string,
  hookId: string,
): Promise<boolean> {
  const removed =
    await prisma.$executeRaw`UPDATE "Integration" SET credential = jsonb_set(credential, '{triggerSubscriptions}', (SELECT COALESCE(jsonb_agg(sub ORDER BY i), '[]'::jsonb) FROM jsonb_array_elements(credential->'triggerSubscriptions') WITH ORDINALITY AS t(sub, i) WHERE sub->>'id' IS DISTINCT FROM ${hookId})) WHERE "orgId" = ${orgId}::uuid AND name = ${platform} AND jsonb_typeof(credential->'triggerSubscriptions') = 'array' AND EXISTS (SELECT 1 FROM jsonb_array_elements(credential->'triggerSubscriptions') AS s(sub) WHERE sub->>'id' = ${hookId})`;
  return removed > 0;
}
