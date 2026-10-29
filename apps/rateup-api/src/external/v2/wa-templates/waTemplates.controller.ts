import type { FastifyRequest } from "fastify";
import type { MultipartFile, Multipart } from "@fastify/multipart";
import type { z } from "zod";
import axios from "axios";

import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import {
  isRetryableCode,
  waFailureLabel,
  WA_TRANSPORT_ERROR_CODE,
} from "../../../utils/waRetryableErrors.js";
import { WaTemplateComponentType, WaTemplateStatus } from "../../../types/enums.js";
import type { OutgoingTemplateComponent } from "../../../types/whatsapp.types.js";
import { sendTemplateToUserCore } from "../../../modules/whatsapp/messageTemplates/wa_templates.controller.js";
import { TemplateSendError } from "../../../modules/whatsapp/messageTemplates/templateSendError.js";
import { getWaSendingSettings } from "../../../modules/whatsapp/settings/wa_settings.service.js";
import {
  ActiveContactLimitError,
  OrgSuspendedError,
} from "../../../modules/whatsapp/whatsappSurvey/wasurvey.auth.js";
import { GraphApiError } from "../../../modules/whatsapp/wa_axios.js";
import { ExternalApiError } from "../../shared/errors.js";
import { cursorOrderBy, cursorWhere, decodeCursor, toPage } from "../pagination.js";
import { uploadHeaderMedia } from "./mediaUpload.js";
import { presentMessageStatus, presentTemplate } from "./presenters.js";
import {
  sendWithFileFieldsSchema,
  type HeaderMediaType,
  type MessageIdParams,
  type SendTemplateBody,
  type SendToContactsBody,
  type SendWithFileFields,
  type TemplateIdParams,
  type TemplateListQuery,
} from "./waTemplates.schema.js";

// ---- lookups, every one through the caller's org ---------------------------------------

const templateSelect = {
  id: true,
  createdAt: true,
  templateType: true,
  data: true,
  whatsappSettingsPhoneId: true,
} as const;

interface TemplateRow {
  id: string;
  createdAt: Date;
  templateType: string;
  data: unknown;
  whatsappSettingsPhoneId: string | null;
}

const templateField = (row: TemplateRow, key: "status" | "language") =>
  (row.data as Record<string, unknown> | null)?.[key];

function assertApproved(row: TemplateRow) {
  const status = templateField(row, "status");
  if (status !== WaTemplateStatus.APPROVED) {
    throw new ExternalApiError(
      422,
      "template_not_approved",
      "WhatsApp has not approved this template",
      { status: typeof status === "string" ? status : null },
    );
  }
}

/**
 * By name, as integrations know templates. A name is only unique per language (and per
 * WhatsApp number), so a name living in several languages needs `language` to say which.
 */
async function findTemplateByName(orgId: string, name: string, language?: string) {
  const rows: TemplateRow[] = await prisma.waTemplate.findMany({
    where: {
      orgId,
      AND: [
        { data: { path: ["name"], equals: name } },
        ...(language ? [{ data: { path: ["language"], equals: language } }] : []),
      ],
    },
    select: templateSelect,
    orderBy: cursorOrderBy,
    take: 20,
  });
  if (rows.length === 0) {
    throw new ExternalApiError(404, "template_not_found", "No template by that name", {
      templateName: name,
      ...(language ? { language } : {}),
    });
  }
  const languages = [...new Set(rows.map((r) => String(templateField(r, "language") ?? "")))];
  if (!language && languages.length > 1) {
    throw new ExternalApiError(
      400,
      "validation_failed",
      "That template exists in several languages; pass `language`",
      { languages },
    );
  }
  const approved = rows.find((r) => templateField(r, "status") === WaTemplateStatus.APPROVED);
  assertApproved(approved ?? rows[0]!);
  return approved!;
}

