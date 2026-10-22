import type { FastifyInstance, FastifyRequest } from "fastify";
import type z from "zod";

import { declareAccess } from "../../../authz/registry.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";
import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import prisma from "../../../utils/prisma.js";
import { sendProductsInChat } from "./chatProducts.service.js";
import { createOrderFromInbox, sendCheckoutLink, sendPaymentLink } from "./checkout.service.js";
import {
  createDiscount,
  deleteDiscount,
  generateCode,
  listDiscounts,
  updateDiscount,
} from "./discounts.service.js";
import { checkoutUrl, storefrontUrl } from "./events.js";
import {
  cancelOrder,
  confirmCodOrder,
  getOrder,
  listOrders,
  setFulfillmentStatus,
  updateStaffNote,
} from "./orders.service.js";
import {
  connectPaymentProvider,
  disconnectPaymentProvider,
  listPaymentMethods,
  markPaidManually,
  refundOrder,
  setWebhookSecret,
} from "./payments/payments.service.js";
import {
  archiveProduct,
  bulkSetStatus,
  createProduct,
  deleteCollection,
  exportProductsCsv,
  getProduct,
  importProductsCsv,
  listCollections,
  listProducts,
  setStock,
  stockHistory,
  updateProduct,
  upsertCollection,
} from "./products.service.js";
import { requestReturn, updateReturn } from "./returns.service.js";
import {
  bulkEditSchema,
  bulkStatusSchema,
  buyLabelSchema,
  cancelSchema,
  collectionSchema,
  createOrderSchema,
  csvImportSchema,
  importFromSchema,
  discountSchema,
  easypostConnectSchema,
  fulfillmentSchema,
  idParams,
  markPaidSchema,
  messageRatesSchema,
  orderListQuery,
  paymentConnectSchema,
  productListQuery,
  productSchema,
  providerParams,
  quoteSchema,
  refundSchema,
  returnActionSchema,
  returnRefundSchema,
  returnSchema,
  saveSegmentSchema,
  segmentCriteriaSchema,
  sendProductsSchema,
  sendToMeSchema,
  testOrderSchema,
  shipmentSchema,
  shippingRateSchema,
  staffNoteSchema,
  stockSchema,
  storeUpdateSchema,
  webhookSecretSchema,
} from "./shop.schema.js";
import { actorId, h } from "./shop.http.js";
import { getMessageReport, setMessageRates } from "./messageCost.service.js";
import { bulkEditVariants, duplicateProduct } from "./productBulk.service.js";
import { getAdReport } from "./adReport.service.js";
import { getOverview, setupChecklist } from "./shopAnalytics.service.js";
import { importProducts, importSources } from "./productImport.service.js";
import { mirrorConnectedStore, stopFollowingStore } from "./storeSync.service.js";
import { inStoreCheckout, storeLabel } from "./checkoutVia.js";
import { externalAdminUrl, storeConnected } from "./externalCheckout.service.js";
import {
  connectCatalog,
  createTestOrder,
  findCatalogs,
  republishStore,
  sendProductToMe,
  whatsappStatus,
} from "./setup.service.js";
import { forgetPublicStorefront, getStorefront } from "./storefront.service.js";
import { previewSegment, saveSegmentAsGroup } from "./segments.service.js";
import {
  buyShippingLabel,
  connectEasypost,
  createShipment,
  disconnectEasypost,
  quoteShipping,
  shippingProviders,
} from "./shipping.service.js";
import { openInvoice, sendInvoice, viewInvoice } from "./invoice.service.js";
import { ShopError } from "./shop.errors.js";
import { assertCanTakeOrder } from "./orderAllowance.js";
import {
  deleteShippingRate,
  getOrCreateStore,
  listShippingRates,
  updateStore,
  upsertShippingRate,
} from "./store.service.js";

type Req<P = unknown, B = unknown, Q = unknown> = FastifyRequest<{
  Params: P;
  Body: B;
  Querystring: Q;
}>;
type Id = z.infer<typeof idParams>;

