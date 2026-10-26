import type { FastifyInstance, FastifyRequest } from "fastify";
import fastifyRawBody from "fastify-raw-body";
import type z from "zod";

import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { rateLimit } from "../../../utils/rateLimit.js";
import { clientIp } from "../../../utils/http.js";
import {
  checkoutFromStorefront,
  getPublicCheckout,
  payPublicCheckout,
  startPublicStoreCheckout,
  updatePublicCheckout,
} from "./checkout.service.js";
import { invoiceLinkForToken } from "./invoice.service.js";
import { handlePaymentWebhook } from "./payments/payments.service.js";
import { requestBackInStockFromStorefront } from "./recovery.service.js";
import { requestReturn } from "./returns.service.js";
import {
  backInStockSchema,
  publicCheckoutPatch,
  publicCheckoutQuery,
  publicPaySchema,
  returnSchema,
  slugParams,
  storeIdParams,
  storefrontCheckoutSchema,
  tokenParams,
  webhookParams,
} from "./shop.schema.js";
import { ShopError } from "./shop.errors.js";
import { h } from "./shop.http.js";
import { handleEasypostWebhook } from "./shipping.service.js";
import { getPublicStorefront, listStorefrontPages } from "./storefront.service.js";
import { commerceEnabled } from "./store.service.js";

type Req<P = unknown, B = unknown, Q = unknown> = FastifyRequest<{
  Params: P;
  Body: B;
  Querystring: Q;
}>;
type Token = z.infer<typeof tokenParams>;
type Slug = z.infer<typeof slugParams>;

