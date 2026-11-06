import { createWooOrder, updateWooOrder, type WooOrderInput } from "./woocommerce.client.js";
import { RATEUP_ORDER_META, RATEUP_WRITEBACK_META } from "./woocommerce.mapping.js";
import { connectedStore, WOO_RETAILER_PREFIX } from "./woocommerce.products.js";

/**
 * RateUp shop orders in WooCommerce: a pending order the customer pays on the store's own
 * page, or a paid one written back after RateUp took the money. Both carry
 * `rateup_order_id`, which is how the store's order webhooks are matched to the RateUp order.
 */

export interface WooShopLine {
  /** The mirrored product's group id: `wc_<product id>`. */
  productExternalId: string | null;
  /** The variant's retailer id: `wc_<product id>` for a simple product, `wc_<variation id>`. */
  retailerId: string;
  quantity: number;
  total?: number;
}

const wooId = (id: string | null | undefined) => {
  const n = Number(
    id?.startsWith(WOO_RETAILER_PREFIX) ? id.slice(WOO_RETAILER_PREFIX.length) : NaN,
  );
  return Number.isInteger(n) && n > 0 ? n : null;
};

export function wooLineItem(line: WooShopLine): WooOrderInput["line_items"][number] {
  const own = wooId(line.retailerId);
  if (!own) throw new Error(`Not a WooCommerce product: ${line.retailerId}`);
  const parent = wooId(line.productExternalId);
  return {
    ...(parent && parent !== own ? { product_id: parent, variation_id: own } : { product_id: own }),
    quantity: line.quantity,
    ...(line.total !== undefined && { total: line.total.toFixed(2) }),
  };
}

/** A pending order and the page that pays for it. */
export async function createWooCheckoutOrder(
  orgId: string,
  input: {
    rateupOrderId: string;
    source: string;
    lines: WooShopLine[];
    address?: Record<string, string | undefined> | null;
    email?: string | null;
    phone?: string | null;
    shipping?: { name: string; price: number } | null;
    note?: string;
  },
): Promise<{ id: string; number: string | null; payUrl: string }> {
  const { credential, client } = await connectedStore(orgId);
  // The pay-for-order page asks for neither, so the address and delivery picked on RateUp's
  // page are set here; WooCommerce works out the tax from them.
  const billing = {
    ...input.address,
    ...(input.phone && { phone: input.phone }),
    ...(input.email && { email: input.email }),
  };
  const order = await createWooOrder(client, {
    status: "pending",
    set_paid: false,
    line_items: input.lines.map(wooLineItem),
    ...(Object.keys(billing).length && { billing }),
    ...(input.address && { shipping: input.address }),
    ...(input.shipping && {
      shipping_lines: [
        {
          method_id: "rateup",
          method_title: input.shipping.name,
          total: input.shipping.price.toFixed(2),
        },
      ],
    }),
    ...(input.note && { customer_note: input.note }),
    meta_data: [
      { key: RATEUP_ORDER_META, value: input.rateupOrderId },
      { key: "rateup_source", value: input.source },
    ],
  });
  const payUrl =
    order.payment_url ||
    (order.order_key
      ? `${credential.storeUrl}/checkout/order-pay/${order.id}/?pay_for_order=true&key=${order.order_key}`
      : null);
  if (!payUrl) throw new Error("WooCommerce returned no payment page for the order");
  return { id: String(order.id), number: order.number ?? null, payUrl };
}

/**
 * A RateUp-checkout order copied into WooCommerce so the merchant fulfils it there: paid, or
 * on hold until a cash or transfer payment arrives (`markWooOrderPaid`).
 */
export async function createWooWriteBackOrder(
  orgId: string,
  input: {
    rateupOrderId: string;
    paid: boolean;
    currency: string;
    paymentMethod: string;
    lines: WooShopLine[];
    address: Record<string, string | undefined>;
    email?: string | null;
    shipping?: { name: string; price: number } | null;
    /** Coupon and points RateUp took off, as one negative fee. */
    discount?: number;
    /** Tax RateUp added on top of the prices. */
    tax?: number;
  },
): Promise<{ id: string; number: string | null }> {
  const { client } = await connectedStore(orgId);
  const contact = {
    ...input.address,
    ...(input.email && { email: input.email }),
  };
  const fees = [
    input.discount && input.discount > 0
      ? { name: "Discount", total: (-input.discount).toFixed(2) }
      : null,
    input.tax && input.tax > 0 ? { name: "Tax", total: input.tax.toFixed(2) } : null,
  ].filter((f): f is { name: string; total: string } => !!f);
  const order = await createWooOrder(client, {
    status: input.paid ? "processing" : "on-hold",
    set_paid: input.paid,
    currency: input.currency,
    payment_method: "rateup",
    payment_method_title: input.paid
      ? `Paid through RateUp (${input.paymentMethod})`
      : `RateUp (${input.paymentMethod}, not paid yet)`,
    billing: contact,
    shipping: input.address,
    line_items: input.lines.map(wooLineItem),
    ...(input.shipping && {
      shipping_lines: [
        {
          method_id: "rateup",
          method_title: input.shipping.name,
          total: input.shipping.price.toFixed(2),
        },
      ],
    }),
    meta_data: [
      { key: RATEUP_ORDER_META, value: input.rateupOrderId },
      { key: RATEUP_WRITEBACK_META, value: "1" },
    ],
    ...(fees.length && { fee_lines: fees }),
  });
  return { id: String(order.id), number: order.number ?? null };
}

export async function markWooOrderPaid(orgId: string, wooOrderId: string) {
  const { client } = await connectedStore(orgId);
  await updateWooOrder(client, wooOrderId, { status: "processing", set_paid: true });
}

export async function cancelWooOrder(orgId: string, wooOrderId: string) {
  const { client } = await connectedStore(orgId);
  await updateWooOrder(client, wooOrderId, { status: "cancelled" });
}
