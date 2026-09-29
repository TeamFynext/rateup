import { createHash } from "node:crypto";

import prisma from "../../../utils/prisma.js";

/** The Rateup side of a link. Free-form so a provider can add its own kinds. */
export type LinkedEntityType = "contact" | "lead" | "deal" | "order" | (string & {});

interface LinkKey {
  integrationId: string;
  entityType: LinkedEntityType;
}

/**
 * A stable hash of a sync payload: keys are sorted at every level, so two
 * payloads with the same content hash the same whatever order they were built
 * in. `undefined` values are dropped, as JSON would drop them.
 */
export function hashSyncPayload(payload: unknown): string {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export function findLinkByRateupId({ integrationId, entityType }: LinkKey, rateupId: string) {
  return prisma.integrationEntityLink.findUnique({
    where: {
      integration_entity_rateup_unique: { integrationId, entityType, rateupId },
    },
  });
}

export function findLinkByExternalId({ integrationId, entityType }: LinkKey, externalId: string) {
  return prisma.integrationEntityLink.findUnique({
    where: {
      integration_entity_external_unique: { integrationId, entityType, externalId },
    },
  });
}

/**
 * Records that `rateupId` is mirrored as `externalId`, after a push or a pull.
 *
 * Pass the payload that was pushed to the provider (or received from it) so the
 * next inbound change can be compared against it — see {@link isEchoOfLastSync}.
 * Upserts on the Rateup side: a record re-created remotely gets its new id.
 */
export function recordLink(
  { integrationId, entityType }: LinkKey,
  link: { rateupId: string; externalId: string; payload?: unknown },
) {
  const synced = {
    externalId: link.externalId,
    lastSyncedAt: new Date(),
    lastSyncHash: link.payload === undefined ? null : hashSyncPayload(link.payload),
  };
  return prisma.integrationEntityLink.upsert({
    where: {
      integration_entity_rateup_unique: { integrationId, entityType, rateupId: link.rateupId },
    },
    create: { integrationId, entityType, rateupId: link.rateupId, ...synced },
    update: synced,
  });
}

/**
 * True when an inbound change carries exactly what Rateup last pushed for this
 * record — our own write coming back through the provider's webhook. Applying
 * it would change nothing and, worse, fire another outbound push, so two-way
 * syncs skip it; that is what stops the ping-pong.
 *
 * Providers must hash the same fields in both directions — the ones they map —
 * or nothing will ever match.
 */
export async function isEchoOfLastSync(
  key: LinkKey,
  externalId: string,
  inboundPayload: unknown,
): Promise<boolean> {
  const link = await findLinkByExternalId(key, externalId);
  return !!link?.lastSyncHash && link.lastSyncHash === hashSyncPayload(inboundPayload);
}
