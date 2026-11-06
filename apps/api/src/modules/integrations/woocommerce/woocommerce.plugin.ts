import type { AxiosInstance } from "axios";

import type { Integration } from "../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { API_URL } from "../../../utils/constants/constants.js";
import {
  buildStoreWidgetPayload,
  resolveWidgetPhone,
  type StoreWidgetPayload,
} from "../commerce/storeWidget.js";
import { createWooClient, isWooNotFound } from "./woocommerce.client.js";
import {
  readWooCredential,
  type WooCheckoutOptIn,
  type WooCredential,
} from "./woocommerce.types.js";

/**
 * The RateUp for WooCommerce plugin (`WEB/rateup-wordpress/`), seen from RateUp.
 *
 * The plugin registers a WooCommerce settings group, `rateup`, holding one text
 * setting, `rateup_data`. WooCommerce serves that group at
 * `/wc/v3/settings/rateup` behind the same consumer key the connection already
 * uses, so RateUp pushes to the plugin without the plugin holding a secret of
 * its own — the counterpart of the Shopify app's metafield.
 *
 * The value is base64-encoded JSON: WordPress sanitises setting values (JSON
 * in a textarea loses its backslashes, `&` becomes `&amp;`), and base64 is the
 * one form that comes back byte for byte. A store without the plugin answers
 * 404 for the group, which is how RateUp knows it is not installed.
 */

const GROUP = "rateup";
const SETTING = "rateup_data";

/** Where the plugin's button reports taps. */
export const WOO_WIDGET_EVENT_ROUTE = "/api/public/integrations/woocommerce/widget/event";

/** The button as the plugin reads it: the shared public payload, plus the store's tap key. */
export interface WooPluginWidget extends StoreWidgetPayload {
  key: string;
}

/** What the plugin reads. `v` lets a newer RateUp and an older plugin tell each other apart. */
export interface WooPluginData {
  v: 1;
  connected: boolean;
  orgName?: string;
  /** The RateUp page for this store, for the plugin's "Open RateUp" link. */
  dashboardUrl?: string;
  connectedAt?: string;
  /** The storefront WhatsApp button, once the merchant has saved it. */
  widget?: WooPluginWidget;
  /** The WhatsApp opt-in box at checkout, once the merchant has saved it. */
  checkoutOptIn?: WooCheckoutOptIn;
}

/** `installed` = written; `absent` = the store has no plugin; `failed` = it could not be reached. */
export type WooPluginPush = "installed" | "absent" | "failed";

export const encodePluginData = (data: WooPluginData) =>
  Buffer.from(JSON.stringify(data), "utf8").toString("base64");

/** Where the plugin's "Open RateUp" link goes. From the environment, not `config.ts`, like the connect URLs. */
export function wooDashboardUrl() {
  return `${process.env.FRONTEND_URL ?? ""}/dashboard/settings/integrations/woocommerce`;
}

/**
 * Writes `data` to the plugin. Never throws: the plugin is optional, and a
 * store without it — or one that is briefly down — must not fail the connect,
 * the disconnect or the scheduled sweep that call this.
 */
export async function pushWooPluginData(
  credential: Pick<WooCredential, "storeUrl" | "consumerKey" | "consumerSecret" | "authMode">,
  data: WooPluginData,
  client: AxiosInstance = createWooClient(credential),
): Promise<WooPluginPush> {
  try {
    await client.put(`/settings/${GROUP}/${SETTING}`, { value: encodePluginData(data) });
    return "installed";
  } catch (error) {
    // WooCommerce answers an unknown group (no plugin) and an unknown setting
    // (an older plugin) alike: 404.
    if (isWooNotFound(error)) return "absent";
    log.warn({ err: error, storeUrl: credential.storeUrl }, "Could not update the RateUp plugin");
    return "failed";
  }
}

/** The connection, as the plugin's admin page shows it. */
export function connectedPluginData(orgName: string | null | undefined, connectedAt: string) {
  return {
    v: 1,
    connected: true,
    ...(orgName && { orgName }),
    dashboardUrl: wooDashboardUrl(),
    connectedAt,
  } satisfies WooPluginData;
}

/** After a disconnect: the plugin goes back to offering "Connect to RateUp". */
export const DISCONNECTED_PLUGIN_DATA: WooPluginData = { v: 1, connected: false };

/**
 * The button as the plugin gets it: the number re-read now, so one disconnected
 * in RateUp leaves the storefront at the next push (at worst the 45-minute sweep).
 */
async function pluginWidget(
  orgId: string,
  credential: WooCredential,
): Promise<WooPluginWidget | undefined> {
  if (!credential.widget || !credential.widgetKey) return undefined;
  const phone = await resolveWidgetPhone(orgId, credential.widget.channelId);
  return {
    ...buildStoreWidgetPayload(credential.widget, phone, `${API_URL}${WOO_WIDGET_EVENT_ROUTE}`),
    key: credential.widgetKey,
  };
}

/**
 * Remembers whether the plugin answered, for the settings page's "Install the
 * plugin" notice. Only this key of the credential is written, so a concurrent
 * writer of the rest of it is not undone. A failed push says nothing either way.
 */
async function recordPluginState(integrationId: string, push: WooPluginPush) {
  if (push === "failed") return;
  const state = { installed: push === "installed", checkedAt: new Date().toISOString() };
  try {
    await prisma.$executeRaw`UPDATE "Integration" SET credential = jsonb_set(credential, '{plugin}', ${JSON.stringify(state)}::jsonb) WHERE id = ${integrationId}::uuid`;
  } catch (error) {
    log.warn({ err: error, integrationId }, "Could not record the RateUp plugin's state");
  }
}

/**
 * Brings the store's plugin, if it has one, up to date: connected, to which
 * org, the WhatsApp button and the checkout opt-in. Run after a connect, when
 * either is saved and by the scheduled sweep — so a plugin installed after the store was
 * connected catches up on its own. Never throws.
 */
export async function syncWooPluginConnection(integration: Integration): Promise<WooPluginPush> {
  const credential = readWooCredential(integration.credential);
  if (!credential || !integration.orgId) return "failed";

  let data: WooPluginData;
  try {
    const org = await prisma.org.findUnique({
      where: { id: integration.orgId },
      select: { name: true },
    });
    const widget = await pluginWidget(integration.orgId, credential);
    data = {
      ...connectedPluginData(org?.name, credential.connectedAt),
      ...(widget && { widget }),
      ...(credential.checkoutOptIn && { checkoutOptIn: credential.checkoutOptIn }),
    };
  } catch (error) {
    // Pushing without the button would take it off the storefront; leave the
    // plugin as it is until the next push.
    log.warn({ err: error, orgId: integration.orgId }, "Could not build the RateUp plugin's data");
    return "failed";
  }

  const push = await pushWooPluginData(credential, data);
  await recordPluginState(integration.id, push);
  return push;
}