async function findTemplateById(orgId: string, templateId: string) {
  const row: TemplateRow | null = await prisma.waTemplate.findFirst({
    where: { id: templateId, orgId },
    select: templateSelect,
  });
  if (!row) throw new ExternalApiError(404, "template_not_found", "No such template");
  assertApproved(row);
  return row;
}

/** A team id from the caller is attributed to sends, so it has to be one of the org's. */
async function assertTeam(orgId: string, teamId: string | undefined) {
  if (!teamId) return;
  const team = await prisma.team.findFirst({ where: { id: teamId, orgId }, select: { id: true } });
  if (!team) throw new ExternalApiError(404, "team_not_found", "No such team");
}

/** The number the template belongs to, which is the number it is sent from. */
async function sendingChannel(orgId: string, template: TemplateRow) {
  const settings = await getWaSendingSettings(orgId, template.whatsappSettingsPhoneId ?? undefined);
  if (!settings?.phoneId || !settings.accessToken) {
    throw new ExternalApiError(
      422,
      "whatsapp_not_connected",
      "The WhatsApp number this template belongs to is not connected",
    );
  }
  return { phoneId: settings.phoneId, accessToken: settings.accessToken };
}

// ---- building and sending -----------------------------------------------------------

type HeaderParam =
  | { type: HeaderMediaType; link: string; filename?: string }
  | { type: HeaderMediaType; id: string; filename?: string };

function buildComponents(header: HeaderParam | undefined, bodyVariables: string[] | undefined) {
  const components: OutgoingTemplateComponent[] = [];
  if (header) {
    const { type, filename, ...source } = header;
    components.push({
      type: WaTemplateComponentType.HEADER,
      parameters: [
        { type, [type]: { ...source, ...(type === "document" && filename ? { filename } : {}) } },
      ],
    });
  }
  if (bodyVariables?.length) {
    components.push({
      type: WaTemplateComponentType.BODY,
      parameters: bodyVariables.map((text) => ({ type: "text", text })),
    });
  }
  return components;
}

/**
 * Meta's refusal, as something a partner can act on: Meta's code in `details`, our wording
 * for it as the message. A failure that never reached Meta (a timeout, a reset) is a 502 —
 * the send did not happen and retrying is reasonable — anything Meta answered is a 422.
 */
function sendFailed(detail: WaGraphApiErrorDetail | undefined, stage: "send" | "media") {
  const code = typeof detail?.code === "number" ? detail.code : null;
  if (code === null || code === WA_TRANSPORT_ERROR_CODE) {
    return new ExternalApiError(502, "send_failed", "Could not reach WhatsApp", {
      stage,
      metaCode: null,
      retryable: true,
    });
  }
  return new ExternalApiError(422, "send_failed", waFailureLabel(code), {
    stage,
    metaCode: code,
    metaSubcode: typeof detail?.error_subcode === "number" ? detail.error_subcode : null,
    retryable: isRetryableCode(code),
  });
}

interface DeliverInput {
  orgId: string;
  template: TemplateRow;
  phone: string;
  components: OutgoingTemplateComponent[];
  teamId?: string;
  tag?: string;
  buttonVariable?: string;
  quickReplyPayload?: string[];
  scheduleInMinutes?: number;
}

type DeliverResult =
  | { status: "accepted"; messageId: string }
  | { status: "scheduled"; scheduleId: string; scheduledAt: string };

