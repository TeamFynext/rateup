import type { GraphqlClient } from "@shopify/shopify-api";

import { resolveShopifyVariants } from "./shopify.catalog.js";
import shopify from "./shopify.config.js";
import { getShopifyInfo } from "./shopify.credential.js";
import { getActiveShopifySession } from "./shopify.session.js";
import { toShopifyProvinceCode } from "./shopify.util.js";
import type { ShopifyShippingAddressInput, ShopifyUserError } from "./shopify.types.js";

/**
 * RateUp shop orders written into Shopify after RateUp took (or will take) the payment, so the
 * merchant fulfils them with everything else, plus the calls that keep that copy in step:
 * paid when a cash order is paid, cancelled when RateUp cancels it, and an unpaid checkout
 * draft deleted when it lapses.
 */

const gid = (type: string, id: string) =>
  id.startsWith("gid://") ? id : `gid://shopify/${type}/${id}`;

function assertNoUserErrors(op: string, errors: ShopifyUserError[] | undefined) {
  if (errors?.length) throw new Error(`${op}: ${errors.map((e) => e.message).join("; ")}`);
}

async function shopClient(orgId: string): Promise<{ client: GraphqlClient; shop: string }> {
  const info = await getShopifyInfo(orgId);
  if (!info || !info.active) throw new Error("Shopify is not connected");
  if (!shopify) throw new Error("Shopify integration is not configured");
  const session = await getActiveShopifySession(info);
  return { client: new shopify.clients.Graphql({ session }), shop: session.shop };
}

/** The shop's admin domain (`name.myshopify.com`), for links to an order. */
export async function shopifyAdminDomain(orgId: string): Promise<string | null> {
  const info = await getShopifyInfo(orgId).catch(() => null);
  return info?.active ? (info.credential?.session?.shop ?? null) : null;
}

export interface ShopifyWriteBackInput {
  rateupOrderId: string;
  orderNumber: number;
  paid: boolean;
  paymentMethod: string;
  currency: string;
  lines: { retailerId: string; title: string; quantity: number; unitPrice: number }[];
  address: ShopifyShippingAddressInput | null;
  email?: string | null;
  phone?: string | null;
  shipping?: { name: string; price: number } | null;
  /** Coupon and points RateUp took off, as one order discount. */
  discount: number;
  /** Tax RateUp added on top of the prices; already inside them otherwise. */
  taxOnTop: number;
}

/**
 * Lines at the prices RateUp charged, RateUp's discount and tax, and Shopify told not to add
 * tax of its own, so Shopify's total is the amount the customer paid.
 */
