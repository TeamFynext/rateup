import { randomBytes, timingSafeEqual } from "node:crypto";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { parsePhoneNumber } from "libphonenumber-js";
import z from "zod";

import type { Integration, Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { IntegratedApps } from "../../../types/enums.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import type {
  IntegrationProvider,
  ProviderJobData,
} from "../providers/integrationProvider.types.js";
import {
  InboundWebhookRejected,
  inboundWebhookUrl,
  type InboundWebhookRequest,
} from "../shared/inboundWebhookContract.js";
import { IntegrationConnectError } from "../shared/oauthConnectError.js";

/**
 * Petpooja POS: an order Petpooja posts to the org's own webhook URL (the shared
 * receiver, `handleInbound`) becomes a WhatsApp template to the customer, sent
 * at once. Sending lives in `petpooja.send.ts`, loaded on use, because it
 * reaches the WhatsApp senders.
 *
 * Connected by saving a restaurant on the settings page; there is no remote
 * side to set up or tear down, and it acts on no RateUp event.
 */
const PROVIDER = IntegratedApps.petpooja;

/** Provider job: one Petpooja order to message the customer about. */
export const PETPOOJA_ORDER = "petpooja-order";

export interface PetpoojaOrderJobData {
  name: string;
  /** Country code and number, no "+", as `Contact.phone` stores it. */
  phone: string;
}

/** Entries kept in the credential's history; the oldest go first. */
export const PETPOOJA_HISTORY_LIMIT = 200;

/**
 * Petpooja publishes no payload docs, so there is no order id to deduplicate on.
 * Instead a second order message to the same phone inside this window is
 * skipped — which also absorbs a webhook Petpooja retries.
 */
export const PETPOOJA_DEDUPE_WINDOW_MS = 10 * 60 * 1000;

export type PetpoojaHistoryEntry = NonNullable<petPoojaCredential["history"]>[number];

/** Reads the credential; the column is `Json`, so this is asserted once here. */
export function readPetpoojaCredential(credential: unknown): Partial<petPoojaCredential> {
  return credential && typeof credential === "object"
    ? (credential as Partial<petPoojaCredential>)
    : {};
}

/** The order webhook Petpooja posts; only the restaurant and customer are read. */
export interface PetpoojaWebhookBody {
  properties?: {
    Restaurant?: { restID?: string | number };
    Customer?: { name?: string; phone?: string | number };
  };
}

const whereOrg = (orgId: string) => ({
  orgid_integration_name_unique: { orgId, name: PROVIDER },
});

// ---------------------------------------------------------------------------
// The credential, written under a row lock
// ---------------------------------------------------------------------------

/**
 * Rewrites a Petpooja integration's credential under a lock on the row. The
 * webhook appends to the history, the send records how it went and the
 * settings page changes the configuration — all in the same JSON column — so
 * without the lock one would silently drop another's change.
 *
 * `change` gets the current credential and returns the new one plus anything
 * the caller needs back. Keep it free of slow work: it runs inside the
 * transaction. The history is trimmed to the newest entries on the way out.
 */
export async function updatePetpoojaCredential<T>(
  integrationId: string,
  change: (credential: Partial<petPoojaCredential>) => {
    credential: Partial<petPoojaCredential>;
    result: T;
  },
): Promise<T | null> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Integration" WHERE id = ${integrationId}::uuid FOR UPDATE`;
    const row = await tx.integration.findUnique({
      where: { id: integrationId },
      select: { credential: true },
    });
    if (!row) return null;

    const { credential, result } = change(readPetpoojaCredential(row.credential));
    await tx.integration.update({
      where: { id: integrationId },
      data: {
        credential: {
          ...credential,
          history: (credential.history ?? []).slice(-PETPOOJA_HISTORY_LIMIT),
        } as unknown as Prisma.InputJsonValue,
      },
    });
    return result;
  });
}

/** {@link updatePetpoojaCredential}, for a change to the history alone. */
export function updatePetpoojaHistory<T>(
  integrationId: string,
  change: (history: PetpoojaHistoryEntry[]) => { history: PetpoojaHistoryEntry[]; result: T },
): Promise<T | null> {
  return updatePetpoojaCredential(integrationId, (credential) => {
    const { history, result } = change([...(credential.history ?? [])]);
    return { credential: { ...credential, history }, result };
  });
}