/** Shoppers and gateways: the storefront, the hosted checkout and payment webhooks. /api/public/shop */
export async function shopPublicRoutes(server: FastifyInstance) {
  // Gateways sign the bytes they sent; re-serialising the parsed body would not reproduce them.
  await server.register(fastifyRawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true,
  });

  const browse = { preHandler: rateLimit({ max: 600, windowSeconds: 60 * 60, key: "shopBrowse" }) };
  const act = { preHandler: rateLimit({ max: 120, windowSeconds: 60 * 60, key: "shopCheckout" }) };
  // The checkout saves as the shopper types, so its edits are counted per checkout; the IP
  // ceiling is generous because a carrier's NAT puts many shoppers behind one address.
  const editing = [
    rateLimit<FastifyRequest<{ Params: Token }>>({
      max: 300,
      windowSeconds: 60 * 60,
      key: "shopCheckoutEdit",
      keyFrom: (r) => r.params.token,
    }),
    rateLimit({ max: 2000, windowSeconds: 60 * 60, key: "shopCheckoutEditIp" }),
  ];
  // Read again while the page waits on a payment or a WhatsApp confirmation: same split.
  const reading = [
    rateLimit<FastifyRequest<{ Params: Token }>>({
      max: 600,
      windowSeconds: 60 * 60,
      key: "shopCheckoutRead",
      keyFrom: (r) => r.params.token,
    }),
    rateLimit({ max: 3000, windowSeconds: 60 * 60, key: "shopCheckoutReadIp" }),
  ];
  // Each one can create an order in the merchant's Shopify or WooCommerce store.
  const toStore = {
    preHandler: rateLimit({ max: 20, windowSeconds: 60 * 60, key: "shopStoreCheckout" }),
  };
  // Guessing coupon codes: a few tries per checkout and per visitor, counted only when a
  // request carries a code. A short window, so a shopper who mistypes a few codes waits
  // minutes, not an hour; a guesser still gets at most 40 tries an hour per checkout.
  type CouponReq = FastifyRequest<{ Params: Token; Body: { discountCode?: string | null } }>;
  const tryingCode = (request: CouponReq) => Boolean(request.body?.discountCode);
  const COUPON_WINDOW_SECONDS = 15 * 60;
  const couponTries = [
    rateLimit<CouponReq>({
      max: 10,
      windowSeconds: COUPON_WINDOW_SECONDS,
      key: "shopCouponToken",
      keyFrom: (r) => (tryingCode(r) ? r.params.token : null),
    }),
    rateLimit<CouponReq>({
      max: 30,
      windowSeconds: COUPON_WINDOW_SECONDS,
      key: "shopCouponIp",
      keyFrom: (r) => (tryingCode(r) ? clientIp(r) : null),
    }),
  ];

  // Read by rateup-ui's /s/sitemap.xml, which builds the product URLs from these titles.
  server.get(
    "/storefronts/sitemap",
    browse,
    h(async () => ({ stores: await listStorefrontPages() })),
  );

  server.get<{ Params: Slug }>(
    "/storefront/:slug",
    { ...browse, schema: { params: slugParams } },
    h(async (request: Req<Slug>) => getPublicStorefront(request.params.slug)),
  );
  server.post<{ Params: Slug; Body: z.infer<typeof storefrontCheckoutSchema> }>(
    "/storefront/:slug/checkout",
    { ...act, schema: { params: slugParams, body: storefrontCheckoutSchema } },
    h(async (request: Req<Slug, z.infer<typeof storefrontCheckoutSchema>>) =>
      checkoutFromStorefront(
        request.params.slug,
        request.body.items,
        request.body.customer,
        request.body.reuseToken,
      ),
    ),
  );
  server.post<{ Params: Slug; Body: z.infer<typeof backInStockSchema> }>(
    "/storefront/:slug/back-in-stock",
    { ...act, schema: { params: slugParams, body: backInStockSchema } },
    h(async (request: Req<Slug, z.infer<typeof backInStockSchema>>) => {
      const store = await prisma.shopStore.findUnique({ where: { slug: request.params.slug } });
      if (!store || !store.storefrontEnabled || !(await commerceEnabled(store.orgId)))
        throw new ShopError("NOT_FOUND", "Shop not found");
      return requestBackInStockFromStorefront(store, request.body.variantId, request.ip);
    }),
  );

  server.get<{ Params: Token; Querystring: z.infer<typeof publicCheckoutQuery> }>(
    "/checkout/:token",
    { preHandler: reading, schema: { params: tokenParams, querystring: publicCheckoutQuery } },
    h(async (request: Req<Token, unknown, z.infer<typeof publicCheckoutQuery>>) =>
      getPublicCheckout(request.params.token, { justPaid: request.query.paid === "1" }),
    ),
  );
  server.patch<{ Params: Token; Body: z.infer<typeof publicCheckoutPatch> }>(
    "/checkout/:token",
    {
      preHandler: [...editing, ...couponTries],
      schema: { params: tokenParams, body: publicCheckoutPatch },
    },
    h(async (request: Req<Token, z.infer<typeof publicCheckoutPatch>>) =>
      updatePublicCheckout(request.params.token, request.body),
    ),
  );
  server.post<{ Params: Token; Body: z.infer<typeof publicPaySchema> }>(
    "/checkout/:token/pay",
    { ...act, schema: { params: tokenParams, body: publicPaySchema } },
    h(async (request: Req<Token, z.infer<typeof publicPaySchema>>) =>
      payPublicCheckout(request.params.token, request.body.method, request.ip),
    ),
  );
  server.post<{ Params: Token }>(
    "/checkout/:token/store",
    { ...toStore, schema: { params: tokenParams } },
    h(async (request: Req<Token>) => startPublicStoreCheckout(request.params.token)),
  );
  server.get<{ Params: Token }>(
    "/checkout/:token/invoice",
    { ...browse, schema: { params: tokenParams } },
    async (request: Req<Token>, reply) => {
      try {
        return reply.redirect(await invoiceLinkForToken(request.params.token), 302);
      } catch (err) {
        if (err instanceof ShopError) return reply.code(404).send({ error: err.message });
        throw err;
      }
    },
  );
  server.post<{ Params: Token; Body: z.infer<typeof returnSchema> }>(
    "/checkout/:token/returns",
    { ...act, schema: { params: tokenParams, body: returnSchema } },
    h(async (request: Req<Token, z.infer<typeof returnSchema>>) => {
      const order = await prisma.shopOrder.findUnique({
        where: { checkoutToken: request.params.token },
        select: { id: true },
      });
      if (!order) throw new ShopError("NOT_FOUND", "Order not found");
      await requestReturn(order.id, request.body);
      return { ok: true };
    }),
  );

  server.post(
    "/payments/:provider/:storeId",
    { config: { rawBody: true }, schema: { params: webhookParams } },
    async (request: Req<z.infer<typeof webhookParams>>, reply) => {
      try {
        await handlePaymentWebhook(
          request.params.provider,
          request.params.storeId,
          String(request.rawBody ?? ""),
          request.headers,
        );
        return reply.send({ received: true });
      } catch (err) {
        // A bad signature is the sender's problem; anything else is ours and the gateway retries.
        if (
          err instanceof ShopError &&
          (err.code === "INVALID" || err.code === "NOT_FOUND" || err.code === "PAYMENT_UNAVAILABLE")
        )
          return reply.code(400).send({ error: err.message });
        log.error({ err, provider: request.params.provider }, "Shop payment webhook failed");
        return reply.code(500).send({ error: "retry" });
      }
    },
  );

  server.post(
    "/shipping/easypost/:storeId",
    { config: { rawBody: true }, schema: { params: storeIdParams } },
    async (request: Req<z.infer<typeof storeIdParams>>, reply) => {
      try {
        await handleEasypostWebhook(
          request.params.storeId,
          String(request.rawBody ?? ""),
          request.headers,
        );
        return reply.send({ received: true });
      } catch (err) {
        if (err instanceof ShopError) return reply.code(400).send({ error: err.message });
        log.error({ err }, "EasyPost webhook failed");
        return reply.code(500).send({ error: "retry" });
      }
    },
  );
}
