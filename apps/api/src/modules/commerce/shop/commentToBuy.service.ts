import { Prisma, type ShopStore } from "../../../generated/prisma/client.js";
import { sellableWhere } from "./checkoutVia.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import {
  sendInstagramPrivateReply,
  sendInstagramTextMessage,
} from "../../whatsapp/instagram/instagram_messaging.service.js";
import { rememberSocialSource } from "./attribution.js";
import { shopProductsActionSchema } from "./commentToBuy.schema.js";
import { storefrontUrl } from "./events.js";
import { checkoutLinkFor } from "./externalCheckout.service.js";
import { formatMoney } from "./money.js";
import { toNumber } from "./pricing.js";
import type { ShopAttribution } from "./shop.types.js";
import { storefrontProductUrl } from "./storefrontLinks.js";
import { commerceEnabled } from "./store.service.js";
import { contactWhereIdentity } from "../../contact/identity/contactFields.js";

export type DropClaim =
  | { status: "claimed"; claimId: string }
  | { status: "already"; claimId: string; orderId: string | null }
  | { status: "sold_out" };

// Prisma keeps DateTime as UTC in timestamp columns without a zone; compare like for like.
const utc = (d: Date) => Prisma.sql`(${d.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;

/** A claim that never got an order (no single thing to buy, or the order failed) holds this long. */
const BARE_CLAIM_MS = 15 * 60_000;

/**
 * Takes one unit of a drop for a commenter. The advisory lock serialises claims on the drop,
 * so two comments arriving together can't both take the last unit; a repeat commenter gets
 * their first claim back rather than a second. Only claims that can still become a sale
 * count: a placed order, a draft still inside its checkout window, or a bare claim for a few
 * minutes. A lapsed claim is dropped, so its unit (and that commenter) can go again.
 */
export async function claimDropUnit(
  ruleId: string,
  recipient: string,
  limit: number,
  now = new Date(),
): Promise<DropClaim> {
  const bareSince = new Date(now.getTime() - BARE_CLAIM_MS);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${ruleId}))) AS l`;
    const existing = await tx.shopDropClaim.findUnique({
      where: { ruleId_recipient: { ruleId, recipient } },
    });
    if (existing) {
      const order = existing.orderId
        ? await tx.shopOrder.findUnique({
            where: { id: existing.orderId },
            select: { status: true, checkoutExpiresAt: true },
          })
        : null;
      const live = order
        ? order.status === "OPEN" ||
          order.status === "COMPLETED" ||
          (order.status === "DRAFT" && (!order.checkoutExpiresAt || order.checkoutExpiresAt > now))
        : existing.createdAt > bareSince;
      if (live) return { status: "already", claimId: existing.id, orderId: existing.orderId };
      await tx.shopDropClaim.delete({ where: { id: existing.id } });
    }
    const [row] = await tx.$queryRaw<{ taken: bigint }[]>`
      SELECT count(*)::bigint AS taken
      FROM "ShopDropClaim" c LEFT JOIN "ShopOrder" o ON o.id = c."orderId"
      WHERE c."ruleId" = ${ruleId}::uuid AND (
        (c."orderId" IS NULL AND c."createdAt" > ${utc(bareSince)})
        OR o.status IN ('OPEN', 'COMPLETED')
        OR (o.status = 'DRAFT' AND (o."checkoutExpiresAt" IS NULL OR o."checkoutExpiresAt" > ${utc(now)}))
      )`;
    if (Number(row?.taken ?? 0) >= limit) return { status: "sold_out" };
    const claim = await tx.shopDropClaim.create({ data: { ruleId, recipient } });
    return { status: "claimed", claimId: claim.id };
  });
}

type ProductWithVariants = Awaited<ReturnType<typeof loadProducts>>[number];

async function loadProducts(store: ShopStore, ids: string[]) {
  const products = await prisma.shopProduct.findMany({
    where: { id: { in: ids }, storeId: store.id, status: "ACTIVE", ...sellableWhere(store) },
    include: { variants: { orderBy: { position: "asc" } } },
  });
  return products.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
}

const sellable = (v: ProductWithVariants["variants"][number]) =>
  !v.trackInventory || v.stock > 0 || v.allowBackorder;

function priceLabel(store: ShopStore, p: ProductWithVariants) {
  const prices = p.variants.map((v) => toNumber(v.price));
  const from = Math.min(...prices);
  const label = formatMoney(from, store.currency);
  return prices.some((x) => x !== from) ? `from ${label}` : label;
}

const SOCIAL_KINDS: Partial<Record<string, "ig_comment" | "ig_story">> = {
  INSTAGRAM_COMMENT: "ig_comment",
  INSTAGRAM_STORY_MENTION: "ig_story",
};

export interface CommentToBuyInput {
  orgId: string;
  ruleId: string;
  /** The rule's trigger: a comment, or a story that mentions the business. */
  triggerEvent: string;
  value: unknown;
  /** The Instagram business account the comment arrived on. */
  accountId: string;
  /** The commenter's Instagram-scoped id. */
  recipient: string;
  /** Present for a comment: the reply has to be a private reply to it. */
  commentId?: string;
  mediaId?: string;
}

/**
 * Answers a comment with the products and a way to buy them. A commenter who has never
 * messaged the business can only be reached by one private reply, which Meta limits to text,
 * so the reply carries a direct checkout link where there is one product to buy, or the
 * storefront otherwise. Returns false when nothing was sent.
 */
