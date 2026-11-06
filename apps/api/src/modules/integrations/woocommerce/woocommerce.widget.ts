import { randomBytes } from "node:crypto";

import z from "zod";

import prisma from "../../../utils/prisma.js";
import connection from "../../../utils/redisConnection.js";
import { IntegratedApps } from "../../../types/enums.js";
import {
  countWidgetTap,
  DEFAULT_WIDGET_SETTINGS,
  resolveWidgetPhone,
  widgetStats,
  type StoreWidgetSettings,
} from "../commerce/storeWidget.js";
import { syncWooPluginConnection } from "./woocommerce.plugin.js";
import { readWooCredential } from "./woocommerce.types.js";

/**
 * WooCommerce's storefront WhatsApp button: the same editor and settings as
 * Shopify's, shown on the store by the RateUp plugin (Phase 2 of
 * WEB/rateup-wordpress-plugin-plan.md). The settings live in
 * `Integration.credential.widget` and reach the plugin with the rest of its
 * data (woocommerce.plugin.ts); taps come back to the public event route.
 */

/** A problem the merchant can fix, answered with `status` rather than a 500. */
export class WooWidgetError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "WooWidgetError";
  }
}

async function connectedWoo(orgId: string) {
  const integration = await prisma.integration.findUnique({
    where: { orgid_integration_name_unique: { orgId, name: IntegratedApps.woocommerce } },
  });
  const credential = integration?.active ? readWooCredential(integration.credential) : null;
  if (!integration || !credential) {
    throw new WooWidgetError("Connect a WooCommerce store first", 404);
  }
  return { integration, credential };
}

/** The button's settings, whether the plugin answered last time, and 30 days of taps. */
export async function getWooWidget(orgId: string) {
  const { credential } = await connectedWoo(orgId);
  return {
    settings: { ...DEFAULT_WIDGET_SETTINGS, ...credential.widget },
    /** False until the merchant has saved the button once. */
    configured: !!credential.widget,
    storeUrl: credential.storeUrl,
    /** Null until RateUp has tried to reach the plugin. */
    plugin: credential.plugin ?? null,
    stats: await widgetStats(orgId, "woocommerce"),
  };
}

/**
 * Saves the settings, then pushes them to the plugin. A store without the
 * plugin is not an error — the page says to install it; one that could not be
 * reached is, since the merchant expects the button to change now.
 */
export async function saveWooWidget(orgId: string, settings: StoreWidgetSettings) {
  const { integration, credential } = await connectedWoo(orgId);
  // Switching the button off must stay possible after its number is disconnected.
  if (settings.enabled && !(await resolveWidgetPhone(orgId, settings.channelId))) {
    throw new WooWidgetError("That WhatsApp number isn't connected. Choose another one.", 400);
  }

  const widgetKey = credential.widgetKey ?? randomBytes(16).toString("base64url");
  // Only these two keys are written, so a concurrent writer of the rest of the
  // credential (webhook ids, the customer switch) is not undone.
  await prisma.$executeRaw`UPDATE "Integration" SET credential = jsonb_set(jsonb_set(credential, '{widget}', ${JSON.stringify(settings)}::jsonb), '{widgetKey}', ${JSON.stringify(widgetKey)}::jsonb) WHERE id = ${integration.id}::uuid`;

  const push = await syncWooPluginConnection({
    ...integration,
    credential: { ...credential, widget: settings, widgetKey },
  });
  if (push === "failed") {
    throw new WooWidgetError(
      "Your settings were saved, but we couldn't reach your store. Try saving again in a moment.",
      502,
    );
  }
  return getWooWidget(orgId);
}

/** "Check again" after installing the plugin: pushes now and reports what happened. */
export async function checkWooPlugin(orgId: string) {
  const { integration } = await connectedWoo(orgId);
  await syncWooPluginConnection(integration);
  return getWooWidget(orgId);
}

// The plugin reports these (see class-rateup-widget.php); anything else is "other".
const WOO_WIDGET_PAGE_TYPES = ["home", "product", "collection", "cart", "page", "post", "search"];

/**
 * A tap reported by the plugin's script. It arrives from `sendBeacon` as
 * `text/plain` (no CORS preflight), so the body may still be a JSON string.
 */
export const wooWidgetEventSchema = z.preprocess(
  (body) => {
    if (typeof body !== "string") return body;
    try {
      return JSON.parse(body);
    } catch {
      return undefined;
    }
  },
  z.object({
    key: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
    event: z.enum(["open", "click"]),
    pageType: z
      .string()
      .max(60)
      .catch("")
      .transform((pageType) => (WOO_WIDGET_PAGE_TYPES.includes(pageType) ? pageType : "other")),
  }),
);

export type WooWidgetEvent = z.infer<typeof wooWidgetEventSchema>;

// Every tap names its store by key; remember which org a key belongs to (or
// that it belongs to none) rather than search the credentials on each one.
const KEY_ORG_CACHE_SECONDS = 5 * 60;
const keyOrgCacheKey = (key: string) => `woocommerce:widget-org:${key}`;

/** The org whose active WooCommerce connection holds this key, or null. */
async function findWidgetOrg(key: string) {
  try {
    const cached = await connection.get(keyOrgCacheKey(key));
    if (cached !== null) return cached || null;
  } catch {
    // Redis down: fall through to the database.
  }
  const integration = await prisma.integration.findFirst({
    where: {
      name: IntegratedApps.woocommerce,
      active: true,
      orgId: { not: null },
      credential: { path: ["widgetKey"], equals: key },
    },
    select: { orgId: true },
  });
  const orgId = integration?.orgId ?? null;
  try {
    await connection.set(keyOrgCacheKey(key), orgId ?? "", "EX", KEY_ORG_CACHE_SECONDS);
  } catch {
    // The cache is only an optimisation.
  }
  return orgId;
}

/** Counts one tap. Returns false for a key no active store holds. */
export async function recordWooWidgetTap({ key, event, pageType }: WooWidgetEvent) {
  const orgId = await findWidgetOrg(key);
  if (!orgId) return false;
  await countWidgetTap(orgId, "woocommerce", event, pageType);
  return true;
}
