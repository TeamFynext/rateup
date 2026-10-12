import prisma from "../../../utils/prisma.js";
import connection from "../../../utils/redisConnection.js";
import { log } from "../../../utils/logger.js";
import { API_URL } from "../../../utils/constants/constants.js";
import { IntegratedApps, WhatsappSettingsStatus } from "../../../types/enums.js";
import shopify from "./shopify.config.js";
import { getShopifyInfo } from "./shopify.credential.js";
import { getActiveShopifySession } from "./shopify.session.js";
import type { ShopifyWidgetEvent, ShopifyWidgetSettings } from "./shopify.schema.js";

/**
 * The storefront WhatsApp button (extensions/whatsapp-widget).
 *
 * The merchant edits its settings in RateUp; they are stored in
 * `Integration.credential.widget` and copied to an app-data metafield on the
 * shop's app installation, which the theme app extension reads in Liquid
 * (`app.metafields.rateup.widget`). So the storefront never calls RateUp to
 * render the button, and a metafield the app owns on its own installation needs
 * no access scope.
 */

const METAFIELD_NAMESPACE = "rateup";
const METAFIELD_KEY = "widget";
/** The app embed block's file name in extensions/whatsapp-widget/blocks. */
const EMBED_HANDLE = "whatsapp-embed";
export const WIDGET_EVENT_ROUTE = "/api/public/integrations/shopify/widget/event";
const STATS_DAYS = 30;
// Every tap names its shop; remember which org a shop belongs to (or that it
// belongs to none) rather than search the credentials on each one.
const SHOP_ORG_CACHE_SECONDS = 5 * 60;

export const DEFAULT_WIDGET_SETTINGS: ShopifyWidgetSettings = {
  enabled: false,
  channelId: null,
  buttonLabel: "Chat on WhatsApp",
  greeting: "Hi! How can we help you?",
  prefill: "Hi! I have a question.",
  productPrefill: "Hi! I have a question about {product}: {url}",
  color: "#25D366",
  position: "right",
  offsetY: 20,
  showOn: ["all"],
  hideOnMobile: false,
};

/** A problem the merchant can fix, answered with `status` rather than a 500. */
export class ShopifyWidgetError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ShopifyWidgetError";
  }
}

/** What the storefront script receives. Public: holds the number, never an internal id. */
export interface ShopifyWidgetPayload extends Omit<ShopifyWidgetSettings, "channelId"> {
  /** Digits only, as wa.me expects. Empty when the number is gone or disconnected. */
  phone: string;
  eventUrl: string;
}

/** The connected WhatsApp number behind a channel, digits only, or null. */
async function resolveWidgetPhone(orgId: string, channelId: string | null) {
  if (!channelId) return null;
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, orgId, platform: "WHATSAPP" },
    select: { status: true, whatsapp: { select: { phone: true, status: true } } },
  });
  if (
    !channel?.whatsapp?.phone ||
    channel.status !== WhatsappSettingsStatus.ACTIVE ||
    channel.whatsapp.status !== WhatsappSettingsStatus.ACTIVE
  ) {
    return null;
  }
  return channel.whatsapp.phone.replace(/\D/g, "") || null;
}

export function buildWidgetPayload(
  settings: ShopifyWidgetSettings,
  phone: string | null,
): ShopifyWidgetPayload {
  const { channelId: _internal, ...rest } = settings;
  return {
    ...rest,
    // A number that has since been disconnected hides the button instead of
    // sending shoppers to a chat nobody receives.
    enabled: settings.enabled && !!phone,
    phone: phone ?? "",
    eventUrl: `${API_URL}${WIDGET_EVENT_ROUTE}`,
  };
}

/**
 * Writes the saved settings to the shop's app-data metafield. Does nothing for
 * an integration whose widget was never saved.
 */
