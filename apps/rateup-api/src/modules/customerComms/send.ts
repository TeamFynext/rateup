import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { sendAWSEmail } from "../../utils/email/sendAWSEmail.js";
import { enqueueCustomerMessages } from "../../workers/bullmq/queues/customerComms.queue.js";
import {
  broadcastAudienceSchema,
  firstName,
  recipientsForOrgs,
  resolveAudienceOrgIds,
} from "./audience.js";
import { buildBroadcastEmail, buildDripEmail, type PersonVars } from "./content.js";
import { dripStepByKey } from "./drip.catalogue.js";
import { dripEmailFor, dripWhatsappFor } from "./dripContent.js";
import { sendCustomerWhatsapp, toWhatsappNumber } from "./whatsapp.js";

/** A failure that retrying cannot fix: the row is closed as FAILED on the first attempt. */
export class PermanentSendError extends Error {}

/** Delivers one QUEUED CustomerMessage. Throws to let BullMQ retry a transient failure. */
export async function deliverCustomerMessage(messageId: string): Promise<void> {
  const message = await prisma.customerMessage.findUnique({
    where: { id: messageId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          deletedAt: true,
          marketingEmailOptOutAt: true,
          marketingWhatsappOptOutAt: true,
        },
      },
      org: { select: { name: true, ownerId: true, phone: true } },
      broadcast: true,
    },
  });
  if (!message || message.status !== "QUEUED") return;

  const skip = (skipReason: string) =>
    prisma.customerMessage.update({
      where: { id: messageId },
      data: { status: "SKIPPED", skipReason },
    });

  const { user, org } = message;
  if (user.deletedAt) return void (await skip("user_deleted"));
  const person: PersonVars = {
    userId: user.id,
    email: user.email,
    name: firstName(user.name, user.email),
    org: org.name,
  };

  if (message.channel === "EMAIL") {
    // Re-checked here: an unsubscribe or bounce may have landed after the row was queued.
    if (user.marketingEmailOptOutAt) return void (await skip("opted_out"));
    const suppressed = await prisma.emailSuppression.findUnique({
      where: { email: user.email.toLowerCase() },
    });
    if (suppressed) return void (await skip(`suppressed_${suppressed.reason.toLowerCase()}`));

    let params;
    if (message.broadcast) {
      const b = message.broadcast;
      if (!b.emailSubject || !b.emailBody)
        throw new PermanentSendError("Broadcast has no email copy");
      params = await buildBroadcastEmail(
        {
          subject: b.emailSubject,
          body: b.emailBody,
          cta: b.ctaLabel && b.ctaUrl ? { label: b.ctaLabel, url: b.ctaUrl } : undefined,
        },
        person,
      );
    } else {
      const step = dripStepByKey(message.key);
      if (!step) throw new PermanentSendError(`Unknown drip step ${message.key}`);
      params = await buildDripEmail(await dripEmailFor(step), person);
    }
    if (!(await sendAWSEmail(params))) throw new Error("SES send failed");
  } else {
    if (user.marketingWhatsappOptOutAt) return void (await skip("opted_out"));
    const to = toWhatsappNumber(user.phone || (org.ownerId === user.id ? org.phone : null));
    if (!to) return void (await skip("no_phone"));
    const step = message.broadcast ? undefined : dripStepByKey(message.key);
    const template = message.broadcast
      ? message.broadcast.waTemplateName
      : step && (await dripWhatsappFor(step));
    // Staff turned WhatsApp off for this step after the message was queued.
    if (step && !template) return void (await skip("whatsapp_off"));
    if (!template) throw new PermanentSendError("No WhatsApp template for this message");
    const extra = message.broadcast?.waParams.map((p) =>
      p.replaceAll("{name}", person.name).replaceAll("{org}", person.org),
    );
    await sendCustomerWhatsapp(to, template, extra?.length ? extra : [person.name, person.org]);
  }

  await prisma.customerMessage.update({
    where: { id: messageId },
    data: { status: "SENT", sentAt: new Date(), error: null },
  });
}

export async function markCustomerMessageFailed(messageId: string, error: unknown) {
  await prisma.customerMessage.updateMany({
    where: { id: messageId, status: "QUEUED" },
    data: { status: "FAILED", error: String((error as Error)?.message ?? error).slice(0, 500) },
  });
}

/**
 * Fires a SCHEDULED broadcast: claims it, resolves the audience as it is now, writes one row
 * per person and channel, and queues them. A person in several orgs hears once.
 */
export async function fireBroadcast(broadcastId: string): Promise<void> {
  const claimed = await prisma.broadcast.updateMany({
    where: { id: broadcastId, status: "SCHEDULED" },
    data: { status: "SENDING", startedAt: new Date() },
  });
  if (!claimed.count) return;
  const broadcast = await prisma.broadcast.findUniqueOrThrow({ where: { id: broadcastId } });

  const audience = broadcastAudienceSchema.parse(broadcast.audience);
  const recipients = await recipientsForOrgs(await resolveAudienceOrgIds(audience));
  const seen = new Set<string>();
  const key = `broadcast:${broadcast.id}`;
  const rows: {
    userId: string;
    orgId: string;
    channel: "EMAIL" | "WHATSAPP";
    source: "BROADCAST";
    key: string;
    broadcastId: string;
  }[] = [];
  for (const r of recipients) {
    if (seen.has(r.userId)) continue;
    seen.add(r.userId);
    const base = {
      userId: r.userId,
      orgId: r.orgId,
      source: "BROADCAST" as const,
      key,
      broadcastId: broadcast.id,
    };
    if (broadcast.channels.includes("EMAIL") && !r.emailOptedOut)
      rows.push({ ...base, channel: "EMAIL" });
    if (
      broadcast.channels.includes("WHATSAPP") &&
      broadcast.waTemplateName &&
      r.whatsappOptedIn &&
      toWhatsappNumber(r.phone)
    ) {
      rows.push({ ...base, channel: "WHATSAPP" });
    }
  }

  const created = await prisma.customerMessage.createManyAndReturn({
    data: rows,
    skipDuplicates: true,
    select: { id: true },
  });
  await enqueueCustomerMessages(created.map((c) => c.id));
  await prisma.broadcast.update({
    where: { id: broadcast.id },
    data: { status: "SENT", finishedAt: new Date() },
  });
  log.info({ broadcastId, queued: created.length }, "customer comms: broadcast fanned out");
}