/** One send through the same core every other template send uses, failures mapped. */
async function deliver(input: DeliverInput): Promise<DeliverResult> {
  let res: Awaited<ReturnType<typeof sendTemplateToUserCore>>;
  try {
    res = await sendTemplateToUserCore(
      input.orgId,
      input.template.id,
      input.phone,
      input.components,
      input.teamId,
      undefined,
      input.scheduleInMinutes,
      false,
      input.tag,
      input.buttonVariable,
      input.quickReplyPayload,
      true,
    );
  } catch (err) {
    if (err instanceof TemplateSendError) {
      throw new ExternalApiError(422, "template_not_sendable", err.message, {
        reason: err.reason,
      });
    }
    if (err instanceof ActiveContactLimitError) {
      throw new ExternalApiError(
        422,
        "contact_limit_reached",
        "This month's active-contact allowance is used up; this contact cannot be messaged",
      );
    }
    if (err instanceof OrgSuspendedError) {
      throw new ExternalApiError(403, "org_suspended", err.message);
    }
    throw err;
  }

  if ("scheduledAt" in res) {
    return { status: "scheduled", scheduleId: res.id, scheduledAt: res.scheduledAt.toISOString() };
  }
  if (!res.status) {
    // The template was looked up a moment ago, so a "not found" here is a race with a
    // delete; everything else that lands here is a refused or failed send.
    if (!res.error) throw new ExternalApiError(404, "template_not_found", "No such template");
    throw sendFailed(res.error, "send");
  }
  return { status: "accepted", messageId: String(res.message ?? "") };
}

// ---- handlers -----------------------------------------------------------------------

export async function listTemplatesHandler(
  request: FastifyRequest<{ Querystring: TemplateListQuery }>,
) {
  const { limit, cursor, templateType, status } = request.query;
  const rows = await prisma.waTemplate.findMany({
    where: {
      orgId: request.user.orgId,
      ...(templateType ? { templateType } : {}),
      ...(status ? { data: { path: ["status"], equals: status } } : {}),
      ...cursorWhere(decodeCursor(cursor)),
    },
    select: { id: true, createdAt: true, templateType: true, data: true },
    orderBy: cursorOrderBy,
    take: limit + 1,
  });
  return toPage(rows, limit, presentTemplate);
}

export async function sendTemplateHandler(request: FastifyRequest<{ Body: SendTemplateBody }>) {
  const { orgId } = request.user;
  const body = request.body;
  const template = await findTemplateByName(orgId, body.templateName, body.language);
  await assertTeam(orgId, body.teamId);
  await sendingChannel(orgId, template);

  return deliver({
    orgId,
    template,
    phone: body.phone,
    components: buildComponents(body.header, body.bodyVariables),
    teamId: body.teamId,
    tag: body.tag,
    buttonVariable: body.buttonVariable,
    quickReplyPayload: body.quickReplyPayload,
    scheduleInMinutes: body.scheduleInMinutes,
  });
}

function validationFailed(error: z.ZodError) {
  return new ExternalApiError(400, "validation_failed", "Request validation failed", {
    issues: error.issues.map((i) => ({ path: `/${i.path.join("/")}`, message: i.message })),
  });
}

/** Errors the multipart parser raises are all about the body the caller sent. */
function multipartFailed(err: unknown) {
  if (err instanceof ExternalApiError) return err;
  const code = (err as { code?: string }).code;
  if (code === "FST_REQ_FILE_TOO_LARGE") {
    return new ExternalApiError(400, "file_invalid", "The file is larger than any header allows");
  }
  if (code === "FST_FILES_LIMIT") {
    return new ExternalApiError(400, "file_invalid", "Send one file only");
  }
  if (code === "FST_INVALID_MULTIPART_CONTENT_TYPE") {
    return new ExternalApiError(400, "validation_failed", "This route takes multipart/form-data");
  }
  log.warn({ err }, "Unreadable multipart body on send-with-file");
  return new ExternalApiError(400, "validation_failed", "The multipart body could not be read");
}

function parseFields(raw: Record<string, string | string[]>): SendWithFileFields {
  const result = sendWithFileFieldsSchema.safeParse(raw);
  if (!result.success) throw validationFailed(result.error);
  return result.data;
}

/**
 * `POST /send-with-file`. The body is read as a stream, part by part, which is why **every
 * text field must come before the file**: the template, team and number are all checked
 * when the file part arrives, before a byte of it is read, and the file is then piped into
 * WhatsApp as it comes in. A field after the file is refused.
 */
