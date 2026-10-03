import { randomBytes } from "node:crypto";

import type { Integration } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { IntegratedApps } from "../../../types/enums.js";
import { inboundWebhookUrl } from "../shared/inboundWebhookContract.js";
import { markIntegrationHealthy, recordIntegrationFailure } from "../shared/integrationHealth.js";
import { signOAuthState, verifyOAuthState } from "../shared/oauth2.js";
import {
  createWooClient,
  createWooWebhook,
  deleteWooWebhook,
  detectWooCommerce,
  getWooDefaultCountry,
  getWooSystemStatus,
  getWooWebhook,
  isWooNotFound,
  isWooUnauthorized,
  searchWooProducts,
  type WooAuthMode,
  type WooKeys,
} from "./woocommerce.client.js";
import {
  readWooCredential,
  WOO_TOPICS,
  type WooAuthCallbackBody,
  type WooCredential,
  type WooWebhookRef,
} from "./woocommerce.types.js";
import { assertPublicStore, normaliseStoreUrl, WooStoreUrlError } from "./woocommerce.url.js";

/**
 * Connecting a store, with WooCommerce's own key exchange (`/wc-auth/v1/authorize`):
 *
 * 1. The admin enters the store's address; {@link startWooConnect} checks it is
 *    a public WooCommerce store and returns the authorize URL.
 * 2. The admin approves RateUp in their WordPress admin. WooCommerce creates a
 *    read/write key and POSTs it, server to server, to our callback —
 *    {@link completeWooConnect} — with the `user_id` we sent it, which is our
 *    signed state naming the org and the store.
 * 3. WooCommerce sends the admin back to their integration page.
 *
 * The keys are proven against the store before they are saved, and the store
 * address comes from the signed state, never from the callback body: a key for
 * one store cannot be attached to an org under another's name.
 */

const PROVIDER = IntegratedApps.woocommerce;
const APP_NAME = "RateUp";

/** A connect that failed in a way worth telling the admin (or WooCommerce) about. */
export class WooConnectError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 401 | 502,
  ) {
    super(message);
    this.name = "WooConnectError";
  }
}

/** Where WooCommerce sends the admin afterwards; it appends `success=1` or `success=0`. */
export function wooReturnUrl() {
  // From the environment, not `config.ts`: that module loads the auth setup and,
  // through it, half the services — too much for the registry to drag in.
  return `${process.env.FRONTEND_URL ?? ""}/dashboard/settings/integrations/woocommerce`;
}

/** Where WooCommerce POSTs the key. Must be HTTPS, or WooCommerce refuses to call it. */
export function wooCallbackUrl() {
  return `${process.env.API_URL ?? ""}/api/public/integrations/woocommerce/auth-callback`;
}

const whereOrg = (orgId: string) => ({
  orgid_integration_name_unique: { orgId, name: PROVIDER },
});

export async function startWooConnect(
  orgId: string,
  userId: string | undefined,
  input: string,
): Promise<string> {
  const storeUrl = normaliseStoreUrl(input);
  await assertPublicStore(storeUrl);

  const detected = await detectWooCommerce(storeUrl);
  if (!detected.found) {
    throw new WooStoreUrlError(
      detected.reason === "no_woocommerce"
        ? "WordPress answers at that address, but WooCommerce is not active on it."
        : "We could not reach a WordPress site at that address. Check it, and that pretty permalinks are on (Settings › Permalinks).",
    );
  }

  const url = new URL(`${storeUrl}/wc-auth/v1/authorize`);
  url.searchParams.set("app_name", APP_NAME);
  url.searchParams.set("scope", "read_write");
  url.searchParams.set(
    "user_id",
    signOAuthState({ orgId, provider: PROVIDER, userId, context: storeUrl }),
  );
  url.searchParams.set("return_url", wooReturnUrl());
  url.searchParams.set("callback_url", wooCallbackUrl());
  return url.toString();
}

/**
 * Which way this store accepts the keys: Basic first, query parameters if the
 * host swallows the Authorization header. A refusal both ways is a bad key.
 */