// ---------------------------------------------------------------------------
// The order webhook
// ---------------------------------------------------------------------------

const ORDER_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 10_000 },
};

/**
 * An order Petpooja posted to this org's webhook URL, on the shared receiver.
 * Petpooja signs nothing, so the URL's own token is the proof: without it, anyone
 * who knew a restaurant id could make RateUp send that org's paid template to
 * any number.
 *
 * Anything that is not an order we can act on — another restaurant, no usable
 * phone — is dropped with a log line and still answered 200, so Petpooja does
 * not keep retrying it.
 */
export async function handlePetpoojaInbound(
  integration: Integration,
  request: InboundWebhookRequest,
) {
  const credential = readPetpoojaCredential(integration.credential);
  const given = (request.query as { token?: string } | undefined)?.token ?? "";
  const expected = credential.inbound?.token ?? "";
  if (
    !expected ||
    given.length !== expected.length ||
    !timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  ) {
    throw new InboundWebhookRejected("Missing or wrong token");
  }

  const body = (request.body ?? {}) as PetpoojaWebhookBody;
  const restaurantId = String(body.properties?.Restaurant?.restID ?? "");
  if (credential.restaurantId && restaurantId !== String(credential.restaurantId)) {
    log.info({ integrationId: integration.id }, "Petpooja order for another restaurant; ignored");
    return;
  }

  const rawPhone = String(body.properties?.Customer?.phone ?? "");
  let phone: string | null = null;
  try {
    const parsed = rawPhone ? parsePhoneNumber(rawPhone, "IN") : null;
    if (parsed?.isValid()) phone = `${parsed.countryCallingCode}${parsed.nationalNumber}`;
  } catch {
    phone = null;
  }
  if (!phone) {
    log.info({ integrationId: integration.id }, "Petpooja order has no usable phone; ignored");
    return;
  }

  const job: ProviderJobData<PetpoojaOrderJobData> = {
    integrationName: PROVIDER,
    triggerKey: PETPOOJA_ORDER,
    orgId: integration.orgId ?? "",
    data: { name: String(body.properties?.Customer?.name ?? ""), phone },
  };
  await integrationTriggerQueue.add(PETPOOJA_ORDER, job, ORDER_JOB_OPTIONS);
}

/**
 * The shared address every org was told to paste before each got its own. It
 * never sent anything (the send was switched off in Oct 2024), and with nothing
 * in it to prove who is calling it must not start now: it answers 200 so
 * Petpooja stops retrying, and logs so a still-configured restaurant shows up.
 */
export async function legacyPetpoojaWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  const restaurantId = (request.body as { properties?: { Restaurant?: { restID?: unknown } } })
    ?.properties?.Restaurant?.restID;
  log.warn(
    { restaurantId },
    "Petpooja order on the legacy shared URL; ignored. The org must paste its own URL from the settings page.",
  );
  return reply.code(200).send("Success: The API call executed successfully.");
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface PetpoojaSettingsInput {
  restaurantId?: string;
  /** null clears the order message. */
  orderEvent?: petPoojaCredential["orderEvent"] | null;
}

/** The org's row, created on first save. */
async function ensureIntegration(orgId: string) {
  return prisma.integration.upsert({
    where: whereOrg(orgId),
    create: { orgId, name: PROVIDER, credential: {} },
    update: {},
    select: { id: true },
  });
}

/**
 * Saves the restaurant and the order message. Merged into the stored credential
 * on the server, so the history and the webhook token are never sent back and
 * forth — a save from a page opened an hour ago cannot wipe what arrived since.
 */
