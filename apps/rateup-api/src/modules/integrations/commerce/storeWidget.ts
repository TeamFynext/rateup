import prisma from "../../../utils/prisma.js";
import { WhatsappSettingsStatus } from "../../../types/enums.js";
import type { ShopifyWidgetSettings } from "../shopify/shopify.schema.js";

/**
 * The storefront WhatsApp button, store-neutral: the settings, the number
 * behind them, the public payload a storefront script reads, and the stats
 * table's day. Shopify's button (theme app extension) and WooCommerce's (the
 * RateUp plugin) both build on this; each store delivers the payload its own
 * way — a metafield, a plugin setting.
 *
 * Kept free of any store SDK, so a provider can import it without the others.
 */

/** The merchant's settings; one shape for every store (see `shopifyWidgetSchema`). */
export type StoreWidgetSettings = ShopifyWidgetSettings;

/** Which store a tap came from: `ShopifyWidgetStat.provider`. */
export type StoreWidgetProvider = "shopify" | "woocommerce";

export const DEFAULT_WIDGET_SETTINGS: StoreWidgetSettings = {
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

/** What a storefront script receives. Public: holds the number, never an internal id. */
export interface StoreWidgetPayload extends Omit<StoreWidgetSettings, "channelId"> {
  /** Digits only, as wa.me expects. Empty when the number is gone or disconnected. */
  phone: string;
  eventUrl: string;
}

/** The connected WhatsApp number behind a channel, digits only, or null. */
export async function resolveWidgetPhone(orgId: string, channelId: string | null) {
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

export function buildStoreWidgetPayload(
  settings: StoreWidgetSettings,
  phone: string | null,
  eventUrl: string,
): StoreWidgetPayload {
  const { channelId: _internal, ...rest } = settings;
  return {
    ...rest,
    // A number that has since been disconnected hides the button instead of
    // sending shoppers to a chat nobody receives.
    enabled: settings.enabled && !!phone,
    phone: phone ?? "",
    eventUrl,
  };
}

/** UTC midnight `daysAgo` days back: the `date` a stat row is filed under. */
export function statDate(daysAgo = 0) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo));
}

/** Days the settings page sums taps over. */
export const STATS_DAYS = 30;

/** The last {@link STATS_DAYS} days of one store's taps. */
export async function widgetStats(orgId: string, provider: StoreWidgetProvider) {
  const totals = await prisma.shopifyWidgetStat.aggregate({
    where: { orgId, provider, date: { gte: statDate(STATS_DAYS - 1) } },
    _sum: { opens: true, clicks: true },
  });
  return {
    days: STATS_DAYS,
    opens: totals._sum.opens ?? 0,
    clicks: totals._sum.clicks ?? 0,
  };
}

/** Counts one tap for one store. */
export async function countWidgetTap(
  orgId: string,
  provider: StoreWidgetProvider,
  event: "open" | "click",
  pageType: string,
) {
  const counter = event === "open" ? "opens" : "clicks";
  const date = statDate();
  await prisma.shopifyWidgetStat.upsert({
    where: { orgId_date_pageType_provider: { orgId, date, pageType, provider } },
    create: { orgId, date, pageType, provider, [counter]: 1 },
    update: { [counter]: { increment: 1 } },
  });
}
