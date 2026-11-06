import type { FastifyRequest } from "fastify";
import prisma from "../../../utils/prisma.js";
import { sendAWSEmail } from "../../../utils/email/sendAWSEmail.js";
import {
  armBroadcast,
  disarmBroadcast,
} from "../../../workers/bullmq/queues/customerComms.queue.js";
import {
  type BroadcastAudience,
  recipientsForOrgs,
  resolveAudienceOrgIds,
} from "../../customerComms/audience.js";
import {
  buildBroadcastEmail,
  buildDripEmail,
  type PersonVars,
} from "../../customerComms/content.js";
import {
  DRIP_STEPS,
  dripStepByKey,
  type DripEmail,
  type DripStep,
} from "../../customerComms/drip.catalogue.js";
import {
  dripEmailFor,
  dripWhatsappFor,
  effectiveEmail,
  effectiveWhatsapp,
} from "../../customerComms/dripContent.js";
import { getActivationSignals, type ActivationSignals } from "../../customerComms/signals.js";
import {
  sendCustomerWhatsapp,
  senderOrgId,
  toWhatsappNumber,
} from "../../customerComms/whatsapp.js";
import { StaffHttpError } from "../staff.errors.js";
import { recordStaffAction } from "../staffAudit.js";
import { Prisma } from "../../../generated/prisma/client.js";
import type { BroadcastInput, ScheduleInput, TestSendInput } from "./engage.schema.js";

const DAY_MS = 86_400_000;
/** The drip fills {{1}} with the first name and {{2}} with the business name. */
const DRIP_TEMPLATE_VARIABLES = 2;
/** Conversion is read over this window so the numbers describe the sequence as it is now. */
const STATS_WINDOW_DAYS = 90;

const ALL_DONE: ActivationSignals = {
  createdAt: new Date(0),
  whatsappConnected: true,
  campaignSent: true,
  loyaltyActive: true,
  automationsSet: true,
  teammateInvited: true,
  activeLast7Days: true,
};

type Counts = Record<"QUEUED" | "SENT" | "FAILED" | "SKIPPED", number>;
const emptyCounts = (): Counts => ({ QUEUED: 0, SENT: 0, FAILED: 0, SKIPPED: 0 });

function staffPerson(request: FastifyRequest): PersonVars {
  const staff = request.staff!;
  return {
    userId: staff.id,
    email: staff.email,
    name: staff.name?.split(/\s+/)[0] || "there",
    org: "Your business",
  };
}

const stepNotFound = () => new StaffHttpError(404, "STEP_NOT_FOUND", "No such onboarding step.");
const broadcastNotFound = () =>
  new StaffHttpError(404, "BROADCAST_NOT_FOUND", "Broadcast not found.");

// ── Onboarding drip ──────────────────────────────────────────────────────────────

