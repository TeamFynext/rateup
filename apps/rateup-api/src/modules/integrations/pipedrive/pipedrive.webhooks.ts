import { randomBytes, timingSafeEqual } from "node:crypto";

import { isAxiosError, type AxiosInstance } from "axios";

import type { Integration } from "../../../../generated/prisma/client.js";
import { IntegratedApps } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import type { ProviderJobData } from "../providers/integrationProvider.types.js";
import {
  InboundWebhookRejected,
  inboundWebhookUrl,
  type InboundWebhookRequest,
} from "../shared/inboundWebhookContract.js";
import { pipedriveClientFor } from "./pipedrive.client.js";
import {
  readPipedriveCredential,
  type PipedriveCredential,
  type PipedriveObject,
  type PipedriveWebhookRef,
} from "./pipedrive.types.js";

/**
 * Pipedrive → RateUp deliveries (step 5.4).
 *
 * Each connected company gets two webhooks of its own, persons and deals, created
 * through the API and pointed at the shared receiver
 * (`/api/public/integrations/webhooks/pipedrive/:integrationId`). Pipedrive signs
 * nothing, so each webhook carries HTTP Basic credentials — a secret per
 * integration — and a delivery without them is refused.
 *
 * Pipedrive deletes a webhook after three days without a successful delivery, so
 * the scheduled credential refresh checks them and re-creates any that are gone;
 * the settings page has a repair button for the same.
 */

export const PIPEDRIVE_INBOUND = "inbound";

export const PIPEDRIVE_OBJECTS: readonly PipedriveObject[] = ["person", "deal"];

const HTTP_AUTH_USER = "rateup";

/** Several changes to one record within this window collapse into one job. */
const COALESCE_MS = 10_000;

export interface PipedriveInboundJobData {
  object: PipedriveObject;
  id: string;
  /** Pipedrive reported the record as new: only these may be imported. */
  created: boolean;
}

interface PipedriveWebhook {
  id: number;
  event_object: string;
  event_action: string;
  subscription_url: string;
  is_active?: number | boolean;
  version?: string;
}

/** A fresh secret for a new connection. */
export const newPipedriveWebhookSecret = () => randomBytes(24).toString("base64url");

/**
 * Makes sure each of {@link PIPEDRIVE_OBJECTS} has an active webhook to this
 * integration's address, creating any that are missing, and saves the list.
 */
export async function syncPipedriveWebhooks(
  integration: Pick<Integration, "id" | "credential">,
): Promise<PipedriveWebhookRef[]> {
  let credential = readPipedriveCredential(integration.credential);
  if (!credential) throw new Error("Pipedrive is not connected");
  const client = await pipedriveClientFor(integration);
  const url = inboundWebhookUrl(IntegratedApps.pipedrive, integration.id);

  // Connections made before webhooks existed have no secret yet.
  const secret = credential.webhookSecret ?? newPipedriveWebhookSecret();

  const response = await client.get<{ data?: PipedriveWebhook[] | null }>("/v1/webhooks");
  const existing = (response.data.data ?? []).filter(
    (hook) => hook.subscription_url === url && hook.is_active !== false && hook.is_active !== 0,
  );

  const kept: PipedriveWebhookRef[] = [];
  for (const object of PIPEDRIVE_OBJECTS) {
    const known = credential.webhooks?.find((ref) => ref.object === object);
    const live = existing.find((hook) => hook.id === known?.id && known.object === object);
    // Any other webhook to this address carries credentials RateUp no longer
    // holds; its deliveries would only be refused.
    for (const stale of existing.filter(
      (hook) => hook.event_object === object && hook.id !== live?.id,
    )) {
      await client.delete(`/v1/webhooks/${stale.id}`).catch(() => undefined);
    }
    if (live) {
      kept.push({ id: live.id, object });
      continue;
    }
    const created = await client.post<{ data: { id: number } }>("/v1/webhooks", {
      subscription_url: url,
      event_action: "*",
      event_object: object,
      http_auth_user: HTTP_AUTH_USER,
      http_auth_password: secret,
      version: "2.0",
    });
    kept.push({ id: created.data.data.id, object });
  }

  // Read-merge-write: settings saved meanwhile stay.
  const current = await prisma.integration.findUnique({
    where: { id: integration.id },
    select: { credential: true },
  });
  credential = readPipedriveCredential(current?.credential) ?? credential;
  await prisma.integration.update({
    where: { id: integration.id },
    data: { credential: { ...credential, webhookSecret: secret, webhooks: kept } as never },
  });
  return kept;
}

