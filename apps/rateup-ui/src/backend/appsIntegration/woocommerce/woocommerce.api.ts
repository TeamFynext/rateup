import { axiosClient } from "../../apiClient";

const ROUTE_URL = "integrations/woocommerce";

export type WooTopic = "order.created" | "order.updated" | "customer.created" | "product.updated";

/** The admin's switches for a connected store. */
export interface WooSettings {
  /** New WooCommerce customers become RateUp contacts. */
  syncCustomers: boolean;
}

/** The connection as the API shows it; the keys never leave the server. */
export type WooStatus =
  | { connected: false }
  | {
      connected: true;
      storeUrl: string;
      store: { name?: string; currency?: string; country?: string; wcVersion?: string };
      /** Woo's id for RateUp's key, so the admin can find it to revoke it. */
      keyId: number | null;
      connectedAt: string;
      settings: WooSettings;
      webhooks: { topic: WooTopic; registered: boolean }[];
      health: { consecutiveFailures: number; lastError: string | null; lastErrorAt: string | null };
    };

export async function getWooStatus() {
  return (await axiosClient.get(`${ROUTE_URL}/status`)).data as WooStatus;
}

/** Checks the address and returns WooCommerce's approval screen to send the admin to. */
export async function startWooConnect(storeUrl: string) {
  return (await axiosClient.post(`${ROUTE_URL}/connect`, { storeUrl })).data as { url: string };
}

export async function updateWooSettings(settings: Partial<WooSettings>) {
  return (await axiosClient.put(`${ROUTE_URL}/settings`, settings)).data as WooStatus;
}

export async function repairWooWebhooks() {
  return (await axiosClient.post(`${ROUTE_URL}/webhooks/repair`)).data as WooStatus;
}

export interface WooProductOption {
  id: string;
  name: string;
  image: string | null;
}

/** Published products from the connected store, for an automation rule's product filter. */
export async function getWooProducts(search = "") {
  return (await axiosClient.get(`${ROUTE_URL}/products`, { params: { search } }))
    .data as WooProductOption[];
}