export async function listDripSteps() {
  const since = new Date(Date.now() - STATS_WINDOW_DAYS * DAY_MS);
  const [settings, grouped, sentRows] = await Promise.all([
    prisma.dripStepSetting.findMany(),
    prisma.customerMessage.groupBy({
      by: ["key", "channel", "status"],
      where: { source: "DRIP", createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.customerMessage.findMany({
      where: { source: "DRIP", status: "SENT", createdAt: { gte: since } },
      select: { key: true, orgId: true },
      distinct: ["key", "orgId"],
    }),
  ]);
  const signals = await getActivationSignals([...new Set(sentRows.map((r) => r.orgId))]);
  const settingByKey = new Map(settings.map((row) => [row.key, row]));

  return {
    whatsappSender: Boolean(senderOrgId()),
    windowDays: STATS_WINDOW_DAYS,
    data: DRIP_STEPS.map((step) => {
      const email = emptyCounts();
      const whatsapp = emptyCounts();
      for (const g of grouped.filter((g) => g.key === step.key)) {
        (g.channel === "EMAIL" ? email : whatsapp)[g.status] = g._count._all;
      }
      const reached = sentRows.filter((r) => r.key === step.key);
      const converted = reached.filter((r) => {
        const s = signals.get(r.orgId);
        return s ? step.goalMet(s) : false;
      }).length;
      const setting = settingByKey.get(step.key);
      const whatsappTemplate = effectiveWhatsapp(step, setting?.whatsapp);
      return {
        key: step.key,
        day: step.day,
        label: step.label,
        subject: effectiveEmail(step, setting?.email).subject,
        customized: setting?.email != null || setting?.whatsapp != null,
        hasWhatsapp: whatsappTemplate !== null,
        whatsappTemplate,
        // Welcome and check-in have no goal to convert to.
        measurable: step.goalMet(ALL_DONE),
        enabled: setting?.enabled ?? true,
        email,
        whatsapp,
        orgsReached: reached.length,
        orgsConverted: converted,
      };
    }),
  };
}

export async function setDripStepEnabled(request: FastifyRequest, key: string, enabled: boolean) {
  if (!dripStepByKey(key)) throw stepNotFound();
  return prisma.$transaction(async (tx) => {
    const before = await tx.dripStepSetting.findUnique({ where: { key } });
    await tx.dripStepSetting.upsert({
      where: { key },
      create: { key, enabled },
      update: { enabled },
    });
    await recordStaffAction(tx, request, {
      action: enabled ? "engage.drip_enable" : "engage.drip_disable",
      // Not `key`: the audit log redacts values under secret-looking names.
      before: { step: key, enabled: before?.enabled ?? true },
      after: { step: key, enabled },
    });
    return { key, enabled };
  });
}

function requireStep(key: string): DripStep {
  const step = dripStepByKey(key);
  if (!step) throw stepNotFound();
  return step;
}

export async function getDripStep(key: string) {
  const step = requireStep(key);
  const setting = await prisma.dripStepSetting.findUnique({ where: { key } });
  const customized = setting?.email != null || setting?.whatsapp != null;
  return {
    key: step.key,
    day: step.day,
    label: step.label,
    enabled: setting?.enabled ?? true,
    email: effectiveEmail(step, setting?.email),
    defaultEmail: step.email,
    whatsappTemplate: effectiveWhatsapp(step, setting?.whatsapp),
    defaultWhatsappTemplate: step.whatsapp?.template ?? null,
    customized,
    editedAt: customized ? (setting?.editedAt ?? null) : null,
    editedBy: customized ? (setting?.editedBy ?? null) : null,
  };
}

/**
 * Saves the step's email and WhatsApp choice together. Each part identical to the
 * catalogue's is stored as null, so later code edits still reach it.
 */
export async function saveDripContent(
  request: FastifyRequest,
  key: string,
  input: { email: DripEmail; whatsappTemplate: string | null },
) {
  const step = requireStep(key);
  const current = await dripWhatsappFor(step);
  if (input.whatsappTemplate && input.whatsappTemplate !== current) {
    await assertDripTemplate(input.whatsappTemplate);
  }
  const defaultTemplate = step.whatsapp?.template ?? null;
  await writeDripContent(request, step, {
    email: sameEmail(input.email, step.email) ? null : input.email,
    whatsapp:
      input.whatsappTemplate === defaultTemplate ? null : { template: input.whatsappTemplate },
  });
  return getDripStep(key);
}

export async function resetDripContent(request: FastifyRequest, key: string) {
  const step = requireStep(key);
  await writeDripContent(request, step, { email: null, whatsapp: null });
  return getDripStep(key);
}

/** Only an approved template whose variables the drip can fill: {{1}} name, {{2}} business. */
async function assertDripTemplate(name: string) {
  const { configured, data } = await senderTemplates();
  if (!configured) throw new StaffHttpError(400, "NO_SENDER", "ROOT_ORG is not set on the API.");
  const template = data.find((t) => t.name === name);
  if (!template) {
    throw new StaffHttpError(
      400,
      "TEMPLATE_NOT_FOUND",
      `No template "${name}" on RateUp's number.`,
    );
  }
  if (template.status?.toUpperCase() !== "APPROVED") {
    throw new StaffHttpError(400, "TEMPLATE_NOT_APPROVED", `"${name}" is not approved by Meta.`);
  }
  if (template.variables > DRIP_TEMPLATE_VARIABLES) {
    throw new StaffHttpError(
      400,
      "TOO_MANY_VARIABLES",
      `"${name}" has ${template.variables} variables; onboarding can fill only {{1}} and {{2}}.`,
    );
  }
}

async function writeDripContent(
  request: FastifyRequest,
  step: DripStep,
  next: { email: DripEmail | null; whatsapp: { template: string | null } | null },
) {
  const json = (value: object | null) =>
    (value ?? Prisma.DbNull) as Prisma.InputJsonValue | typeof Prisma.DbNull;
  const edited = next.email !== null || next.whatsapp !== null;
  const data = {
    email: json(next.email),
    whatsapp: json(next.whatsapp),
    editedAt: edited ? new Date() : null,
    editedBy: edited ? request.staff!.email : null,
  };
  await prisma.$transaction(async (tx) => {
    const before = await tx.dripStepSetting.findUnique({ where: { key: step.key } });
    await tx.dripStepSetting.upsert({
      where: { key: step.key },
      create: { key: step.key, ...data },
      update: data,
    });
    await recordStaffAction(tx, request, {
      action: edited ? "engage.drip_edit" : "engage.drip_reset",
      before: {
        step: step.key,
        email: effectiveEmail(step, before?.email),
        whatsappTemplate: effectiveWhatsapp(step, before?.whatsapp),
      },
      after: {
        step: step.key,
        email: next.email ?? step.email,
        whatsappTemplate: effectiveWhatsapp(step, next.whatsapp),
      },
    });
  });
}

function sameEmail(a: DripEmail, b: DripEmail): boolean {
  const normal = (e: DripEmail) =>
    JSON.stringify({
      subject: e.subject,
      preview: e.preview,
      title: e.title,
      body: e.body,
      cta: e.cta ?? null,
      highlights: e.highlights?.length
        ? e.highlights.map((h) => ({ ...h, path: h.path ?? null }))
        : null,
      plain: Boolean(e.plain),
    });
  return normal(a) === normal(b);
}

async function renderPreview(email: DripEmail, request: FastifyRequest) {
  const built = await buildDripEmail(email, staffPerson(request));
  return { subject: built.subject, html: built.html ?? null, text: built.text };
}

export async function previewDripStep(request: FastifyRequest, key: string) {
  return renderPreview(await dripEmailFor(requireStep(key)), request);
}

/** Unsaved wording from the editor, rendered exactly as it would be sent. */
export async function previewDripDraft(request: FastifyRequest, key: string, email: DripEmail) {
  requireStep(key);
  return renderPreview(email, request);
}

export async function testDripStep(request: FastifyRequest, key: string, input: TestSendInput) {
  const step = requireStep(key);
  const person = staffPerson(request);
  if (input.channel === "WHATSAPP") {
    const template = await dripWhatsappFor(step);
    if (!template) throw new StaffHttpError(400, "NO_WHATSAPP", "This step is email only.");
    await sendWhatsappTest(input.phone, template, [person.name, person.org]);
  } else {
    const email = await buildDripEmail(await dripEmailFor(step), person);
    if (!(await sendAWSEmail({ ...email, subject: `[Test] ${email.subject}` }))) {
      throw new StaffHttpError(502, "SEND_FAILED", "SES did not accept the test email.");
    }
  }
  await auditTest(request, `drip:${key}`, input.channel);
  return { sent: true };
}

async function sendWhatsappTest(phone: string | undefined, template: string, vars: string[]) {
  if (!senderOrgId()) {
    throw new StaffHttpError(400, "NO_SENDER", "ROOT_ORG is not set on the API.");
  }
  const to = toWhatsappNumber(phone);
  if (!to)
    throw new StaffHttpError(400, "BAD_PHONE", "Enter a full phone number with country code.");
  try {
    await sendCustomerWhatsapp(to, template, vars);
  } catch (err) {
    throw new StaffHttpError(502, "SEND_FAILED", (err as Error).message.slice(0, 300));
  }
}

async function auditTest(request: FastifyRequest, target: string, channel: string) {
  await recordStaffAction(prisma, request, {
    action: "engage.test_send",
    after: { target, channel },
  });
}

// ── Per-org history ──────────────────────────────────────────────────────────────

export async function orgCustomerMessages(orgId: string) {
  const rows = await prisma.customerMessage.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      createdAt: true,
      sentAt: true,
      channel: true,
      source: true,
      key: true,
      status: true,
      skipReason: true,
      error: true,
      user: { select: { id: true, name: true, email: true } },
      broadcast: { select: { id: true, name: true } },
    },
  });
  return {
    data: rows.map((r) => ({
      ...r,
      label: r.broadcast?.name ?? dripStepByKey(r.key)?.label ?? r.key,
    })),
  };
}