/** Deletes this integration's webhooks on disconnect. Best effort, one at a time. */
export async function removePipedriveWebhooks(
  integration: Pick<Integration, "id" | "credential">,
  client?: AxiosInstance,
) {
  const credential = readPipedriveCredential(integration.credential);
  if (!credential?.webhooks?.length) return;
  const api = client ?? (await pipedriveClientFor(integration));
  for (const { id } of credential.webhooks) {
    try {
      await api.delete(`/v1/webhooks/${id}`);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) continue;
      log.warn({ err: error, integrationId: integration.id }, "Could not remove webhook %d", id);
    }
  }
}

/** Whether the delivery carries this integration's Basic credentials. */
export function isPipedriveDeliveryAuthorized(
  authorization: string | undefined,
  secret: string | undefined,
) {
  if (!authorization || !secret) return false;
  const [scheme, encoded] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "basic" || !encoded) return false;
  const given = Buffer.from(encoded, "base64");
  const expected = Buffer.from(`${HTTP_AUTH_USER}:${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Pipedrive's v2 delivery, as far as routing it needs. */
interface PipedriveDelivery {
  meta?: {
    action?: string;
    entity?: string;
    entity_id?: string | number;
    company_id?: string | number;
    timestamp?: string;
  };
  data?: { id?: string | number } | null;
  previous?: { id?: string | number } | null;
}

/** Whether a delivery for this object can do anything with the switches as they are. */
function listening(credential: PipedriveCredential, object: PipedriveObject) {
  return object === "person"
    ? !!(credential.syncContacts || credential.importContacts)
    : !!(credential.syncDeals || credential.importDeals);
}

/**
 * The shared receiver's `handleInbound`: checks the Basic credentials, then queues
 * one job per record. The job reads the record itself, so the delivery's own copy
 * of it — possibly older than a later one — is never applied.
 */
export async function handlePipedriveInbound(
  integration: Integration,
  request: InboundWebhookRequest,
) {
  const credential = readPipedriveCredential(integration.credential);
  const authorization = request.headers.authorization;
  if (!credential || !isPipedriveDeliveryAuthorized(authorization, credential.webhookSecret)) {
    throw new InboundWebhookRejected("missing or wrong credentials");
  }

  const delivery = (request.body ?? {}) as PipedriveDelivery;
  const object = delivery.meta?.entity as PipedriveObject | undefined;
  if (!object || !PIPEDRIVE_OBJECTS.includes(object)) return;
  // A webhook for another company pointed here would be someone else's data.
  if (
    delivery.meta?.company_id !== undefined &&
    String(delivery.meta.company_id) !== String(credential.companyId)
  ) {
    log.warn({ integrationId: integration.id }, "Pipedrive delivery for another company; ignored");
    return;
  }
  if (!listening(credential, object)) return;

  const id = String(
    delivery.meta?.entity_id ?? delivery.data?.id ?? delivery.previous?.id ?? "",
  ).trim();
  if (!/^\d+$/.test(id)) return;

  const created = delivery.meta?.action === "create";
  const at = Date.parse(delivery.meta?.timestamp ?? "") || Date.now();
  const bucket = Math.floor(at / COALESCE_MS);
  const job: ProviderJobData<PipedriveInboundJobData> = {
    integrationName: IntegratedApps.pipedrive,
    triggerKey: PIPEDRIVE_INBOUND,
    orgId: integration.orgId ?? "",
    data: { object, id, created },
  };
  await integrationTriggerQueue.add(`pipedrive-${PIPEDRIVE_INBOUND}`, job, {
    // Same record, same window → one job (BullMQ ignores an add whose id exists).
    jobId: `pipedrive-in-${integration.id}-${object}-${id}-${bucket}${created ? "-c" : ""}`,
    delay: COALESCE_MS,
    attempts: 4,
    backoff: { type: "exponential", delay: 10_000 },
    removeOnComplete: true,
  });
}
