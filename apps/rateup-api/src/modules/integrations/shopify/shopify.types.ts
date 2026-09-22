export interface ShopifyBody {
  id: number;
  admin_graphql_api_id: string;
  app_id: number;
  browser_ip: string;
  buyer_accepts_marketing: boolean;
  cancel_reason?: null;
  cancelled_at?: null;
  cart_token: string;
  checkout_token: string;
  client_details: ClientDetails;
  closed_at?: null;
  company?: null;
  confirmation_number: string;
  confirmed: boolean;
  contact_email?: null;
  created_at: string;
  currency: string;
  current_shipping_price_set: PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet;
  current_subtotal_price: string;
  current_subtotal_price_set: PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet;
  current_total_additional_fees_set?: null;
  current_total_discounts: string;
  current_total_discounts_set: PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet;
  current_total_duties_set?: null;
  current_total_price: string;
  current_total_price_set: PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet;
  current_total_tax: string;
  current_total_tax_set: PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet;
  customer_locale: string;
  device_id?: null;
  discount_codes?: null[] | null;
  duties_included: boolean;
  email: string;
  estimated_taxes: boolean;
  financial_status: string;
  fulfillment_status?: null;
  landing_site: string;
  landing_site_ref?: null;
  location_id?: null;
  merchant_business_entity_id: string;
  merchant_of_record_app_id?: null;
  name: string;
  note?: null;
  note_attributes?: null[] | null;
  number: number;
  order_number: number;
  order_status_url: string;
  original_total_additional_fees_set?: null;
  original_total_duties_set?: null;
  payment_gateway_names?: string[] | null;
  phone: string;
  po_number?: null;
  presentment_currency: string;
  processed_at: string;
  reference?: null;
  referring_site?: null;
  source_identifier?: null;
  source_name: string;
  source_url?: null;
  subtotal_price: string;
  subtotal_price_set: PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet;
  tags: string;
  tax_exempt: boolean;
  tax_lines?: TaxLinesEntity[] | null;
  taxes_included: boolean;
  test: boolean;
  token: string;
  total_cash_rounding_payment_adjustment_set: PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet;
  total_cash_rounding_refund_adjustment_set: PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet;
  total_discounts: string;
  total_discounts_set: PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet;
  total_line_items_price: string;
  total_line_items_price_set: PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet;
  total_outstanding: string;
  total_price: string;
  total_price_set: PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet;
  total_shipping_price_set: PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet;
  total_tax: string;
  total_tax_set: PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet;
  total_tip_received: string;
  total_weight: number;
  updated_at: string;
  user_id?: null;
  billing_address: BillingAddressOrShippingAddress;
  customer: Customer;
  discount_applications?: null[] | null;
  fulfillments?: FulfillmentsEntity[] | null;
  line_items?: LineItemsEntity[] | null;
  payment_terms?: null;
  refunds?: null[] | null;
  shipping_address: BillingAddressOrShippingAddress;
  shipping_lines?: ShippingLinesEntity[] | null;
  returns?: null[] | null;
  line_item_groups?: null[] | null;
  [field: string]: unknown;
}
export interface ClientDetails {
  accept_language: string;
  browser_height?: null;
  browser_ip: string;
  browser_width?: null;
  session_hash?: null;
  user_agent: string;
}
export interface PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet {
  shop_money: ShopMoneyOrPresentmentMoney;
  presentment_money: ShopMoneyOrPresentmentMoney;
}
export interface ShopMoneyOrPresentmentMoney {
  amount: string;
  currency_code: string;
}
export interface TaxLinesEntity {
  price: string;
  rate: number;
  title: string;
  price_set: PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet;
  channel_liable: boolean;
}
export interface BillingAddressOrShippingAddress {
  first_name: string;
  address1: string;
  phone?: null;
  city: string;
  zip: string;
  province: string;
  country: string;
  last_name: string;
  address2?: null;
  company?: null;
  latitude: number;
  longitude: number;
  name: string;
  country_code: string;
  province_code: string;
}
export interface Customer {
  id: number;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  state: string;
  note?: null;
  verified_email: boolean;
  multipass_identifier?: null;
  tax_exempt: boolean;
  email?: null;
  phone: string;
  currency: string;
  tax_exemptions?: null[] | null;
  admin_graphql_api_id: string;
  default_address: DefaultAddress;
}
export interface DefaultAddress {
  id: number;
  customer_id: number;
  first_name: string;
  last_name: string;
  company?: null;
  address1: string;
  address2: string;
  city: string;
  province: string;
  country: string;
  zip: string;
  phone?: null;
  name: string;
  province_code: string;
  country_code: string;
  country_name: string;
  default: boolean;
}
export interface LineItemsEntity {
  id: number;
  admin_graphql_api_id: string;
  attributed_staffs?: null[] | null;
  current_quantity: number;
  fulfillable_quantity: number;
  fulfillment_service: string;
  fulfillment_status?: string | null;
  gift_card: boolean;
  grams: number;
  name: string;
  price: string;
  price_set: PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet;
  product_exists: boolean;
  product_id: number;
  properties?: null[] | null;
  quantity: number;
  requires_shipping: boolean;
  sales_line_item_group_id?: null;
  sku: string;
  taxable: boolean;
  title: string;
  total_discount: string;
  total_discount_set: PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet;
  variant_id: number;
  variant_inventory_management: string;
  variant_title: string;
  vendor: string;
  tax_lines?: TaxLinesEntity[] | null;
  duties?: null[] | null;
  discount_allocations?: null[] | null;
  [field: string]: unknown;
}
/**
 * Shapes for the Shopify Admin API responses this module reads.
 *
 * `@shopify/shopify-api` returns GraphQL documents untyped. These name only the
 * fields Rateup actually reads; some carry an index signature for the rest of
 * the payload.
 */