export async function sendTemplateWithFileHandler(request: FastifyRequest) {
  const { orgId } = request.user;
  const raw: Record<string, string | string[]> = {};
  let fields: SendWithFileFields | undefined;
  let template: TemplateRow | undefined;
  let mediaId: string | undefined;
  let fileName: string | undefined;

  const parts = request.parts();
  for (;;) {
    let next: IteratorResult<Multipart>;
    try {
      next = await parts.next();
    } catch (err) {
      throw multipartFailed(err);
    }
    if (next.done) break;
    const part = next.value;

    if (part.type === "field") {
      if (mediaId !== undefined) {
        throw new ExternalApiError(
          400,
          "validation_failed",
          "Send every text field before the file",
          { field: part.fieldname },
        );
      }
      if (part.valueTruncated) {
        throw new ExternalApiError(400, "validation_failed", "A field is too long", {
          field: part.fieldname,
        });
      }
      const value = String(part.value);
      const existing = raw[part.fieldname];
      raw[part.fieldname] =
        existing === undefined
          ? value
          : [...(Array.isArray(existing) ? existing : [existing]), value];
      continue;
    }

    const file: MultipartFile = part;
    fields = parseFields(raw);
    if (!fields.headerType) {
      throw new ExternalApiError(400, "validation_failed", "`headerType` is required with a file", {
        issues: [{ path: "/headerType", message: "Required with a file" }],
      });
    }
    template = await findTemplateByName(orgId, fields.templateName, fields.language);
    await assertTeam(orgId, fields.teamId);
    const channel = await sendingChannel(orgId, template);
    try {
      mediaId = await uploadHeaderMedia({
        file,
        type: fields.headerType,
        phoneId: channel.phoneId,
        accessToken: channel.accessToken,
        knownLength: fields.fileSize,
      });
    } catch (err) {
      if (err instanceof GraphApiError) throw sendFailed({ ...err.error }, "media");
      // A transport failure (timeout, reset): nothing was uploaded.
      if (axios.isAxiosError(err)) throw sendFailed(undefined, "media");
      throw err;
    }
    fileName = fields.filename ?? file.filename;
  }

  if (!fields) {
    fields = parseFields(raw);
    if (fields.headerType) {
      throw new ExternalApiError(400, "file_invalid", "`headerType` was sent without a file");
    }
    template = await findTemplateByName(orgId, fields.templateName, fields.language);
    await assertTeam(orgId, fields.teamId);
    await sendingChannel(orgId, template);
  }

  const header =
    mediaId && fields.headerType
      ? { type: fields.headerType, id: mediaId, filename: fileName }
      : undefined;
  return deliver({
    orgId,
    template: template!,
    phone: fields.phone,
    components: buildComponents(header, fields.bodyVariables),
    teamId: fields.teamId,
    tag: fields.tag,
    buttonVariable: fields.buttonVariable,
    quickReplyPayload: fields.quickReplyPayload,
    scheduleInMinutes: fields.scheduleInMinutes,
  });
}

const CONTACT_SEND_CONCURRENCY = 5;

type ContactOutcome =
  | { ok: true; contactId: string; messageId: string }
  | { ok: false; contactId: string; code: string; metaCode: number | null };

/**
 * `POST /:templateId/send/contacts`. Up to 1000 of the org's contacts, a few at a time.
 *
 * The first contact goes alone: a failure that belongs to the template rather than the
 * recipient (a media header with no media, a flow not linked to the team) fails it before
 * anything is sent, and is answered as a plain error. After that, sends have been paid
 * for, so one contact's failure is reported in `failed` instead of failing the request.
 */
