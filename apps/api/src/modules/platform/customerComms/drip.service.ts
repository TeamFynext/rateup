import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { enqueueCustomerMessages } from "../../../workers/bullmq/queues/customerComms.queue.js";
import { inSendWindow, messageableOrgWhere, recipientsForOrgs, usersAtCap } from "./audience.js";
import { DRIP_STEPS, STEP_GRACE_DAYS, type DripStep } from "./drip.catalogue.js";
import { effectiveWhatsapp } from "./dripContent.js";
import { getActivationSignals, type ActivationSignals } from "./signals.js";
import { senderOrgId, toWhatsappNumber } from "./whatsapp.js";

const DAY_MS = 86_400_000;
const LAST_DAY = Math.max(...DRIP_STEPS.map((s) => s.day)) + STEP_GRACE_DAYS;

/** Steps staff switched off, and the WhatsApp template each step sends now (null = none). */
async function stepSettings() {
  const rows = await prisma.dripStepSetting.findMany({
    select: { key: true, enabled: true, whatsapp: true },
  });
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return {
    disabled: new Set(rows.filter((r) => !r.enabled).map((r) => r.key)),
    whatsappTemplate: new Map(
      DRIP_STEPS.map((step) => [step.key, effectiveWhatsapp(step, byKey.get(step.key)?.whatsapp)]),
    ),
  };
}

/**
 * The step a person should hear next, or null. Earliest due first, so a step the frequency
 * cap held back still goes before a later one; past its grace window a step is dropped.
 */
export function nextDueStep(
  signals: ActivationSignals,
  alreadySent: Set<string>,
  disabled: Set<string>,
  now: Date,
): DripStep | null {
  const age = Math.floor((now.getTime() - signals.createdAt.getTime()) / DAY_MS);
  for (const step of DRIP_STEPS) {
    if (disabled.has(step.key) || alreadySent.has(step.key)) continue;
    if (age < step.day || age > step.day + STEP_GRACE_DAYS) continue;
    if (step.goalMet(signals)) continue;
    return step;
  }
  return null;
}

/** Hourly. Queues at most one step per person per run, inside the send window. */
export async function runOnboardingDrip(now = new Date()): Promise<{ queued: number }> {
  if (!inSendWindow(now)) return { queued: 0 };

  const orgs = await prisma.org.findMany({
    where: {
      ...messageableOrgWhere,
      createdAt: { gte: new Date(now.getTime() - (LAST_DAY + 1) * DAY_MS) },
      // RateUp does not onboard itself.
      ...(senderOrgId() ? { id: { not: senderOrgId() } } : {}),
    },
    select: { id: true },
  });
  if (!orgs.length) return { queued: 0 };
  const orgIds = orgs.map((o) => o.id);

  const [signals, recipients, settings] = await Promise.all([
    getActivationSignals(orgIds, now),
    recipientsForOrgs(orgIds),
    stepSettings(),
  ]);
  const userIds = [...new Set(recipients.map((r) => r.userId))];
  const [history, capped] = await Promise.all([
    prisma.customerMessage.findMany({
      where: { userId: { in: userIds }, source: "DRIP" },
      select: { userId: true, key: true },
    }),
    usersAtCap(userIds, now),
  ]);
  const sentByUser = new Map<string, Set<string>>();
  for (const h of history) {
    const keys = sentByUser.get(h.userId) ?? new Set<string>();
    keys.add(h.key);
    sentByUser.set(h.userId, keys);
  }

  const whatsappReady = Boolean(senderOrgId());
  const touched = new Set<string>();
  const rows: {
    userId: string;
    orgId: string;
    channel: "EMAIL" | "WHATSAPP";
    source: "DRIP";
    key: string;
  }[] = [];
  for (const r of recipients) {
    if (touched.has(r.userId) || capped.has(r.userId)) continue;
    const orgSignals = signals.get(r.orgId);
    if (!orgSignals) continue;
    const step = nextDueStep(
      orgSignals,
      sentByUser.get(r.userId) ?? new Set(),
      settings.disabled,
      now,
    );
    if (!step) continue;

    const base = { userId: r.userId, orgId: r.orgId, source: "DRIP" as const, key: step.key };
    const viaEmail = !r.emailOptedOut;
    const viaWhatsapp =
      whatsappReady &&
      settings.whatsappTemplate.get(step.key) &&
      r.whatsappOptedIn &&
      Boolean(toWhatsappNumber(r.phone));
    if (viaEmail) rows.push({ ...base, channel: "EMAIL" });
    if (viaWhatsapp) rows.push({ ...base, channel: "WHATSAPP" });
    if (viaEmail || viaWhatsapp) touched.add(r.userId);
  }
  if (!rows.length) return { queued: 0 };

  // The unique (userId, channel, key) is the real guard: an overlapping run inserts nothing.
  const created = await prisma.customerMessage.createManyAndReturn({
    data: rows,
    skipDuplicates: true,
    select: { id: true },
  });
  await enqueueCustomerMessages(created.map((c) => c.id));
  log.info({ queued: created.length }, "customer comms: onboarding drip queued");
  return { queued: created.length };
}