export async function savePetpoojaSettings(orgId: string, input: PetpoojaSettingsInput) {
  const restaurantId = input.restaurantId?.trim();
  if (restaurantId) {
    // A restaurant belongs to one org: orders are routed by the org's own URL, but
    // two orgs claiming one restaurant means one of them was given the wrong id.
    const taken = await prisma.integration.findFirst({
      where: {
        name: PROVIDER,
        active: true,
        orgId: { not: orgId },
        credential: { path: ["restaurantId"], equals: restaurantId },
      },
      select: { id: true },
    });
    if (taken) {
      throw new IntegrationConnectError(
        "This Petpooja restaurant is already connected to another RateUp workspace.",
        409,
      );
    }
  }

  const { id } = await ensureIntegration(orgId);
  await updatePetpoojaCredential(id, (credential) => {
    const next = { ...credential };
    if (restaurantId) next.restaurantId = restaurantId;
    if (input.orderEvent === null) delete next.orderEvent;
    else if (input.orderEvent) next.orderEvent = input.orderEvent;
    return { credential: next, result: null };
  });
}

const newToken = () => randomBytes(24).toString("base64url");

/**
 * This org's order webhook URL, issuing its token on first ask. `rotate` replaces
 * the token, so the old URL stops working at once.
 */
export async function getPetpoojaWebhookUrl(orgId: string, { rotate = false } = {}) {
  const { id } = await ensureIntegration(orgId);
  const token = await updatePetpoojaCredential(id, (credential) => {
    const current = credential.inbound?.token;
    const token = !rotate && current ? current : newToken();
    return { credential: { ...credential, inbound: { token } }, result: token };
  });
  return { url: `${inboundWebhookUrl(PROVIDER, id)}?token=${token}` };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const orderEventSchema = z
  .object({
    waTemplateId: z.string().trim().min(1),
    teamId: z.string().trim().min(1),
  })
  .strict();

const settingsSchema = z
  .object({
    restaurantId: z.string().trim().min(1).max(100).optional(),
    orderEvent: orderEventSchema.nullable().optional(),
  })
  .strict();
type SettingsBody = z.infer<typeof settingsSchema>;

const webhookUrlSchema = z.object({ rotate: z.boolean().optional() }).strict();
type WebhookUrlBody = z.infer<typeof webhookUrlSchema>;

function fail(reply: FastifyReply, error: unknown, what: string) {
  if (error instanceof IntegrationConnectError) {
    return reply.code(error.statusCode).send({ error: error.message });
  }
  log.error({ err: error }, "Petpooja %s failed", what);
  return reply.code(500).send({ error: "Something went wrong" });
}

/**
 * Under `/api/integrations/petpooja`, inheriting the integrations module's
 * permissions (writes need `integrations.manage`). Disconnecting is the generic
 * `DELETE /api/integrations/petpooja`.
 */
export async function petpoojaRoutes(server: FastifyInstance) {
  server.put<{ Body: SettingsBody }>(
    "/settings",
    { schema: { body: settingsSchema } },
    async (request: FastifyRequest<{ Body: SettingsBody }>, reply) => {
      try {
        await savePetpoojaSettings(request.user.orgId, request.body);
        return reply.send({ success: true });
      } catch (error) {
        return fail(reply, error, "settings save");
      }
    },
  );

  server.post<{ Body: WebhookUrlBody }>(
    "/webhook-url",
    { schema: { body: webhookUrlSchema } },
    async (request: FastifyRequest<{ Body: WebhookUrlBody }>, reply) => {
      try {
        return reply.send(
          await getPetpoojaWebhookUrl(request.user.orgId, { rotate: request.body?.rotate }),
        );
      } catch (error) {
        return fail(reply, error, "webhook URL");
      }
    },
  );
}

// ---------------------------------------------------------------------------
// The provider
// ---------------------------------------------------------------------------

export const petpoojaProvider: IntegrationProvider = {
  name: PROVIDER,
  label: "Petpooja",
  auth: "custom",
  connection: "integration",
  events: [],
  subscribedEvents: () => [],
  async handleEvent() {},

  handleInbound: handlePetpoojaInbound,

  async processJob(integration, job) {
    if (job.triggerKey !== PETPOOJA_ORDER) return;
    // Imported on use: it reaches the WhatsApp senders, which the registry must
    // not load for every provider.
    const { processPetpoojaOrder } = await import("./petpooja.send.js");
    await processPetpoojaOrder(integration, job.data as PetpoojaOrderJobData);
  },
};
