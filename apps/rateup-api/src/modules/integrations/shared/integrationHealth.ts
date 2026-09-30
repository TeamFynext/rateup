import type { Integration } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { notify } from "../../notification/notify.js";

/** Longest error kept on the row: enough to diagnose, short enough for a card. */
const MAX_ERROR_LENGTH = 500;

function describe(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, MAX_ERROR_LENGTH);
}

/**
 * Records a failure against an integration and, when the streak reaches
 * `notifyAfter`, tells the org's admins (those holding `notify.integrations`).
 *
 * Notifies once per streak — on the failure that reaches the threshold, not on
 * every one after it — so a provider that stays down does not flood the inbox.
 * Never throws: it runs on failure paths that are already reporting an error.
 */
export async function recordIntegrationFailure(
  integration: Pick<Integration, "id" | "orgId">,
  label: string,
  error: unknown,
  { notifyAfter }: { notifyAfter: number },
) {
  try {
    const message = describe(error);
    const updated = await prisma.integration.update({
      where: { id: integration.id },
      data: {
        lastError: message,
        lastErrorAt: new Date(),
        consecutiveFailures: { increment: 1 },
      },
      select: { consecutiveFailures: true },
    });

    if (integration.orgId && updated.consecutiveFailures === notifyAfter) {
      await notify({
        event: "integration.error",
        orgId: integration.orgId,
        audience: { kind: "permitted" },
        data: { integration: label, error: message },
      });
    }
  } catch (err) {
    log.error({ err, integrationId: integration.id }, "Could not record an integration failure");
  }
}

/** Clears a failure streak. Skips the write when there is nothing to clear. */
export async function markIntegrationHealthy(
  integration: Pick<Integration, "id" | "consecutiveFailures">,
) {
  if (!integration.consecutiveFailures) return;
  try {
    await prisma.integration.update({
      where: { id: integration.id },
      data: { consecutiveFailures: 0, lastError: null, lastErrorAt: null },
    });
  } catch (err) {
    log.error({ err, integrationId: integration.id }, "Could not clear an integration failure");
  }
}