export async function sendToContactsHandler(
  request: FastifyRequest<{ Params: TemplateIdParams; Body: SendToContactsBody }>,
) {
  const { orgId } = request.user;
  const body = request.body;
  const template = await findTemplateById(orgId, request.params.templateId);
  await assertTeam(orgId, body.teamId);
  await sendingChannel(orgId, template);

  const requested = [...new Set(body.contactIds)];
  const contacts = await prisma.contact.findMany({
    where: { orgId, id: { in: requested } },
    select: { id: true, phone: true, bsuid: true },
  });
  const byId = new Map(contacts.map((c) => [c.id, c]));
  const skipped: { contactId: string; reason: "not_found" | "no_phone" }[] = [];
  const sendable: { id: string; phone: string }[] = [];
  for (const id of requested) {
    const contact = byId.get(id);
    if (!contact) skipped.push({ contactId: id, reason: "not_found" });
    // A customer with a WhatsApp username may have only a business-scoped user ID.
    else if (!contact.phone && !contact.bsuid) skipped.push({ contactId: id, reason: "no_phone" });
    else sendable.push({ id, phone: (contact.phone ?? contact.bsuid) as string });
  }

  const components = buildComponents(body.header, body.bodyVariables);
  const sendOne = async (contact: { id: string; phone: string }): Promise<ContactOutcome> => {
    const result = await deliver({
      orgId,
      template,
      phone: contact.phone,
      components: structuredClone(components),
      teamId: body.teamId,
      tag: body.tag,
      buttonVariable: body.buttonVariable,
      quickReplyPayload: body.quickReplyPayload,
    });
    // No `scheduleInMinutes` here, so the result is always an immediate send.
    return {
      ok: true,
      contactId: contact.id,
      messageId: result.status === "accepted" ? result.messageId : "",
    };
  };
  const toFailure = (contactId: string, err: unknown): ContactOutcome => {
    if (err instanceof ExternalApiError) {
      const metaCode = err.details?.metaCode;
      return {
        ok: false,
        contactId,
        code: err.code,
        metaCode: typeof metaCode === "number" ? metaCode : null,
      };
    }
    log.error({ err, contactId }, "Template send to a contact failed");
    return { ok: false, contactId, code: "internal_error", metaCode: null };
  };

  const outcomes: ContactOutcome[] = [];
  const [first, ...rest] = sendable;
  if (first) {
    try {
      outcomes.push(await sendOne(first));
    } catch (err) {
      // Nothing has been sent yet, so anything that is not about this one recipient is
      // the whole request's answer — including an unknown error, which stays a 500.
      const perRecipient =
        err instanceof ExternalApiError &&
        (err.code === "send_failed" || err.code === "contact_limit_reached");
      if (!perRecipient) throw err;
      outcomes.push(toFailure(first.id, err));
    }
  }
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONTACT_SEND_CONCURRENCY, rest.length) }, async () => {
      while (cursor < rest.length) {
        const contact = rest[cursor++]!;
        outcomes.push(await sendOne(contact).catch((err: unknown) => toFailure(contact.id, err)));
      }
    }),
  );

  return {
    sent: outcomes.flatMap((o) =>
      o.ok ? [{ contactId: o.contactId, messageId: o.messageId }] : [],
    ),
    failed: outcomes.flatMap((o) =>
      o.ok ? [] : [{ contactId: o.contactId, code: o.code, metaCode: o.metaCode }],
    ),
    skipped,
  };
}

/**
 * Org-scoped through the message's org mapping (or its contact). `WaMessage` has no
 * `orgId` column: the dashboard handler this replaced filtered on one anyway, which Prisma
 * rejects outright, and before that it looked the message up by id alone — any key could
 * read any org's delivery status given a wamid.
 */
export async function getMessageStatusHandler(
  request: FastifyRequest<{ Params: MessageIdParams }>,
) {
  const { orgId } = request.user;
  const row = await prisma.waMessage.findFirst({
    where: {
      messageId: request.params.messageId,
      OR: [{ waMessageOrgTeamMaps: { some: { orgId } } }, { contact: { orgId } }],
    },
    select: { messageId: true, stats: true, errorCode: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  if (!row) throw new ExternalApiError(404, "message_not_found", "No such message");
  return presentMessageStatus(row);
}