async function negotiateAuthMode(keys: WooKeys): Promise<WooAuthMode> {
  for (const authMode of ["basic", "query"] as const) {
    try {
      await getWooSystemStatus(createWooClient({ ...keys, authMode }));
      return authMode;
    } catch (error) {
      if (!isWooUnauthorized(error)) {
        throw new WooConnectError("The store could not be reached to check the key.", 502);
      }
    }
  }
  throw new WooConnectError("The store refused the key it just issued.", 401);
}

export async function completeWooConnect(body: WooAuthCallbackBody): Promise<void> {
  let state;
  try {
    state = verifyOAuthState(String(body.user_id ?? ""), PROVIDER);
  } catch (error) {
    throw new WooConnectError(error instanceof Error ? error.message : "Invalid state", 401);
  }
  const storeUrl = state.context;
  if (!storeUrl) throw new WooConnectError("The connect request named no store.", 400);
  if (body.key_permissions !== "read_write") {
    throw new WooConnectError("RateUp needs a read/write key.", 400);
  }

  const keys: WooKeys = {
    storeUrl,
    consumerKey: body.consumer_key,
    consumerSecret: body.consumer_secret,
  };
  const authMode = await negotiateAuthMode(keys);
  const client = createWooClient({ ...keys, authMode });

  // Informational, so neither may fail the connect.
  const [status, country, detected] = await Promise.all([
    getWooSystemStatus(client).catch(() => undefined),
    getWooDefaultCountry(client).catch(() => undefined),
    detectWooCommerce(storeUrl),
  ]);

  // Reconnecting — the same store or another — replaces the old connection;
  // its webhooks go first, or the old store would keep delivering.
  const existing = await prisma.integration.findUnique({ where: whereOrg(state.orgId) });
  const previous = existing ? readWooCredential(existing.credential) : null;
  if (previous) await removeWooWebhooks(previous);

  const credential: WooCredential = {
    storeUrl,
    consumerKey: body.consumer_key,
    consumerSecret: body.consumer_secret,
    keyId: Number(body.key_id) || undefined,
    keyPermissions: body.key_permissions,
    authMode,
    webhookSecret: randomBytes(32).toString("base64url"),
    webhooks: [],
    store: {
      name: detected.found ? detected.name : undefined,
      currency: status?.settings?.currency,
      country,
      wcVersion: status?.environment?.version,
    },
    connectedAt: new Date().toISOString(),
    // Reconnecting the same store keeps the admin's choices; another store starts over.
    ...(previous?.storeUrl === storeUrl && { syncCustomers: previous.syncCustomers }),
  };

  const integration = await prisma.integration.upsert({
    where: whereOrg(state.orgId),
    create: { orgId: state.orgId, name: PROVIDER, credential: { ...credential }, active: true },
    update: {
      credential: { ...credential },
      active: true,
      lastError: null,
      lastErrorAt: null,
      consecutiveFailures: 0,
    },
  });

  // The connection stands even if a webhook will not register: the page shows
  // which are missing and offers to retry, which beats making the admin approve
  // the whole thing again.
  try {
    await syncWooWebhooks(integration);
  } catch (error) {
    log.warn({ err: error, orgId: state.orgId }, "WooCommerce webhooks did not all register");
    await recordIntegrationFailure(integration, "WooCommerce", error, { notifyAfter: 1 });
  }
}

/**
 * Makes sure each of {@link WOO_TOPICS} has an active webhook on the store
 * pointing at this integration, creating or replacing any that are missing,
 * paused, disabled (WooCommerce disables one after repeated failed deliveries)
 * or pointing elsewhere. Saves what it registered even when it fails part-way.
 */