/** A node of a GraphQL connection, as returned under `edges[].node`. */
export interface ShopifyGraphqlNode {
  id?: string;
  title?: string;
  sku?: string;
  [field: string]: unknown;
}

export interface ShopifyGraphqlEdge {
  node?: ShopifyGraphqlNode;
  [field: string]: unknown;
}

/**
 * A Shopify webhook payload as received on any topic. `ShopifyBody` above
 * models one fully-populated orders/create sample with every field required,
 * which does not describe fulfillment or checkout topics — this names only the
 * fields resolveShopifyPathValue reads and leaves the rest to the index
 * signature.
 */
export interface ShopifyWebhookBody {
  id?: number | string;
  order_number?: number;
  total_price?: string;
  line_items?: ShopifyWebhookLineItem[] | null;
  fulfillments?: FulfillmentsEntity[] | null;
  fulfillment?: FulfillmentsEntity;
  tracking_number?: string;
  tracking_url?: string;
  abandoned_checkout_url?: string;
  recovery_url?: string;
  checkout_url?: string;
  [field: string]: unknown;
}

/** The line-item fields resolveShopifyPathValue reads off a webhook body. */
export interface ShopifyWebhookLineItem {
  title?: string;
  quantity?: number;
  fulfillment_status?: string | null;
  [field: string]: unknown;
}

/** A fulfillment attached to an order webhook. */
export interface FulfillmentsEntity {
  id?: number | string;
  status?: string;
  tracking_number?: string;
  tracking_url?: string;
  [field: string]: unknown;
}

/** `nodes(ids:)` lookup used to validate numeric variant ids still exist. */
export interface ShopifyNodesLookupData {
  nodes?: Array<{ id?: string; __typename?: string } | null>;
}

/** A product variant node returned by the variant/product search queries. */
export interface ShopifyVariantNode {
  id?: string;
  sku?: string;
}

/** `productVariants(query:)` search result. */
export interface ShopifyProductVariantsData {
  productVariants?: {
    edges?: Array<{ node?: ShopifyVariantNode }>;
  };
}

/** `products(query:)` search result, each with its first variant. */
export interface ShopifyProductsByTitleData {
  products?: {
    edges?: Array<{
      node?: {
        title?: string;
        variants?: { edges?: Array<{ node?: ShopifyVariantNode }> };
      };
    }>;
  };
}

/** `productCreate` mutation result. */
export interface ShopifyProductCreateData {
  productCreate?: {
    product?: {
      id?: string;
      title?: string;
      variants?: { nodes?: ShopifyVariantNode[] };
    };
    userErrors?: Array<{ field?: string[]; message?: string }>;
  };
}