// ── Broadcasts ───────────────────────────────────────────────────────────────────

async function broadcastCounts(ids: string[]) {
  const grouped = await prisma.customerMessage.groupBy({
    by: ["broadcastId", "channel", "status"],
    where: { broadcastId: { in: ids } },
    _count: { _all: true },
  });
  const out = new Map<string, { email: Counts; whatsapp: Counts }>();
  for (const id of ids) out.set(id, { email: emptyCounts(), whatsapp: emptyCounts() });
  for (const g of grouped) {
    const entry = out.get(g.broadcastId!);
    if (entry) (g.channel === "EMAIL" ? entry.email : entry.whatsapp)[g.status] = g._count._all;
  }
  return out;
}

export async function listBroadcasts(page: number, pageSize: number) {
  const [rows, total] = await Promise.all([
    prisma.broadcast.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.broadcast.count(),
  ]);
  const counts = await broadcastCounts(rows.map((r) => r.id));
  return { page, pageSize, total, data: rows.map((r) => ({ ...r, counts: counts.get(r.id) })) };
}

export async function getBroadcast(id: string) {
  const row = await prisma.broadcast.findUnique({ where: { id } });
  if (!row) throw broadcastNotFound();
  const counts = await broadcastCounts([id]);
  return { ...row, counts: counts.get(id) };
}

