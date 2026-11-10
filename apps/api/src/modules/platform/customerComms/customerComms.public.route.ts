import type { FastifyInstance } from "fastify";
import { z } from "zod";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { rateLimit } from "../../../utils/rateLimit.js";
import {
  confirmSubscription,
  suppressionsFrom,
  verifySnsMessage,
  type SesEvent,
  type SnsMessage,
} from "./sns.js";
import { verifyUnsubscribeToken } from "./unsubscribe.js";

const tokenParams = z.object({ token: z.string().min(10).max(300) });

function page(title: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#f5f6f8;color:#14213d}main{max-width:440px;margin:15vh auto;padding:32px 24px;background:#fff;border-radius:12px;border:1px solid #e3e6ec}h1{font-size:22px;margin:0 0 12px}p{line-height:1.5;color:#4a5568}button{background:#1c518e;color:#fff;border:0;border-radius:8px;padding:12px 20px;font-size:15px;cursor:pointer}</style>
</head><body><main><h1>${title}</h1>${body}</main></body></html>`;
}

/**
 * `/api/public/customer-comms`. The unsubscribe GET only shows a button: mail scanners
 * follow links, and an opt-out on GET would unsubscribe people who never clicked.
 */
export async function customerCommsPublicRoutes(server: FastifyInstance) {
  const limit = rateLimit({ max: 30, windowSeconds: 60, key: "customerCommsUnsubscribe" });

  server.get<{ Params: z.infer<typeof tokenParams> }>(
    "/unsubscribe/:token",
    { preHandler: [limit], schema: { params: tokenParams } },
    async (request, reply) => {
      reply.type("text/html");
      if (!verifyUnsubscribeToken(request.params.token)) {
        return reply
          .code(400)
          .send(page("Link not valid", "<p>This unsubscribe link is broken or incomplete.</p>"));
      }
      return page(
        "Unsubscribe from RateUp emails?",
        `<p>You'll stop getting tips and product news from RateUp. Billing and security emails about your account still arrive.</p>
<form method="post"><button type="submit">Unsubscribe</button></form>`,
      );
    },
  );

  // Both the button above and RFC 8058 one-click (`List-Unsubscribe=One-Click`) land here.
  server.post<{ Params: z.infer<typeof tokenParams> }>(
    "/unsubscribe/:token",
    { preHandler: [limit], schema: { params: tokenParams } },
    async (request, reply) => {
      const parsed = verifyUnsubscribeToken(request.params.token);
      reply.type("text/html");
      if (!parsed)
        return reply
          .code(400)
          .send(page("Link not valid", "<p>This unsubscribe link is broken.</p>"));
      await prisma.user.updateMany({
        where: { id: parsed.userId },
        data:
          parsed.channel === "email"
            ? { marketingEmailOptOutAt: new Date() }
            : { marketingWhatsappOptOutAt: new Date() },
      });
      return page(
        "You're unsubscribed",
        "<p>You won't get RateUp tips or product news any more. You can turn them back on under Settings → Notifications.</p>",
      );
    },
  );

  /** SES bounce and complaint events, via an SNS topic subscribed to this URL. */
  server.post("/ses-events", async (request, reply) => {
    const raw = request.body;
    let message: SnsMessage;
    try {
      message = (typeof raw === "string" ? JSON.parse(raw) : raw) as SnsMessage;
    } catch {
      return reply.code(400).send();
    }
    if (!(await verifySnsMessage(message).catch(() => false))) {
      log.warn({ topic: message?.TopicArn }, "customer comms: SNS message failed verification");
      return reply.code(403).send();
    }
    if (message.Type === "SubscriptionConfirmation") {
      await confirmSubscription(message);
      return reply.code(204).send();
    }
    if (message.Type !== "Notification") return reply.code(204).send();

    const event = JSON.parse(message.Message) as SesEvent;
    for (const s of suppressionsFrom(event)) {
      await prisma.emailSuppression.upsert({
        where: { email: s.email },
        create: s,
        update: { reason: s.reason, detail: s.detail },
      });
    }
    return reply.code(204).send();
  });
}