/** The REST-shaped shipping address the WhatsApp address flow stores. */
export interface ShopifyShippingAddressInput {
  first_name?: string;
  last_name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  country_code?: string;
  phone?: string;
}

export interface ShopifyUserError {
  field?: string[] | null;
  message: string;
}

/** `legacyResourceId` is an UnsignedInt64, which the API serializes as a string. */
export interface ShopifyDraftOrderCreateData {
  draftOrderCreate: {
    draftOrder: { legacyResourceId: string; invoiceUrl: string | null } | null;
    userErrors: ShopifyUserError[];
  };
}

export interface ShopifyOrderCreateData {
  orderCreate: {
    order: { legacyResourceId: string; statusPageUrl: string } | null;
    userErrors: ShopifyUserError[];
  };
}

export interface ShopifyDraftOrderCompleteData {
  draftOrderComplete: {
    draftOrder: { order: { legacyResourceId: string } | null } | null;
    userErrors: ShopifyUserError[];
  };
}

export interface ShopifyOrderMarkAsPaidData {
  orderMarkAsPaid: {
    order: { legacyResourceId: string; displayFinancialStatus: string | null } | null;
    userErrors: ShopifyUserError[];
  };
}

export interface ShopifyDraftOrderLookupData {
  draftOrder: { order: { legacyResourceId: string } | null } | null;
}

export interface ShopifyProductImageData {
  product: { featuredMedia: { preview: { image: { url: string } | null } | null } | null } | null;
}

/** `draftOrderAvailableDeliveryOptions` query result. */
export interface ShopifyAvailableShippingRate {
  handle?: string;
  title?: string;
  price?: { amount?: string; currencyCode?: string };
}

export interface ShopifyDeliveryOptionsData {
  draftOrderAvailableDeliveryOptions?: {
    availableShippingRates?: ShopifyAvailableShippingRate[];
  };
}

/** A line item of a fulfillment order (`getFulfillmentOrders` query). */
export interface ShopifyFulfillmentOrderLineItem {
  id?: string;
  sku?: string;
  productTitle?: string;
  /** Copied from `productTitle` by getFulfillmentOrders for its callers. */
  title?: string;
  totalQuantity?: number;
  remainingQuantity?: number;
}

export interface ShopifyFulfillmentOrder {
  id?: string;
  status?: string;
  requestStatus?: string;
  lineItems?: { nodes?: ShopifyFulfillmentOrderLineItem[] };
}

export interface ShopifyFulfillmentOrdersData {
  order?: {
    id?: string;
    name?: string;
    fulfillmentOrders?: { nodes?: ShopifyFulfillmentOrder[] };
  };
}

/** `fulfillmentCreate` mutation result. */
export interface ShopifyFulfillmentCreateData {
  fulfillmentCreate?: {
    fulfillment?: { id?: string; status?: string };
    userErrors?: Array<{ field?: string[]; message?: string }>;
  };
}

/**
 * Pulls the Shopify API's own error payload out of a thrown value.
 * `HttpResponseError` from `@shopify/shopify-api` carries it on
 * `response.body`; anything else is returned unchanged for logging.
 */
export function shopifyErrorDetail(error: unknown): unknown {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { body?: unknown } }).response;
    if (response?.body !== undefined) return response.body;
  }
  return error;
}

export interface ShippingLinesEntity {
  id: number;
  carrier_identifier?: null;
  code: string;
  current_discounted_price_set: PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet;
  discounted_price: string;
  discounted_price_set: PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet;
  is_removed: boolean;
  phone?: null;
  price: string;
  price_set: PriceSetOrTotalDiscountSetOrCurrentDiscountedPriceSetOrDiscountedPriceSetOrCurrentShippingPriceSetOrCurrentSubtotalPriceSetOrCurrentTotalDiscountsSetOrCurrentTotalPriceSetOrCurrentTotalTaxSetOrSubtotalPriceSetOrTotalCashRoundingPaymentAdjustmentSetOrTotalCashRoundingRefundAdjustmentSetOrTotalDiscountsSetOrTotalLineItemsPriceSetOrTotalPriceSetOrTotalShippingPriceSetOrTotalTaxSet;
  requested_fulfillment_service_id?: null;
  source: string;
  title: string;
  tax_lines?: null[] | null;
  discount_allocations?: null[] | null;
}