export async function syncWooWebhooks(integration: Integration): Promise<WooWebhookRef[]> {
  const credential = readWooCredential(integration.credential);
  if (!credential) throw new Error("WooCommerce integration has no usable credential");

  const client = createWooClient(credential);
  const deliveryUrl = inboundWebhookUrl(PROVIDER, integration.id);
  const kept: WooWebhookRef[] = [];

  try {
    for (const topic of WOO_TOPICS) {
      const ref = credential.webhooks.find((webhook) => webhook.topic === topic);
      if (ref) {
        try {
          const hook = await getWooWebhook(client, ref.id);
          if (
            hook.status === "active" &&
            hook.topic === topic &&
            hook.delivery_url === deliveryUrl
          ) {
            kept.push(ref);
            continue;
          }
          await deleteWooWebhook(client, ref.id).catch(() => undefined);
        } catch (error) {
          if (!isWooNotFound(error)) throw error;
        }
      }

      const created = await createWooWebhook(client, {
        name: `RateUp: ${topic}`,
        topic,
        delivery_url: deliveryUrl,
        secret: credential.webhookSecret,
      });
      kept.push({ topic, id: created.id });
    }
  } finally {
    await prisma.integration.update({
      where: { id: integration.id },
      data: { credential: { ...credential, webhooks: kept } },
    });
  }

  return kept;
}

/** Best-effort: a store that is gone, or a key that was revoked, must not block a disconnect. */
export async function removeWooWebhooks(credential: WooCredential): Promise<void> {
  const client = createWooClient(credential);
  for (const { id } of credential.webhooks) {
    try {
      await deleteWooWebhook(client, id);
    } catch (error) {
      if (!isWooNotFound(error)) {
        log.warn({ err: error, storeUrl: credential.storeUrl }, "Could not remove webhook %d", id);
      }
    }
  }
}

/**
 * The connection as the settings page shows it. Never the keys: the page has
 * no use for them, and the generic `GET /integrations/:name` would send them.
 */
export async function getWooStatus(orgId: string) {
  const integration = await prisma.integration.findUnique({ where: whereOrg(orgId) });
  const credential = integration?.active ? readWooCredential(integration.credential) : null;
  if (!integration || !credential) return { connected: false as const };

  return {
    connected: true as const,
    storeUrl: credential.storeUrl,
    store: credential.store ?? {},
    keyId: credential.keyId ?? null,
    connectedAt: credential.connectedAt,
    settings: { syncCustomers: credential.syncCustomers ?? false },
    webhooks: WOO_TOPICS.map((topic) => ({
      topic,
      registered: credential.webhooks.some((webhook) => webhook.topic === topic),
    })),
    health: {
      consecutiveFailures: integration.consecutiveFailures,
      lastError: integration.lastError,
      lastErrorAt: integration.lastErrorAt,
    },
  };
}

/** Re-registers missing webhooks from the settings page. */
export async function repairWooWebhooks(orgId: string) {
  const integration = await prisma.integration.findUnique({ where: whereOrg(orgId) });
  if (!integration?.active || !readWooCredential(integration.credential)) {
    throw new WooConnectError("WooCommerce is not connected.", 400);
  }
  await syncWooWebhooks(integration);
  await markIntegrationHealthy(integration);
  return getWooStatus(orgId);
}

export interface WooSettings {
  syncCustomers?: boolean;
}

/** The admin's switches, kept in the credential beside the connection. */
export async function updateWooSettings(orgId: string, settings: WooSettings) {
  const integration = await prisma.integration.findUnique({ where: whereOrg(orgId) });
  const credential = integration?.active ? readWooCredential(integration.credential) : null;
  if (!integration || !credential) throw new WooConnectError("WooCommerce is not connected.", 400);

  await prisma.integration.update({
    where: { id: integration.id },
    data: { credential: { ...credential, ...settings } as never },
  });
  return getWooStatus(orgId);
}

/** Products for the automation builder's picker: id, name and a thumbnail. */
export async function listWooProducts(orgId: string, search: string) {
  const integration = await prisma.integration.findUnique({ where: whereOrg(orgId) });
  const credential = integration?.active ? readWooCredential(integration.credential) : null;
  if (!credential) throw new WooConnectError("WooCommerce is not connected.", 400);

  const products = await searchWooProducts(createWooClient(credential), search.trim());
  return products.map((product) => ({
    id: String(product.id),
    name: product.name,
    image: product.images?.[0]?.src ?? null,
  }));
}