export async function createShopifyWriteBackOrder(
  orgId: string,
  input: ShopifyWriteBackInput,
): Promise<{ id: string; name: string | null }> {
  const { client } = await shopClient(orgId);
  const variants = await resolveShopifyVariants(
    input.lines.map((l) => ({ retailerId: l.retailerId, quantity: l.quantity, title: l.title })),
    client,
  );
  const money = (amount: number) => ({ amount: amount.toFixed(2), currencyCode: input.currency });
  const lineItems = [
    ...input.lines.map((l) => {
      const variantId = variants.get(l.retailerId);
      return variantId
        ? {
            variantId: gid("ProductVariant", variantId),
            quantity: l.quantity,
            priceOverride: money(l.unitPrice),
          }
        : {
            title: l.title,
            quantity: l.quantity,
            requiresShipping: true,
            originalUnitPriceWithCurrency: money(l.unitPrice),
          };
    }),
    ...(input.taxOnTop > 0
      ? [
          {
            title: "Tax",
            quantity: 1,
            requiresShipping: false,
            taxable: false,
            originalUnitPriceWithCurrency: money(input.taxOnTop),
          },
        ]
      : []),
  ];
  const address = input.address
    ? {
        firstName: input.address.first_name,
        lastName: input.address.last_name,
        address1: input.address.address1,
        address2: input.address.address2,
        city: input.address.city,
        provinceCode: toShopifyProvinceCode(input.address.country_code, input.address.province),
        zip: input.address.zip,
        countryCode: input.address.country_code,
        phone: input.address.phone,
      }
    : undefined;

  const created = await client.request<{
    draftOrderCreate: {
      draftOrder: { id: string } | null;
      userErrors: ShopifyUserError[];
    };
  }>(
    `mutation writeBack($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder { id }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        input: {
          lineItems,
          taxExempt: true,
          ...(address && { shippingAddress: address, billingAddress: address }),
          ...(input.shipping && {
            shippingLine: {
              title: input.shipping.name,
              priceWithCurrency: money(input.shipping.price),
            },
          }),
          ...(input.discount > 0 && {
            appliedDiscount: {
              title: "RateUp discount",
              value: Number(input.discount.toFixed(2)),
              valueType: "FIXED_AMOUNT",
            },
          }),
          ...(input.email && { email: input.email }),
          ...(input.phone && { phone: input.phone }),
          customAttributes: [
            { key: "rateup_order_id", value: input.rateupOrderId },
            { key: "rateup_writeback", value: "1" },
          ],
          tags: ["rateup"],
          note: `RateUp order #${input.orderNumber} · ${input.paid ? "paid" : "not paid yet"} (${input.paymentMethod})`,
        },
      },
    },
  );
  assertNoUserErrors("draftOrderCreate", created.data?.draftOrderCreate.userErrors);
  const draftId = created.data?.draftOrderCreate.draftOrder?.id;
  if (!draftId) throw new Error("Shopify created no draft order");

  const completed = await client.request<{
    draftOrderComplete: {
      draftOrder: { order: { legacyResourceId: string; name: string } | null } | null;
      userErrors: ShopifyUserError[];
    };
  }>(
    `mutation complete($id: ID!, $pending: Boolean) {
      draftOrderComplete(id: $id, paymentPending: $pending) {
        draftOrder { order { legacyResourceId name } }
        userErrors { field message }
      }
    }`,
    { variables: { id: draftId, pending: !input.paid } },
  );
  assertNoUserErrors("draftOrderComplete", completed.data?.draftOrderComplete.userErrors);
  const order = completed.data?.draftOrderComplete.draftOrder?.order;
  if (!order) throw new Error("Shopify completed the draft order without an order");
  return { id: order.legacyResourceId, name: order.name ?? null };
}

/** A written-back cash or transfer order whose money RateUp has now received. */
export async function markShopifyOrderPaid(orgId: string, orderId: string) {
  const { client } = await shopClient(orgId);
  const response = await client.request<{
    orderMarkAsPaid: { userErrors: ShopifyUserError[] };
  }>(
    `mutation paid($input: OrderMarkAsPaidInput!) {
      orderMarkAsPaid(input: $input) { userErrors { field message } }
    }`,
    { variables: { input: { id: gid("Order", orderId) } } },
  );
  assertNoUserErrors("orderMarkAsPaid", response.data?.orderMarkAsPaid.userErrors);
}

/** Cancelled in RateUp: the store's copy is cancelled too, without refunding (RateUp holds the money). */
export async function cancelShopifyOrder(orgId: string, orderId: string) {
  const { client } = await shopClient(orgId);
  const response = await client.request<{ orderCancel: { userErrors: ShopifyUserError[] } }>(
    `mutation cancel($id: ID!) {
      orderCancel(orderId: $id, reason: OTHER, refund: false, restock: true, notifyCustomer: false) {
        userErrors: orderCancelUserErrors { field message }
      }
    }`,
    { variables: { id: gid("Order", orderId) } },
  );
  assertNoUserErrors("orderCancel", response.data?.orderCancel.userErrors);
}

/** An unpaid checkout draft that lapsed, so it doesn't sit in the merchant's drafts forever. */
export async function deleteShopifyDraftOrder(orgId: string, draftId: string) {
  const { client } = await shopClient(orgId);
  const response = await client.request<{ draftOrderDelete: { userErrors: ShopifyUserError[] } }>(
    `mutation remove($input: DraftOrderDeleteInput!) {
      draftOrderDelete(input: $input) { userErrors { field message } }
    }`,
    { variables: { input: { id: gid("DraftOrder", draftId) } } },
  );
  assertNoUserErrors("draftOrderDelete", response.data?.draftOrderDelete.userErrors);
}