const store = (request: FastifyRequest) => getOrCreateStore(request.user.orgId);

/** Shipped from the store it was paid in; RateUp follows that store's fulfilment webhooks. */
function assertFulfilledHere(order: { checkoutVia: string }) {
  if (inStoreCheckout(order.checkoutVia))
    throw new ShopError(
      "CONFLICT",
      `This order was placed in ${storeLabel(order.checkoutVia)}. Fulfil it there and RateUp follows.`,
    );
}

/** The merchant's shop: products, orders, coupons, payments and shipping. Mounted at /api/shop. */
export async function shopRoutes(server: FastifyInstance) {
  declareAccess(server, { read: "commerce.read", write: "commerce.orders.manage" });
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.WhatsappCatalog]),
  );
  const products = { config: { permission: "commerce.products.manage" as const } };
  const discounts = { config: { permission: "commerce.discounts.manage" as const } };
  const payments = { config: { permission: "commerce.payments.manage" as const } };
  const sell = { config: { permission: "commerce.sell" as const } };

  // ─── Store ─────────────────────────────────────────────────────────────────
  server.get(
    "/store",
    h(async (request) => {
      const s = await store(request);
      const [rates, catalogs, methods, whatsapp, linked, connected, ownHidden] = await Promise.all([
        listShippingRates(s.id),
        prisma.whatsappCatalog.findMany({
          where: { orgId: s.orgId },
          select: { catalogId: true, name: true },
        }),
        listPaymentMethods(s),
        whatsappStatus(s.orgId),
        prisma.integration.findMany({
          where: { orgId: s.orgId, name: { in: ["shopify", "woocommerce"] }, active: true },
          select: { name: true },
        }),
        storeConnected(s.orgId, s.mode),
        // Made in RateUp, so they can't be paid for on the store's checkout and aren't shown.
        inStoreCheckout(s.checkoutVia)
          ? prisma.shopProduct.count({
              where: { storeId: s.id, status: "ACTIVE", externalSource: null },
            })
          : 0,
      ]);
      return {
        ...s,
        storefrontUrl: storefrontUrl(s.slug),
        shippingRates: rates,
        catalogs,
        payments: methods,
        whatsapp,
        // Whether the Shopify or WooCommerce store this shop follows is still connected.
        externalStoreConnected: s.mode === "NATIVE" ? null : connected,
        // Connected stores this shop could start following.
        connectedStores: linked.map((l) => l.name),
        ownProductsHidden: ownHidden,
      };
    }),
  );
  server.patch(
    "/store",
    {
      schema: { body: storeUpdateSchema },
      config: { permission: ["commerce.payments.manage", "commerce.storefront.manage"] },
    },
    h(async (request: Req<unknown, z.infer<typeof storeUpdateSchema>>) => {
      const { notifications, storefrontTheme, bankDetails, metaCatalogId, ...rest } = request.body;
      // The route also lets storefront editors in; where the money goes is for payments managers.
      if (rest.checkoutVia !== undefined && !request.actor?.can("commerce.payments.manage"))
        throw new ShopError("FORBIDDEN", "Only people who manage payments can change the checkout");
      const before = await store(request);
      const updated = await updateStore(request.user.orgId, {
        ...rest,
        ...(notifications !== undefined ? { notifications } : {}),
        ...(storefrontTheme !== undefined ? { storefrontTheme: storefrontTheme ?? undefined } : {}),
        ...(bankDetails !== undefined ? { bankDetails: bankDetails ?? undefined } : {}),
        ...(metaCatalogId === null ? { metaCatalogId: null } : {}),
      });
      forgetPublicStorefront(before.slug, updated.slug);
      // A new catalog is linked to WhatsApp and gets every product, old ones included.
      if (metaCatalogId && metaCatalogId !== before.metaCatalogId) {
        await connectCatalog(before, metaCatalogId);
        return { ...updated, metaCatalogId };
      }
      return updated;
    }),
  );

  server.post(
    "/store/stop-sync",
    payments,
    h(async (request) => {
      // It changes where the money goes and turns the store's products into the shop's own.
      if (!request.actor?.can("commerce.products.manage"))
        throw new ShopError("FORBIDDEN", "Only people who manage products can stop syncing");
      const before = await store(request);
      const result = await stopFollowingStore(before);
      forgetPublicStorefront(before.slug);
      return result;
    }),
  );

  // ─── Guided setup ──────────────────────────────────────────────────────────
  server.get(
    "/setup",
    h(async (request) => setupChecklist(await store(request))),
  );
  server.post(
    "/setup/find-catalogs",
    payments,
    h(async (request) => findCatalogs(await store(request))),
  );
  server.post(
    "/setup/republish",
    products,
    h(async (request) => republishStore((await store(request)).id)),
  );
  server.post(
    "/products/:id/send-to-me",
    { schema: { params: idParams, body: sendToMeSchema }, ...sell },
    h(async (request: Req<Id, z.infer<typeof sendToMeSchema>>) =>
      sendProductToMe(await store(request), request.params.id, request.body.phone),
    ),
  );
  server.post(
    "/test-order",
    { schema: { body: testOrderSchema }, ...sell },
    h(async (request: Req<unknown, z.infer<typeof testOrderSchema>>) =>
      createTestOrder(await store(request), { ...request.body, actorUserId: actorId(request) }),
    ),
  );
  server.get(
    "/storefront-preview",
    h(async (request) => getStorefront((await store(request)).slug, { preview: true })),
  );
  server.post(
    "/shipping-rates",
    { schema: { body: shippingRateSchema }, ...payments },
    h(async (request: Req<unknown, z.infer<typeof shippingRateSchema>>) =>
      upsertShippingRate((await store(request)).id, undefined, request.body),
    ),
  );
  server.put(
    "/shipping-rates/:id",
    { schema: { params: idParams, body: shippingRateSchema }, ...payments },
    h(async (request: Req<Id, z.infer<typeof shippingRateSchema>>) =>
      upsertShippingRate((await store(request)).id, request.params.id, request.body),
    ),
  );
  server.delete(
    "/shipping-rates/:id",
    { schema: { params: idParams }, ...payments },
    h(async (request: Req<Id>) => {
      await deleteShippingRate((await store(request)).id, request.params.id);
      return { ok: true };
    }),
  );

  server.get(
    "/overview",
    h(async (request: Req<unknown, unknown, { from?: string; to?: string }>) => {
      const s = await store(request);
      const to = request.query.to ? new Date(request.query.to) : new Date();
      const from = request.query.from
        ? new Date(request.query.from)
        : new Date(to.getTime() - 30 * 86_400_000);
      return getOverview(s, from, to);
    }),
  );
  server.get(
    "/message-cost",
    h(async (request: Req<unknown, unknown, { from?: string; to?: string }>) => {
      const s = await store(request);
      const to = request.query.to ? new Date(request.query.to) : new Date();
      const from = request.query.from
        ? new Date(request.query.from)
        : new Date(to.getTime() - 30 * 86_400_000);
      return getMessageReport(s, from, to);
    }),
  );
  server.get(
    "/ad-report",
    h(async (request: Req<unknown, unknown, { from?: string; to?: string }>) => {
      const s = await store(request);
      const to = request.query.to ? new Date(request.query.to) : new Date();
      const from = request.query.from
        ? new Date(request.query.from)
        : new Date(to.getTime() - 30 * 86_400_000);
      return getAdReport(s, from, to);
    }),
  );
  server.put(
    "/message-cost/rates",
    { schema: { body: messageRatesSchema }, ...payments },
    h(async (request: Req<unknown, z.infer<typeof messageRatesSchema>>) =>
      setMessageRates(await store(request), request.body.rates),
    ),
  );

  // ─── Products ──────────────────────────────────────────────────────────────
  server.get(
    "/products",
    { schema: { querystring: productListQuery } },
    h(async (request: Req<unknown, unknown, z.infer<typeof productListQuery>>) =>
      listProducts((await store(request)).id, request.query),
    ),
  );
  server.get(
    "/products/import-sources",
    h(async (request) => importSources(await store(request))),
  );
  server.post(
    "/products/import-from",
    { schema: { body: importFromSchema }, ...products },
    h(async (request: Req<unknown, z.infer<typeof importFromSchema>>) =>
      importProducts(await store(request), request.body, actorId(request) ?? undefined),
    ),
  );
  server.post(
    "/products/sync-store",
    products,
    h(async (request) => mirrorConnectedStore(await store(request))),
  );
  server.get(
    "/products/export",
    h(async (request, reply) => {
      const csv = await exportProductsCsv((await store(request)).id);
      reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", 'attachment; filename="products.csv"');
      return csv;
    }),
  );
  server.post(
    "/products/import",
    { schema: { body: csvImportSchema }, ...products },
    h(async (request: Req<unknown, z.infer<typeof csvImportSchema>>) =>
      importProductsCsv(await store(request), request.body.csv, actorId(request) ?? undefined),
    ),
  );
  server.post(
    "/products",
    { schema: { body: productSchema }, ...products },
    h(async (request: Req<unknown, z.infer<typeof productSchema>>) =>
      createProduct(await store(request), request.body, actorId(request) ?? undefined),
    ),
  );
  server.post(
    "/products/bulk-status",
    { schema: { body: bulkStatusSchema }, ...products },
    h(async (request: Req<unknown, z.infer<typeof bulkStatusSchema>>) => {
      await bulkSetStatus((await store(request)).id, request.body.ids, request.body.status);
      return { ok: true };
    }),
  );
  server.post(
    "/products/bulk-edit",
    { schema: { body: bulkEditSchema }, ...products },
    h(async (request: Req<unknown, z.infer<typeof bulkEditSchema>>) =>
      bulkEditVariants(await store(request), request.body, actorId(request) ?? undefined),
    ),
  );
  server.post(
    "/products/:id/duplicate",
    { schema: { params: idParams }, ...products },
    h(async (request: Req<Id>) =>
      duplicateProduct(await store(request), request.params.id, actorId(request) ?? undefined),
    ),
  );
  server.get(
    "/products/:id",
    { schema: { params: idParams } },
    h(async (request: Req<Id>) => getProduct((await store(request)).id, request.params.id)),
  );
  server.put(
    "/products/:id",
    { schema: { params: idParams, body: productSchema }, ...products },
    h(async (request: Req<Id, z.infer<typeof productSchema>>) =>
      updateProduct((await store(request)).id, request.params.id, request.body),
    ),
  );
  server.delete(
    "/products/:id",
    { schema: { params: idParams }, ...products },
    h(async (request: Req<Id>) => {
      await archiveProduct((await store(request)).id, request.params.id);
      return { ok: true };
    }),
  );
  server.put(
    "/variants/:id/stock",
    { schema: { params: idParams, body: stockSchema }, ...products },
    h(async (request: Req<Id, z.infer<typeof stockSchema>>) =>
      setStock(
        (await store(request)).id,
        request.params.id,
        request.body.stock,
        actorId(request) ?? undefined,
        request.body.note,
      ),
    ),
  );
  server.get(
    "/variants/:id/stock-history",
    { schema: { params: idParams } },
    h(async (request: Req<Id>) => stockHistory((await store(request)).id, request.params.id)),
  );

  server.get(
    "/collections",
    h(async (request) => listCollections((await store(request)).id)),
  );
  server.post(
    "/collections",
    { schema: { body: collectionSchema }, ...products },
    h(async (request: Req<unknown, z.infer<typeof collectionSchema>>) =>
      upsertCollection((await store(request)).id, undefined, request.body),
    ),
  );
  server.put(
    "/collections/:id",
    { schema: { params: idParams, body: collectionSchema }, ...products },
    h(async (request: Req<Id, z.infer<typeof collectionSchema>>) =>
      upsertCollection((await store(request)).id, request.params.id, request.body),
    ),
  );
  server.delete(
    "/collections/:id",
    { schema: { params: idParams }, ...products },
    h(async (request: Req<Id>) => {
      await deleteCollection((await store(request)).id, request.params.id);
      return { ok: true };
    }),
  );

  // ─── Orders ────────────────────────────────────────────────────────────────
  server.get(
    "/orders",
    { schema: { querystring: orderListQuery } },
    h(async (request: Req<unknown, unknown, z.infer<typeof orderListQuery>>) =>
      listOrders((await store(request)).id, request.query),
    ),
  );
  server.post(
    "/orders",
    { schema: { body: createOrderSchema }, ...sell },
    h(async (request: Req<unknown, z.infer<typeof createOrderSchema>>) =>
      createOrderFromInbox({
        ...request.body,
        orgId: request.user.orgId,
        actorUserId: actorId(request)!,
      }),
    ),
  );
  server.get(
    "/orders/:id",
    { schema: { params: idParams } },
    h(async (request: Req<Id>) => {
      const order = await getOrder((await store(request)).id, request.params.id);
      return {
        ...order,
        // A store-checkout order's link too: RateUp's page sends the customer on to the store.
        checkoutUrl:
          order.checkoutToken && order.status === "DRAFT" ? checkoutUrl(order.checkoutToken) : null,
        externalAdminUrl: await externalAdminUrl(order).catch(() => null),
      };
    }),
  );
  server.post(
    "/orders/:id/payment-link",
    { schema: { params: idParams }, ...sell },
    h(async (request: Req<Id>) => {
      const order = await getOrder((await store(request)).id, request.params.id);
      if (order.status === "DRAFT") await assertCanTakeOrder(order, "staff");
      return sendPaymentLink(request.params.id, { actorUserId: actorId(request) ?? undefined });
    }),
  );
  server.post(
    "/orders/:id/checkout-link",
    { schema: { params: idParams }, ...sell },
    h(async (request: Req<Id>) => {
      const s = await store(request);
      await getOrder(s.id, request.params.id);
      const order = await prisma.shopOrder.findUniqueOrThrow({
        where: { id: request.params.id },
        include: { store: true },
      });
      if (order.status !== "DRAFT")
        throw new ShopError("CONFLICT", "This order has already been placed");
      await assertCanTakeOrder(order, "staff");
      return sendCheckoutLink(order);
    }),
  );
  server.post(
    "/orders/:id/fulfillment",
    { schema: { params: idParams, body: fulfillmentSchema } },
    h(async (request: Req<Id, z.infer<typeof fulfillmentSchema>>) => {
      assertFulfilledHere(await getOrder((await store(request)).id, request.params.id));
      return setFulfillmentStatus(
        request.params.id,
        request.body.status,
        actorId(request),
        request.body.note,
      );
    }),
  );
  server.post(
    "/orders/:id/shipments",
    { schema: { params: idParams, body: shipmentSchema } },
    h(async (request: Req<Id, z.infer<typeof shipmentSchema>>) => {
      const s = await store(request);
      assertFulfilledHere(await getOrder(s.id, request.params.id));
      return createShipment(s.id, request.params.id, {
        ...request.body,
        actorUserId: actorId(request),
      });
    }),
  );
  server.post(
    "/orders/:id/shipping-quote",
    { schema: { params: idParams, body: quoteSchema } },
    h(async (request: Req<Id, z.infer<typeof quoteSchema>>) =>
      quoteShipping((await store(request)).id, request.params.id, request.body),
    ),
  );
  server.post(
    "/orders/:id/shipping-label",
    { schema: { params: idParams, body: buyLabelSchema } },
    h(async (request: Req<Id, z.infer<typeof buyLabelSchema>>) =>
      buyShippingLabel(
        (await store(request)).id,
        request.params.id,
        request.body.shipmentId,
        request.body.rateId,
        actorId(request)!,
      ),
    ),
  );
  server.post(
    "/orders/:id/cancel",
    { schema: { params: idParams, body: cancelSchema } },
    h(async (request: Req<Id, z.infer<typeof cancelSchema>>) => {
      await getOrder((await store(request)).id, request.params.id);
      return cancelOrder(request.params.id, { ...request.body, actorUserId: actorId(request) });
    }),
  );
  server.post(
    "/orders/:id/confirm-cod",
    { schema: { params: idParams } },
    h(async (request: Req<Id>) => {
      await getOrder((await store(request)).id, request.params.id);
      return confirmCodOrder(request.params.id, actorId(request));
    }),
  );
  server.post(
    "/orders/:id/mark-paid",
    { schema: { params: idParams, body: markPaidSchema } },
    h(async (request: Req<Id, z.infer<typeof markPaidSchema>>) => {
      await getOrder((await store(request)).id, request.params.id);
      return markPaidManually(request.params.id, request.body.method, actorId(request)!);
    }),
  );
  server.post(
    "/orders/:id/refund",
    { schema: { params: idParams, body: refundSchema }, ...payments },
    h(async (request: Req<Id, z.infer<typeof refundSchema>>) => {
      await getOrder((await store(request)).id, request.params.id);
      await refundOrder(request.params.id, request.body.amount ?? null, actorId(request));
      return { ok: true };
    }),
  );
  server.get(
    "/orders/:id/invoice",
    { schema: { params: idParams } },
    h(async (request: Req<Id>) => {
      await getOrder((await store(request)).id, request.params.id);
      return viewInvoice(request.params.id);
    }),
  );
  server.post(
    "/orders/:id/invoice",
    { schema: { params: idParams } },
    h(async (request: Req<Id>) => {
      await getOrder((await store(request)).id, request.params.id);
      return openInvoice(request.params.id);
    }),
  );
  server.post(
    "/orders/:id/invoice/send",
    { schema: { params: idParams }, ...sell },
    h(async (request: Req<Id>) => {
      await getOrder((await store(request)).id, request.params.id);
      return sendInvoice(request.params.id, { force: true, actorUserId: actorId(request) });
    }),
  );
  server.put(
    "/orders/:id/note",
    { schema: { params: idParams, body: staffNoteSchema } },
    h(async (request: Req<Id, z.infer<typeof staffNoteSchema>>) => {
      await updateStaffNote((await store(request)).id, request.params.id, request.body.staffNote);
      return { ok: true };
    }),
  );
  server.post(
    "/orders/:id/returns",
    { schema: { params: idParams, body: returnSchema } },
    h(async (request: Req<Id, z.infer<typeof returnSchema>>) => {
      await getOrder((await store(request)).id, request.params.id);
      return requestReturn(request.params.id, { ...request.body, actorUserId: actorId(request) });
    }),
  );
  server.post(
    "/returns/:id",
    { schema: { params: idParams, body: returnActionSchema } },
    h(async (request: Req<Id, z.infer<typeof returnActionSchema>>) =>
      updateReturn((await store(request)).id, request.params.id, request.body.action, {
        ...request.body,
        actorUserId: actorId(request)!,
      }),
    ),
  );
  server.post(
    "/returns/:id/refund",
    { schema: { params: idParams, body: returnRefundSchema }, ...payments },
    h(async (request: Req<Id, z.infer<typeof returnRefundSchema>>) =>
      updateReturn((await store(request)).id, request.params.id, "refund", {
        ...request.body,
        actorUserId: actorId(request)!,
      }),
    ),
  );

  // ─── Selling in chat ───────────────────────────────────────────────────────
  server.post(
    "/chat/products",
    { schema: { body: sendProductsSchema }, ...sell },
    h(async (request: Req<unknown, z.infer<typeof sendProductsSchema>>) =>
      sendProductsInChat({
        ...request.body,
        orgId: request.user.orgId,
        userId: actorId(request) ?? undefined,
        userName: request.user.email,
      }),
    ),
  );

  // ─── Shopper segments → contact groups ─────────────────────────────────────
  server.post(
    "/segments/preview",
    { schema: { body: segmentCriteriaSchema } },
    h(async (request: Req<unknown, z.infer<typeof segmentCriteriaSchema>>) =>
      previewSegment((await store(request)).id, request.body),
    ),
  );
  server.post(
    "/segments",
    { schema: { body: saveSegmentSchema }, config: { permission: "contacts.manage" } },
    h(async (request: Req<unknown, z.infer<typeof saveSegmentSchema>>) =>
      saveSegmentAsGroup(await store(request), request.body),
    ),
  );

  // ─── Coupons ───────────────────────────────────────────────────────────────
  server.get(
    "/discounts",
    h(async (request) => listDiscounts((await store(request)).id)),
  );
  server.get(
    "/discounts/generate-code",
    h(async (request: Req<unknown, unknown, { prefix?: string }>) => ({
      code: generateCode(request.query.prefix ?? ""),
    })),
  );
  server.post(
    "/discounts",
    { schema: { body: discountSchema }, ...discounts },
    h(async (request: Req<unknown, z.infer<typeof discountSchema>>) =>
      createDiscount((await store(request)).id, request.body),
    ),
  );
  server.put(
    "/discounts/:id",
    { schema: { params: idParams, body: discountSchema }, ...discounts },
    h(async (request: Req<Id, z.infer<typeof discountSchema>>) =>
      updateDiscount((await store(request)).id, request.params.id, request.body),
    ),
  );
  server.delete(
    "/discounts/:id",
    { schema: { params: idParams }, ...discounts },
    h(async (request: Req<Id>) => deleteDiscount((await store(request)).id, request.params.id)),
  );

  // ─── Payments & shipping providers ─────────────────────────────────────────
  server.get(
    "/payments",
    h(async (request) => listPaymentMethods(await store(request))),
  );
  server.post(
    "/payments/:provider",
    { schema: { params: providerParams, body: paymentConnectSchema }, ...payments },
    h(async (request: Req<z.infer<typeof providerParams>, z.infer<typeof paymentConnectSchema>>) =>
      connectPaymentProvider(await store(request), request.params.provider, request.body),
    ),
  );
  server.put(
    "/payments/:provider/webhook-secret",
    { schema: { params: providerParams, body: webhookSecretSchema }, ...payments },
    h(async (request: Req<z.infer<typeof providerParams>, z.infer<typeof webhookSecretSchema>>) => {
      await setWebhookSecret(
        await store(request),
        request.params.provider,
        request.body.webhookSecret,
      );
      return listPaymentMethods(await store(request));
    }),
  );
  server.delete(
    "/payments/:provider",
    { schema: { params: providerParams }, ...payments },
    h(async (request: Req<z.infer<typeof providerParams>>) => {
      await disconnectPaymentProvider(await store(request), request.params.provider);
      return listPaymentMethods(await store(request));
    }),
  );
  server.get(
    "/shipping-providers",
    h(async (request) => shippingProviders(request.user.orgId)),
  );
  server.post(
    "/shipping-providers/easypost",
    { schema: { body: easypostConnectSchema }, ...payments },
    h(async (request: Req<unknown, z.infer<typeof easypostConnectSchema>>) =>
      connectEasypost(await store(request), request.body.apiKey, request.body.fromAddress),
    ),
  );
  server.delete(
    "/shipping-providers/easypost",
    payments,
    h(async (request) => {
      await disconnectEasypost(request.user.orgId);
      return shippingProviders(request.user.orgId);
    }),
  );
}
