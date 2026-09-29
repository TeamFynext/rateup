import type { Integration } from "../../../../generated/prisma/client.js";
import type { OrderEventStatus } from "../events/integrationEvent.types.js";

/**
 * Store-agnostic commerce: the parts of the Shopify integration that are about
 * orders, surveys, loyalty and discount codes rather than about Shopify, so
 * WooCommerce (Phase 1) and later stores plug into the same flows.
 *
 * A provider translates its webhooks into a {@link CommerceOrder} and implements
 * {@link CommerceProvider} for the calls only it can make; everything else —
 * what happens when an order is paid — lives here once.
 */

/**
 * Where an order is in its life, in words every store can map onto. Defined
 * with the `order.*` integration events so the two can never drift apart;
 * `fulfillment_cancelled` is a cancelled warehouse request, not a cancelled order.
 */
export type CommerceOrderStatus = OrderEventStatus;

export interface CommerceCustomer {
  /** Raw, as the store sent it; each consumer parses it against its own default country. */
  phone: string | null;
  email: string | null;
}

/** One order event, normalised. */
export interface CommerceOrder {
  orderId: string | null;
  status: CommerceOrderStatus;
  /**
   * The store's own name for this event (a Shopify topic, a WooCommerce status).
   * Surveys are configured under it and it is part of the loyalty job id, so it
   * must stay stable for a given provider.
   */
  eventKey: string;
  customer: CommerceCustomer;
  /** What the customer paid, in the store's currency; null when unreadable. */
  amount: number | null;
  /** In the store's own id format — what product-specific surveys are matched against. */
  productIds: string[];
  /** Codes applied at checkout. */
  discountCodes: string[];
  /** The delivery's own id, for dropping redeliveries. */
  deliveryId?: string;
  /** The store's payload, for template variables and automation rules. */
  raw: Record<string, unknown>;
}

/** Which connected store an order came from. */
export interface CommerceStore {
  provider: CommerceProvider;
  /** The store's own identifier — a Shopify shop domain, a WooCommerce site URL. */
  storeId: string;
  orgId: string;
  integration: Integration;
}

/** A reward's value, as a discount any store can express. */
export type CommerceDiscountValue =
  | { kind: "fixed"; amount: number }
  | { kind: "percentage"; percentage: number };

/** A single-use discount code for one loyalty redemption. */
export interface CommerceDiscountInput {
  code: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  value: CommerceDiscountValue;
  minimumSpend: number | null;
  combinesWith: { order: boolean; product: boolean; shipping: boolean };
}

export type CommerceDiscountStatus = "created" | "skipped" | "failed";

export interface CommerceDiscountOutcome {
  status: CommerceDiscountStatus;
  discountId?: string;
  /** A link that applies the code for the customer. */
  discountUrl?: string;
  reason?: string;
}

/** What a merchant configures per store on a reward, under `redemptionRules[discountRulesKey]`. */
export interface CommerceDiscountRules {
  enabled?: boolean;
  /** Days the code stays valid from issue. Omitted = no end date. */
  valid_for_days?: number | null;
  combines_with?: {
    order_discounts?: boolean;
    product_discounts?: boolean;
    shipping_discounts?: boolean;
  };
}

/** An abandoned checkout, for stores that expose them. */
export interface CommerceCheckout {
  checkoutId: string;
  customer: CommerceCustomer;
  recoveryUrl: string | null;
  createdAt: string;
  raw: Record<string, unknown>;
}

export interface CommerceProduct {
  productId: string;
  title: string;
  price: number | null;
  imageUrl: string | null;
}

/**
 * A survey configured on a store's order events. Stored in the integration's
 * credential under the provider's `surveysField`; the field names are the ones
 * already on Shopify rows, so existing configurations read unchanged.
 */
export interface CommerceSurvey {
  event: string;
  active: boolean;
  waTemplateId?: string;
  teamId: string;
  /** Minutes after the event. */
  timeDelay: number;
  isProductSpecific: boolean;
  productId?: string;
  repeatInterval?: { value: number; unit: "hour" | "day" };
  /** `shopifyPath` is the stored name on every existing row; `path` is for new providers. */
  variableMapping?: { templateParamIndex: number; shopifyPath?: string; path?: string }[];
  schedules?: CommerceSurveySchedule[];
  [field: string]: unknown;
}

export interface CommerceSurveySchedule {
  scheduleId?: string;
  scheduledAt: Date | string;
  createdAt: Date | string;
  sentAt?: Date | string | null;
  status?: string | null;
  phone: string;
  webhookId?: string;
  checkoutId?: string;
  actionStatus?: string | null;
  apiStatus?: string | null;
  history: Array<{
    scheduleId?: string;
    scheduledAt: Date | string;
    createdAt?: Date | string;
    sentAt?: Date | string | null;
    status?: string | null;
  }>;
  body?: Record<string, unknown>;
  [field: string]: unknown;
}

/** A store integration's commerce half. */
export interface CommerceProvider {
  /** Matches `Integration.name` and the registry provider. */
  name: string;
  label: string;

  /** The credential field holding the store's surveys. */
  surveysField: string;
  /** Writes the surveys back without disturbing the rest of the credential. */
  saveSurveys(
    store: Pick<CommerceStore, "orgId" | "integration">,
    surveys: CommerceSurvey[],
  ): Promise<void>;
  /** A template variable's value, from the store's own payload. */
  resolveTemplateValue(raw: Record<string, unknown> | null | undefined, path: string): string;

  /** Whether this org's loyalty programme earns points on this store's orders. */
  loyaltyEnabled(program: Record<string, unknown>): boolean;
  /**
   * The status on which an order earns its points; `paid` when left out.
   * Cancellation and refund reverse them either way.
   */
  awardStatus?: CommerceOrderStatus;

  /** The key under a reward's `redemptionRules` holding this store's discount settings. */
  discountRulesKey: string;
  /** Creates the code in the store. Never throws; `skipped` outcomes are not recorded. */
  createDiscountCode(orgId: string, input: CommerceDiscountInput): Promise<CommerceDiscountOutcome>;
  /** Turns a code off in the store. Never throws. */
  deactivateDiscountCode(orgId: string, discountId: string): Promise<boolean>;

  /** Store-specific automation after an order with a phone number (Shopify's rule trigger). */
  runOrderAutomation?(store: CommerceStore, order: CommerceOrder, phone: string): Promise<void>;
  /** For product sync into the WhatsApp catalog. */
  listProducts?(orgId: string): Promise<CommerceProduct[]>;
  /** Stores without a native abandoned-checkout API leave this out. */
  getAbandonedCheckouts?(orgId: string): Promise<CommerceCheckout[]>;
}