function assertSendable(
  input: Pick<
    BroadcastInput,
    "channels" | "emailSubject" | "emailBody" | "waTemplateName" | "ctaLabel" | "ctaUrl"
  >,
) {
  if (input.channels.includes("EMAIL") && (!input.emailSubject || !input.emailBody)) {
    throw new StaffHttpError(400, "EMAIL_INCOMPLETE", "Email needs a subject and a body.");
  }
  if (input.channels.includes("WHATSAPP") && !input.waTemplateName) {
    throw new StaffHttpError(400, "WHATSAPP_INCOMPLETE", "Pick a WhatsApp template.");
  }
  if (Boolean(input.ctaLabel) !== Boolean(input.ctaUrl)) {
    throw new StaffHttpError(400, "CTA_INCOMPLETE", "A button needs both a label and a link.");
  }
}

const toData = (input: BroadcastInput) => ({
  name: input.name,
  channels: input.channels,
  audience: input.audience,
  emailSubject: input.emailSubject ?? null,
  emailBody: input.emailBody ?? null,
  ctaLabel: input.ctaLabel ?? null,
  ctaUrl: input.ctaUrl ?? null,
  waTemplateName: input.waTemplateName ?? null,
  waParams: input.waParams,
});

export async function createBroadcast(request: FastifyRequest, input: BroadcastInput) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.broadcast.create({
      data: {
        ...toData(input),
        createdByStaffId: request.staff!.id,
        createdByEmail: request.staff!.email,
      },
    });
    await recordStaffAction(tx, request, {
      action: "engage.broadcast_create",
      after: { id: row.id, name: row.name },
    });
    return row;
  });
}

export async function updateBroadcast(request: FastifyRequest, id: string, input: BroadcastInput) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.broadcast.findUnique({ where: { id } });
    if (!before) throw broadcastNotFound();
    if (before.status !== "DRAFT") {
      throw new StaffHttpError(
        409,
        "NOT_DRAFT",
        "Only a draft can be edited. Unschedule it first.",
      );
    }
    const row = await tx.broadcast.update({ where: { id }, data: toData(input) });
    await recordStaffAction(tx, request, {
      action: "engage.broadcast_update",
      before: { name: before.name, channels: before.channels, audience: before.audience },
      after: { name: row.name, channels: row.channels, audience: row.audience },
    });
    return row;
  });
}

export async function deleteBroadcast(request: FastifyRequest, id: string) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.broadcast.findUnique({ where: { id } });
    if (!row) throw broadcastNotFound();
    if (row.status !== "DRAFT")
      throw new StaffHttpError(409, "NOT_DRAFT", "Only a draft can be deleted.");
    await tx.broadcast.delete({ where: { id } });
    await recordStaffAction(tx, request, {
      action: "engage.broadcast_delete",
      before: { id, name: row.name },
    });
    return { deleted: true };
  });
}

/** Who a filter reaches right now, before anything is saved. */
export async function previewAudience(audience: BroadcastAudience) {
  const orgIds = await resolveAudienceOrgIds(audience);
  const recipients = await recipientsForOrgs(orgIds);
  const people = new Map<string, (typeof recipients)[number]>();
  for (const r of recipients) if (!people.has(r.userId)) people.set(r.userId, r);
  const list = [...people.values()];
  const sample = await prisma.org.findMany({
    where: { id: { in: orgIds.slice(0, 20) } },
    select: { id: true, name: true, createdAt: true },
  });
  return {
    orgs: orgIds.length,
    people: list.length,
    email: list.filter((p) => !p.emailOptedOut).length,
    whatsapp: list.filter((p) => p.whatsappOptedIn && toWhatsappNumber(p.phone)).length,
    sample,
  };
}

export async function previewBroadcast(request: FastifyRequest, id: string) {
  const row = await prisma.broadcast.findUnique({ where: { id } });
  if (!row) throw broadcastNotFound();
  if (!row.emailSubject || !row.emailBody) return { subject: null, html: null, text: null };
  const email = await buildBroadcastEmail(
    {
      subject: row.emailSubject,
      body: row.emailBody,
      cta: row.ctaLabel && row.ctaUrl ? { label: row.ctaLabel, url: row.ctaUrl } : undefined,
    },
    staffPerson(request),
  );
  return { subject: email.subject, html: email.html ?? null, text: email.text };
}