export async function syncWidgetMetafield(integration: ShopifyIntegration) {
  if (!shopify) throw new Error("Shopify integration is not configured");
  const settings = integration.credential?.widget;
  if (!settings || !integration.orgId) return;

  const phone = await resolveWidgetPhone(integration.orgId, settings.channelId);
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(integration),
  });

  const installation = await client.request<{ currentAppInstallation: { id: string } | null }>(
    `query { currentAppInstallation { id } }`,
  );
  const ownerId = installation.data?.currentAppInstallation?.id;
  if (!ownerId) throw new Error("Shopify returned no app installation for the shop");

  const response = await client.request<{
    metafieldsSet: { userErrors: { field: string[] | null; message: string }[] };
  }>(
    `mutation setWidgetMetafield($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        metafields: [
          {
            ownerId,
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
            type: "json",
            value: JSON.stringify(buildWidgetPayload(settings, phone)),
          },
        ],
      },
    },
  );
  const userErrors = response.data?.metafieldsSet?.userErrors ?? [];
  if (userErrors.length) {
    throw new Error(
      `Error saving the widget metafield: ${userErrors.map((e) => e.message).join("; ")}`,
    );
  }
}

/** UTC midnight `daysAgo` days back: the `date` a stat row is filed under. */
function statDate(daysAgo = 0) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo));
}

function themeEditorUrl(shop: string) {
  const apiKey = process.env.SHOPIFY_API_KEY;
  if (!apiKey) return null;
  return `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${apiKey}/${EMBED_HANDLE}`;
}

async function getConnectedShopify(orgId: string) {
  const integration = await getShopifyInfo(orgId);
  if (!integration?.active || !integration.credential?.session) {
    throw new ShopifyWidgetError("Connect a Shopify store first", 404);
  }
  return integration;
}

export async function getWidgetSettings(orgId: string) {
  const integration = await getConnectedShopify(orgId);
  const { shop } = integration.credential.session;
  const totals = await prisma.shopifyWidgetStat.aggregate({
    where: { orgId, date: { gte: statDate(STATS_DAYS - 1) } },
    _sum: { opens: true, clicks: true },
  });
  return {
    settings: { ...DEFAULT_WIDGET_SETTINGS, ...integration.credential.widget },
    /** False until the merchant has saved the widget once. */
    configured: !!integration.credential.widget,
    shop,
    /** Opens the theme editor with the app embed ready to switch on. */
    themeEditorUrl: themeEditorUrl(shop),
    stats: {
      days: STATS_DAYS,
      opens: totals._sum.opens ?? 0,
      clicks: totals._sum.clicks ?? 0,
    },
  };
}

export async function saveWidgetSettings(orgId: string, settings: ShopifyWidgetSettings) {
  const integration = await getConnectedShopify(orgId);
  // Switching the button off must stay possible after its number is disconnected.
  if (settings.enabled && !(await resolveWidgetPhone(orgId, settings.channelId))) {
    throw new ShopifyWidgetError("That WhatsApp number isn't connected. Choose another one.", 400);
  }

  // Only `credential.widget` is written, so a concurrent writer of the rest of
  // the credential (session refresh, surveys, webhook flags) can't be lost.
  await prisma.$executeRaw`UPDATE "Integration" SET credential = jsonb_set(credential, '{widget}', ${JSON.stringify(settings)}::jsonb) WHERE id = ${integration.id}::uuid`;
  integration.credential.widget = settings;

  try {
    await syncWidgetMetafield(integration);
  } catch (e) {
    // The settings are saved; the daily sync retries the metafield.
    log.error({ err: e, orgId }, "Could not sync the Shopify widget metafield");
    throw new ShopifyWidgetError(
      "Your settings were saved, but we couldn't update your store. Try saving again in a moment.",
      502,
    );
  }
  return settings;
}

/**
 * Daily, next to the webhook sync: rewrites the metafield of every widget that
 * is switched on, so a number that was changed or disconnected in RateUp can't
 * stay on a storefront for long.
 */
export async function syncShopifyWidgets() {
  const integrations = (await prisma.integration.findMany({
    where: {
      name: IntegratedApps.shopify,
      active: true,
      orgId: { not: null },
      credential: { path: ["widget", "enabled"], equals: true },
    },
  })) as unknown as ShopifyIntegration[];
  for (const integration of integrations) {
    if (!integration.credential?.session) continue;
    try {
      await syncWidgetMetafield(integration);
    } catch (e) {
      log.error({ err: e, orgId: integration.orgId }, "Shopify widget sync failed for shop");
    }
  }
}

const shopOrgKey = (shop: string) => `shopify:widget-org:${shop}`;

/** The org that owns an active, claimed shop, or null. */
async function findWidgetOrg(shop: string) {
  try {
    const cached = await connection.get(shopOrgKey(shop));
    if (cached !== null) return cached || null;
  } catch {
    // Redis down: fall through to the database.
  }
  const integration = await prisma.integration.findFirst({
    where: {
      name: IntegratedApps.shopify,
      active: true,
      orgId: { not: null },
      credential: { path: ["session", "shop"], equals: shop },
    },
    select: { orgId: true },
  });
  const orgId = integration?.orgId ?? null;
  try {
    await connection.set(shopOrgKey(shop), orgId ?? "", "EX", SHOP_ORG_CACHE_SECONDS);
  } catch {
    // The cache is only an optimisation.
  }
  return orgId;
}

/** Counts one tap. Returns false for a shop that isn't an active, claimed store. */
export async function recordWidgetEvent({ shop, event, pageType }: ShopifyWidgetEvent) {
  const orgId = await findWidgetOrg(shop.toLowerCase());
  if (!orgId) return false;
  const counter = event === "open" ? "opens" : "clicks";
  const date = statDate();
  await prisma.shopifyWidgetStat.upsert({
    where: { orgId_date_pageType: { orgId, date, pageType } },
    create: { orgId, date, pageType, [counter]: 1 },
    update: { [counter]: { increment: 1 } },
  });
  return true;
}
