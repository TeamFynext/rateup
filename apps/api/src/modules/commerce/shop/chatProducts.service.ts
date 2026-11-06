import { PlatformType, type ShopChannel } from "../../../../generated/prisma/client.js";
import { sellableWhere } from "./checkoutVia.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { findOpenSession } from "../../loyalty/messaging/channels/whatsapp/session.js";
import { parsePhoneforWa } from "../../loyalty/util.js";
import { sendMetaMessage } from "../../whatsapp/meta/metaMessage.service.js";

import { toNumber } from "./pricing.js";
import { storefrontProductUrl } from "./storefrontLinks.js";
import { ShopError } from "./shop.errors.js";
import { shopProductsActionSchema } from "./commentToBuy.schema.js";

/**
 * Product cards in a conversation. WhatsApp shows catalog items natively (one product, or a
 * multi-product list the customer can add to a cart from); Instagram and Messenger get a
 * carousel whose "Buy now" starts the chat checkout. Both need the customer's open window,
 * so this is for replying in a live conversation, not for broadcasts.
 */
export async function sendProductsInChat(input: {
  orgId: string;
  contactId: string;
  channel: ShopChannel;
  channelAccountId?: string | null;
  productIds: string[];
  text?: string;
  userId?: string;
  userName?: string;
  /** An automation's send, which message reports count apart from agents' replies. */
  automated?: boolean;
}) {
  const store = await prisma.shopStore.findUnique({ where: { orgId: input.orgId } });
  if (!store) throw new ShopError("NOT_FOUND", "Set up your shop first");
  const contact = await prisma.contact.findFirst({
    where: { id: input.contactId, orgId: input.orgId },
    select: { phone: true, igsId: true, psid: true, lastMessageSourceIdentifier: true },
  });
  if (!contact) throw new ShopError("NOT_FOUND", "Contact not found");
  const products = await prisma.shopProduct.findMany({
    where: {
      id: { in: input.productIds },
      storeId: store.id,
      status: "ACTIVE",
      ...sellableWhere(store),
    },
    include: { variants: { orderBy: { position: "asc" } } },
  });
  if (!products.length) throw new ShopError("INVALID", "Those products aren't for sale");
  // Keep the order the agent picked them in.
  products.sort((a, b) => input.productIds.indexOf(a.id) - input.productIds.indexOf(b.id));

  const body =
    input.text?.trim() || (products.length === 1 ? products[0].title : "A few picks for you");
  const common = {
    orgId: input.orgId,
    messageType: input.automated ? ("AUTOMATED" as const) : ("INBOX" as const),
    userId: input.userId,
    userName: input.userName,
  };

  if (input.channel === "WHATSAPP") {
    if (!contact.phone) throw new ShopError("INVALID", "This contact has no WhatsApp number");
    const to = parsePhoneforWa(contact.phone);
    const session = await findOpenSession({
      orgId: input.orgId,
      phone: to,
      phoneId: input.channelAccountId,
    });
    if (!session)
      throw new ShopError("CONFLICT", "The 24-hour reply window is closed. Send a template first.");
    const live = products.filter((p) => p.metaSyncStatus === "LIVE" && p.showOnWhatsapp);
    if (!store.metaCatalogId || !live.length) {
      throw new ShopError("CONFLICT", "These products aren't live in your WhatsApp catalog yet");
    }
    const retailerIds = live.flatMap((p) => p.variants.map((v) => v.retailerId)).slice(0, 30);
    const payload =
      retailerIds.length === 1
        ? {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "interactive",
            interactive: {
              type: "product",
              body: { text: body.slice(0, 1024) },
              action: { catalog_id: store.metaCatalogId, product_retailer_id: retailerIds[0] },
            },
          }
        : {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "interactive",
            interactive: {
              type: "product_list",
              header: { type: "text", text: store.name.slice(0, 60) },
              body: { text: body.slice(0, 1024) },
              action: {
                catalog_id: store.metaCatalogId,
                sections: [
                  {
                    title: "Picked for you".slice(0, 24),
                    product_items: retailerIds.map((id) => ({ product_retailer_id: id })),
                  },
                ],
              },
            },
          };
    const result = await sendMetaMessage({
      ...common,
      platform: PlatformType.WHATSAPP,
      to,
      sourceIdentifier: session.phoneId ?? input.channelAccountId ?? undefined,
      payload,
    });
    if (!result.ok)
      throw new ShopError("PAYMENT_FAILED", result.error ?? "WhatsApp refused the message");
    return { sent: live.length, skipped: products.length - live.length };
  }

  const recipient = input.channel === "INSTAGRAM" ? contact.igsId : contact.psid;
  if (!recipient) throw new ShopError("INVALID", "This contact can't be reached on that channel");
  const elements = products.slice(0, 10).map((p) => {
    const v = p.variants[0];
    const price = toNumber(v.price);
    const range =
      p.variants.length > 1
        ? `${store.currency} ${Math.min(...p.variants.map((x) => toNumber(x.price))).toFixed(2)}+`
        : `${store.currency} ${price.toFixed(2)}`;
    const soldOut = p.variants.every((x) => x.trackInventory && x.stock <= 0 && !x.allowBackorder);
    return {
      title: p.title.slice(0, 80),
      subtitle: soldOut ? `${range} · sold out` : range,
      ...(p.images[0] ? { image_url: p.images[0] } : {}),
      buttons: [
        soldOut
          ? {
              type: "web_url",
              url: storefrontProductUrl(store.slug, p),
              title: "Notify me",
            }
          : { type: "postback", title: "Buy now", payload: `shop_buy:${v.id}:1` },
        ...(store.storefrontEnabled
          ? [
              {
                type: "web_url",
                url: storefrontProductUrl(store.slug, p),
                title: "See details",
              },
            ]
          : []),
      ],
    };
  });
  const meta = {
    ...common,
    platform: input.channel === "INSTAGRAM" ? PlatformType.INSTAGRAM : PlatformType.FACEBOOK,
    to: recipient,
    sourceIdentifier: input.channelAccountId ?? contact.lastMessageSourceIdentifier ?? undefined,
  };
  // A carousel has no text of its own, so the agent's note goes first as its own message.
  const note = input.text?.trim();
  if (note) {
    const sent = await sendMetaMessage({
      ...meta,
      payload: { recipient: { id: recipient }, message: { text: note.slice(0, 1000) } },
    });
    if (!sent.ok) throw new ShopError("PAYMENT_FAILED", sent.error ?? "The message was refused");
  }
  const result = await sendMetaMessage({
    ...meta,
    payload: {
      recipient: { id: recipient },
      message: {
        attachment: { type: "template", payload: { template_type: "generic", elements } },
      },
    },
  });
  if (!result.ok) throw new ShopError("PAYMENT_FAILED", result.error ?? "The message was refused");
  return { sent: elements.length, skipped: products.length - elements.length };
}

/**
 * A rule's "send products" on WhatsApp: catalog cards into the chat the customer just wrote
 * in, such as after clicking an ad. False, and logged, when the products can't go out.
 */
export async function sendRuleProductsOnWhatsApp(input: {
  orgId: string;
  ruleId: string;
  value: unknown;
  phone: string;
  phoneId: string;
}): Promise<boolean> {
  const parsed = shopProductsActionSchema.safeParse(input.value);
  if (!parsed.success) {
    log.warn({ ruleId: input.ruleId }, "Send-products action has no valid products");
    return false;
  }
  const contact = await prisma.contact.findUnique({
    where: {
      contact_phone_org_id_unique: { phone: input.phone.replace(/\D/g, ""), orgId: input.orgId },
    },
    select: { id: true },
  });
  if (!contact) return false;
  try {
    await sendProductsInChat({
      orgId: input.orgId,
      contactId: contact.id,
      channel: "WHATSAPP",
      channelAccountId: input.phoneId,
      productIds: parsed.data.productIds,
      text: parsed.data.message,
      automated: true,
    });
    return true;
  } catch (err) {
    log.warn({ err, ruleId: input.ruleId }, "Could not send the rule's products on WhatsApp");
    return false;
  }
}
