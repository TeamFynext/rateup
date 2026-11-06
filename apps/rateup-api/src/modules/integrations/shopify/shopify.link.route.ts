import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import prisma from "../../../utils/prisma.js";
import { rateLimit } from "../../../utils/rateLimit.js";

const linkParamsSchema = z.object({ code: z.string().regex(/^[0-9A-Za-z]{10}$/) });
type LinkParams = z.infer<typeof linkParamsSchema>;

const EXPIRED_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Link expired</title></head><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;color:#334155"><p>This link has expired. Visit the store to continue shopping.</p></body></html>`;

/** `Abandoned checkout follow-up` → `abandoned-checkout-follow-up`. */
export function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * The recovery URL with RateUp's UTM tags, so Shopify's own marketing reports credit
 * WhatsApp. Tags already on the URL are left as they are.
 */
export function withUtm(url: string, campaign: string, content: string) {
  const target = new URL(url);
  const tags: Record<string, string> = {
    utm_source: "rateup",
    utm_medium: "whatsapp",
    utm_campaign: campaign,
    utm_content: content,
  };
  for (const [key, value] of Object.entries(tags)) {
    if (!target.searchParams.has(key)) target.searchParams.set(key, value);
  }
  return target.toString();
}

/**
 * `GET /api/public/r/:code` — a cart reminder's recovery link. Counts the tap, tags the
 * checkout URL and sends the buyer on to it. The code is unguessable and only ever leads
 * to that buyer's own checkout, which is why no session or signature is asked for.
 */
async function recoveryLinkHandler(
  request: FastifyRequest<{ Params: LinkParams }>,
  reply: FastifyReply,
) {
  const reminder = await prisma.shopifyCheckoutReminder.findUnique({
    where: { linkCode: request.params.code },
    select: {
      id: true,
      linkCode: true,
      rule: { select: { name: true } },
      checkout: { select: { body: true } },
    },
  });
  const body = reminder?.checkout.body as { abandoned_checkout_url?: string } | undefined;
  const checkoutUrl = body?.abandoned_checkout_url;
  if (!reminder || !checkoutUrl) {
    return reply.code(410).type("text/html").send(EXPIRED_HTML);
  }

  const now = new Date();
  await prisma.shopifyCheckoutReminder.updateMany({
    where: { id: reminder.id, clickedAt: null },
    data: { clickedAt: now },
  });
  await prisma.shopifyCheckoutReminder.update({
    where: { id: reminder.id },
    data: { clickCount: { increment: 1 } },
  });

  let target: string;
  try {
    target = withUtm(checkoutUrl, slugify(reminder.rule.name), reminder.linkCode);
  } catch {
    // A stored URL Shopify sent malformed still gets the buyer to their cart.
    target = checkoutUrl;
  }
  return reply.redirect(target, 302);
}

export async function shopifyLinkPublicRoutes(server: FastifyInstance) {
  server.get(
    "/:code",
    {
      // Fail-open: a Redis blip must not turn a customer's tap into an error page.
      preHandler: [rateLimit({ max: 60, windowSeconds: 60, key: "shopifyRecoveryLink" })],
      schema: { params: linkParamsSchema },
    },
    recoveryLinkHandler,
  );
}