export async function testBroadcast(request: FastifyRequest, id: string, input: TestSendInput) {
  const row = await prisma.broadcast.findUnique({ where: { id } });
  if (!row) throw broadcastNotFound();
  const person = staffPerson(request);
  if (input.channel === "WHATSAPP") {
    if (!row.waTemplateName)
      throw new StaffHttpError(400, "NO_TEMPLATE", "Pick a WhatsApp template first.");
    const vars = row.waParams.map((p) =>
      p.replaceAll("{name}", person.name).replaceAll("{org}", person.org),
    );
    await sendWhatsappTest(
      input.phone,
      row.waTemplateName,
      vars.length ? vars : [person.name, person.org],
    );
  } else {
    if (!row.emailSubject || !row.emailBody) {
      throw new StaffHttpError(400, "EMAIL_INCOMPLETE", "Write the email first.");
    }
    const email = await buildBroadcastEmail(
      {
        subject: row.emailSubject,
        body: row.emailBody,
        cta: row.ctaLabel && row.ctaUrl ? { label: row.ctaLabel, url: row.ctaUrl } : undefined,
      },
      person,
    );
    if (!(await sendAWSEmail({ ...email, subject: `[Test] ${email.subject}` }))) {
      throw new StaffHttpError(502, "SEND_FAILED", "SES did not accept the test email.");
    }
  }
  await auditTest(request, `broadcast:${id}`, input.channel);
  return { sent: true };
}

export async function scheduleBroadcast(request: FastifyRequest, id: string, input: ScheduleInput) {
  const at = input.at ?? new Date();
  if (at.getTime() < Date.now() - 60_000) {
    throw new StaffHttpError(400, "IN_PAST", "Pick a time in the future.");
  }
  const row = await prisma.$transaction(async (tx) => {
    const before = await tx.broadcast.findUnique({ where: { id } });
    if (!before) throw broadcastNotFound();
    if (before.status !== "DRAFT")
      throw new StaffHttpError(409, "NOT_DRAFT", "This broadcast was already scheduled.");
    assertSendable(before);
    const updated = await tx.broadcast.update({
      where: { id },
      data: { status: "SCHEDULED", scheduledAt: at },
    });
    await recordStaffAction(tx, request, {
      action: "engage.broadcast_schedule",
      after: {
        id,
        name: updated.name,
        scheduledAt: at,
        channels: updated.channels,
        audience: updated.audience,
      },
    });
    return updated;
  });
  await armBroadcast(id, at);
  return row;
}

export async function unscheduleBroadcast(request: FastifyRequest, id: string) {
  const row = await prisma.$transaction(async (tx) => {
    const claimed = await tx.broadcast.updateMany({
      where: { id, status: "SCHEDULED" },
      data: { status: "DRAFT", scheduledAt: null },
    });
    if (!claimed.count) {
      throw new StaffHttpError(
        409,
        "NOT_SCHEDULED",
        "It is no longer scheduled (it may have started).",
      );
    }
    await recordStaffAction(tx, request, { action: "engage.broadcast_unschedule", after: { id } });
    return tx.broadcast.findUniqueOrThrow({ where: { id } });
  });
  await disarmBroadcast(id);
  return row;
}

/** Templates in the sender org, for the composer's picker. */
export async function senderTemplates() {
  const orgId = senderOrgId();
  if (!orgId) return { configured: false, data: [] };
  const rows = await prisma.waTemplate.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    select: { id: true, data: true },
  });
  return {
    configured: true,
    data: rows.map((r) => {
      const d = r.data as unknown as {
        name: string;
        language: string;
        category?: string;
        status?: string;
        components: { type: string; text?: string; buttons?: { type: string; text: string }[] }[];
      };
      const body = d.components.find((c) => c.type.toUpperCase() === "BODY")?.text ?? "";
      const buttons = d.components.find((c) => c.type.toUpperCase() === "BUTTONS")?.buttons ?? [];
      return {
        id: r.id,
        name: d.name,
        language: d.language,
        category: d.category ?? null,
        status: d.status ?? null,
        body,
        variables: new Set(body.match(/\{\{\d+\}\}/g) ?? []).size,
        // Mirrors the button sendCustomerWhatsapp wires to the opt-out payload.
        stopButton: buttons.some(
          (b) => b.type.toUpperCase() === "QUICK_REPLY" && /stop/i.test(b.text),
        ),
      };
    }),
  };
}
