import type { WooAuthMode } from "./woocommerce.client.js";

/**
 * The webhooks RateUp keeps registered on a connected store. Orders drive
 * surveys and loyalty, customers become contacts, products keep the WhatsApp
 * catalog current.
 */
export const WOO_TOPICS = [
  "order.created",
  "order.updated",
  "customer.created",
  "product.updated",
] as const;

export type WooTopic = (typeof WOO_TOPICS)[number];

export interface WooWebhookRef {
  topic: WooTopic;
  /** The webhook's id on the store, for checking and removing it. */
  id: number;
}

/** What the store told us about itself when it was connected. Informational only. */
export interface WooStoreInfo {
  name?: string;
  currency?: string;
  /** `woocommerce_default_country`, e.g. "IN:KL" — the country part defaults phone numbers. */
  country?: string;
  wcVersion?: string;
}

/**
 * `Integration.credential` for WooCommerce. `consumerKey`, `consumerSecret` and
 * `webhookSecret` are encrypted at rest by the credential extension.
 */
export interface WooCredential {
  /** `https://shop.example.com`, or with a path for a store in a subdirectory; no trailing slash. */
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  /** Woo's id for the key, so an admin can find and revoke it under WooCommerce › Settings › Advanced › REST API. */
  keyId?: number;
  keyPermissions?: string;
  /** Set to `query` when the host strips the Authorization header; see `createWooClient`. */
  authMode?: WooAuthMode;
  /** Signs every delivery; one per connection, set on each webhook we register. */
  webhookSecret: string;
  webhooks: WooWebhookRef[];
  store?: WooStoreInfo;
  connectedAt: string;
  /** New customers become RateUp contacts. Off until the admin turns it on. */
  syncCustomers?: boolean;
}

/** What WooCommerce POSTs to our callback once the admin approves the connection. */
export interface WooAuthCallbackBody {
  key_id: number;
  /** Echoes the `user_id` we sent: our signed state. */
  user_id: string;
  consumer_key: string;
  consumer_secret: string;
  key_permissions: string;
}

export function readWooCredential(credential: unknown): WooCredential | null {
  const value = credential as Partial<WooCredential> | null;
  if (!value?.storeUrl || !value.consumerKey || !value.consumerSecret || !value.webhookSecret) {
    return null;
  }
  return { webhooks: [], ...value } as WooCredential;
}