export async function runShopProductsAction(input: CommentToBuyInput): Promise<boolean> {
  const parsed = shopProductsActionSchema.safeParse(input.value);
  if (!parsed.success) {
    log.warn({ ruleId: input.ruleId }, "Comment-to-buy action has no valid products");
    return false;
  }
  const action = parsed.data;
  const store = await prisma.shopStore.findUnique({ where: { orgId: input.orgId } });
  if (!store || !(await commerceEnabled(input.orgId))) return false;

  const products = await loadProducts(store, action.productIds);
  if (!products.length) {
    log.warn({ ruleId: input.ruleId }, "Comment-to-buy products are no longer for sale");
    return false;
  }

  const contact = await prisma.contact.findFirst({
    where: { orgId: input.orgId, ...contactWhereIdentity("igsId", input.recipient) },
    select: { id: true },
  });
  const kind = SOCIAL_KINDS[input.triggerEvent];
  // Any other Instagram trigger is a DM, which the chat checkout already attributes.
  const attribution: ShopAttribution | null = kind
    ? { kind, mediaId: input.mediaId, commentId: input.commentId, ruleId: input.ruleId }
    : null;
  if (contact && kind) {
    await rememberSocialSource(input.orgId, contact.id, {
      kind,
      mediaId: input.mediaId,
      commentId: input.commentId,
      ruleId: input.ruleId,
    });
  }

  const first = products[0];
  let claim: DropClaim | null = null;
  if (action.dropLimit) {
    claim = await claimDropUnit(input.ruleId, input.recipient, action.dropLimit);
    if (claim.status === "sold_out") {
      const more = store.storefrontEnabled
        ? ` See what's still available: ${storefrontUrl(store.slug)}`
        : "";
      await reply(input, `Sorry, ${first.title} has sold out.${more}`);
      return true;
    }
  }

  const link = await buyLink(store, products, claim, contact?.id ?? null, input, attribution);
  const lines = products.slice(0, 5).map((p) => `• ${p.title} · ${priceLabel(store, p)}`);
  const intro =
    action.message ||
    (products.length === 1 ? "Thanks for your comment! Here it is:" : "Thanks! Here's the edit:");
  const outro = link
    ? `${link.direct ? "Buy it here" : "Shop here"}: ${link.url}`
    : "Reply here and we'll help you order.";
  const text = fitReply(intro, lines, outro);
  await reply(input, text);

  // A story mention is a DM, so the window is open and the cards can follow the text.
  if (!input.commentId && contact) {
    try {
      const { sendProductsInChat } = await import("./chatProducts.service.js");
      await sendProductsInChat({
        orgId: input.orgId,
        contactId: contact.id,
        channel: "INSTAGRAM",
        channelAccountId: input.accountId,
        productIds: products.map((p) => p.id),
      });
    } catch (err) {
      log.warn({ err, ruleId: input.ruleId }, "Could not follow up with product cards");
    }
  }
  return true;
}

/**
 * A checkout for exactly one thing to buy, so the commenter lands on the address step; a
 * choice of products or variants goes to the storefront instead. A drop claim is tied to the
 * draft it starts, so a repeat comment gets that same checkout back. The claim holds no stock:
 * placing the order takes stock, and `placeOrder` refuses a drop that already placed its limit.
 */
async function buyLink(
  store: ShopStore,
  products: ProductWithVariants[],
  claim: DropClaim | null,
  contactId: string | null,
  input: CommentToBuyInput,
  attribution: ShopAttribution | null,
): Promise<{ url: string; direct: boolean } | null> {
  if (claim?.status === "already" && claim.orderId) {
    const url = await checkoutLinkFor(claim.orderId).catch(() => null);
    if (url) return { url, direct: true };
  }
  const variants = products.length === 1 ? products[0].variants.filter(sellable) : [];
  if (variants.length === 1) {
    try {
      const { createDraftOrder } = await import("./orders.service.js");
      const order = await createDraftOrder({
        store,
        items: [{ variantId: variants[0].id, quantity: 1 }],
        channel: "INSTAGRAM",
        source: attribution?.kind ?? "ig_dm",
        contactId,
        channelAccountId: input.accountId,
        attribution,
      });
      if (claim && claim.status !== "sold_out") {
        await prisma.shopDropClaim.update({
          where: { id: claim.claimId },
          data: { orderId: order.id },
        });
      }
      const url = await checkoutLinkFor(order.id);
      if (url) return { url, direct: true };
    } catch (err) {
      log.warn({ err, ruleId: input.ruleId }, "Comment-to-buy could not start a checkout");
    }
  }
  if (!store.storefrontEnabled) return null;
  return {
    url:
      products.length === 1
        ? storefrontProductUrl(store.slug, products[0])
        : storefrontUrl(store.slug),
    direct: false,
  };
}

/** Meta's private-reply limit. */
const REPLY_MAX = 1000;

/**
 * Fits the reply into Meta's limit without ever cutting the link: the intro is shortened,
 * and product lines are dropped only if the lines and link alone are too long.
 */
export function fitReply(intro: string, lines: string[], outro: string) {
  const kept = [...lines];
  const join = (head: string) => [head, ...kept, outro].filter(Boolean).join("\n");
  while (kept.length && join("").length > REPLY_MAX) kept.pop();
  const room = REPLY_MAX - join("").length - 1;
  if (intro.length <= room) return join(intro);
  return join(room > 1 ? `${intro.slice(0, room - 1).trimEnd()}…` : "");
}

async function reply(input: CommentToBuyInput, text: string) {
  if (input.commentId) {
    await sendInstagramPrivateReply(
      input.commentId,
      text,
      input.accountId,
      input.orgId,
      input.recipient,
    );
  } else {
    await sendInstagramTextMessage(input.recipient, text, input.orgId, input.accountId);
  }
}
