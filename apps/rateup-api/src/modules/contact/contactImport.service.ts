import type { MultipartFile } from "@fastify/multipart";
import { type Job, UnrecoverableError } from "bullmq";
import { isValidPhoneNumber } from "libphonenumber-js";

import type { Contact } from "../../../generated/prisma/client.js";
import { log } from "../../utils/logger.js";
import prisma from "../../utils/prisma.js";
import connection from "../../utils/redisConnection.js";
import { readSpreadsheetObjects, readSpreadsheetRows } from "../../utils/spreadsheet.js";
import {
  type ContactImportJobData,
  type ContactImportProgress,
  type ContactImportRow,
  type RejectedImportRow,
  contactImportQueue,
  contactImportRowsKey,
  EMPTY_IMPORT_PROGRESS,
  enqueueContactImport,
  integrationTriggerQueue,
  zapierTriggerQueue,
} from "../../workers/bullmq/queues/index.js";
import { ZapierTriggers } from "../integrations/external/zapier/zapier.service.js";
import { pushCrmLeadStatus, ZohoTriggers } from "../integrations/external/zoho/zoho.service.js";
import { triggerConversionsApiForContact } from "../integrations/meta/conversions.service.js";
import {
  buildZohoContactPayload,
  buildZohoLeadPayload,
} from "../integrations/external/zoho/zoho.utils.js";
import { getCustomFields } from "./contact.service.js";

/** Rows one upload may carry. The rows sit in Redis until the worker is done with them. */
export const CONTACT_IMPORT_ROW_LIMIT = 100_000;
/** Rejected rows kept for the summary table; the count beside them is always exact. */
const REJECTED_ROWS_KEPT = 1000;
/** Rows written per transaction, and how often progress is saved. */
const IMPORT_BATCH_SIZE = 1000;

export const CSV_IMPORT_SOURCE = "CSV IMPORT";

export interface ContactImportOptions {
  orgId: string;
  tags: string[];
  updateExisting?: boolean;
  contactGroupId?: string;
  hasHeaderRow?: boolean;
}

export type StartContactImportResult =
  | { status: "error"; data: RejectedImportRow[]; message: string }
  | {
      status: "queued";
      jobId: string;
      total: number;
      rejectedCount: number;
      duplicateCount: number;
    };

export function normalizePhone(phone: string): string {
  if (!phone) return "";

  // Already a string like "9198771234"
  if (/^\d+$/.test(phone)) {
    return phone;
  }

  // If it's in scientific notation (like "9.19877E+11")
  if (/e/i.test(phone)) {
    const num = Number(phone);
    if (!isNaN(num)) {
      return num.toFixed(0); // no decimals
    }
  }

  return phone.toString().trim();
}

// Column order assumed when the uploaded file has no header row.
function noHeaderColumnOrder(tags: string[]) {
  return ["name", "phone", ...tags];
}

function rowsToObjects(rows: unknown[][], headers: string[]) {
  return rows.map((row) =>
    Object.fromEntries(
      headers.map((header, i) => [header, row[i] != null ? row[i].toString().trim() : ""]),
    ),
  );
}

async function readImportFile(
  buffer: Buffer,
  mimetype: string,
  tags: string[],
  hasHeaderRow: boolean,
): Promise<Record<string, unknown>[]> {
  if (!hasHeaderRow) {
    return rowsToObjects(await readSpreadsheetRows(buffer, mimetype), noHeaderColumnOrder(tags));
  }
  const { data } = await readSpreadsheetObjects(buffer, mimetype, {
    transformHeader: (header) => header?.toString()?.trim()?.toLowerCase(),
    transformValue: (value) => (value != null ? value.toString().trim() : ""),
  });
  return data;
}

/**
 * Parse and validate an uploaded spreadsheet, then queue the valid rows for the worker.
 *
 * Validation stays on the request so a file with nothing usable in it is answered at once,
 * with the rows that were wrong. Writing the contacts is what takes minutes on a big file,
 * and that is the part the worker does.
 */
export async function startContactImport(
  file: MultipartFile,
  {
    orgId,
    tags,
    updateExisting = false,
    contactGroupId,
    hasHeaderRow = true,
  }: ContactImportOptions,
): Promise<StartContactImportResult> {
  const data = await readImportFile(await file.toBuffer(), file.mimetype, tags, hasHeaderRow);

  if (data.length === 0) {
    log.info("No data rows available");
    return { data: [], status: "error", message: "The file contained no contacts." };
  }
  if (data.length > CONTACT_IMPORT_ROW_LIMIT) {
    return {
      data: [],
      status: "error",
      message: `The file has ${data.length.toLocaleString("en")} rows. Import up to ${CONTACT_IMPORT_ROW_LIMIT.toLocaleString("en")} at a time — split it into smaller files.`,
    };
  }

  if (contactGroupId) {
    const group = await prisma.contactGroup.findFirst({
      where: { id: contactGroupId, team: { orgId } },
      select: { id: true },
    });
    if (!group) return { data: [], status: "error", message: "Contact group not found." };
  }

  // Only the fields the caller ticked, and only those the org actually has.
  const fields = (await getCustomFields(orgId)).filter((field) => tags.includes(field.slug));

  const rejected: RejectedImportRow[] = [];
  let rejectedCount = 0;
  // Keyed by phone: a number listed twice is imported once, with its last row's values.
  const valid = new Map<string, ContactImportRow>();
  let duplicateCount = 0;

  for (const row of data) {
    const phoneValue = row.phone;
    const nameValue = row.name;
    const rawPhone = normalizePhone(
      typeof phoneValue === "string" ? phoneValue : String(phoneValue ?? ""),
    );
    const formattedPhone = rawPhone.startsWith("+")
      ? rawPhone.replace(/\s+/g, "")
      : `+${rawPhone.replace(/\s+/g, "")}`;

    if (
      !phoneValue ||
      typeof nameValue !== "string" ||
      !nameValue ||
      !isValidPhoneNumber(formattedPhone)
    ) {
      rejectedCount++;
      if (rejected.length < REJECTED_ROWS_KEPT) {
        rejected.push({
          name: typeof nameValue === "string" && nameValue ? nameValue : "name is missing/invalid",
          phone: phoneValue ? `${String(phoneValue)}: Invalid phone number` : "phone is missing",
        });
      }
      continue;
    }

    const phone = formattedPhone.slice(1); // Remove the '+' for storage
    if (valid.has(phone)) duplicateCount++;
    valid.set(phone, [
      nameValue,
      phone,
      fields.map((field) => {
        const value = row[field.slug];
        return value == null ? "" : String(value).trim();
      }),
    ]);
  }

  if (valid.size === 0) {
    return {
      data: rejected,
      status: "error",
      message: "No valid contacts were found in the file.",
    };
  }

  const rows = [...valid.values()];
  const jobId = await enqueueContactImport(
    {
      orgId,
      contactGroupId,
      updateExisting,
      fieldIds: fields.map((field) => field.id),
      total: rows.length,
      rejected,
      rejectedCount,
      duplicateCount,
    },
    rows,
  );
  log.info({ orgId, jobId, total: rows.length, rejectedCount }, "Queued a contact import");

  return { status: "queued", jobId, total: rows.length, rejectedCount, duplicateCount };
}

function readProgress(progress: unknown): ContactImportProgress {
  if (progress && typeof progress === "object" && "processed" in progress) {
    return { ...EMPTY_IMPORT_PROGRESS, ...(progress as Partial<ContactImportProgress>) };
  }
  return { ...EMPTY_IMPORT_PROGRESS };
}

/**
 * The worker's half: write the queued rows a batch at a time.
 *
 * Each batch commits in one transaction — contacts, their custom field values and the group
 * links together — and progress is saved after it. A retry therefore restarts at the first
 * batch that did not commit, and never finds a contact that exists without its fields.
 */
export async function runContactImport(
  job: Job<ContactImportJobData, ContactImportProgress>,
): Promise<ContactImportProgress> {
  const jobId = job.id;
  if (!jobId) throw new UnrecoverableError("Contact import job has no id");
  const raw = await connection.get(contactImportRowsKey(jobId));
  if (!raw) throw new UnrecoverableError("The rows for this import are no longer available");
  const rows = JSON.parse(raw) as ContactImportRow[];

  let progress = readProgress(job.progress);
  for (let i = progress.processed; i < rows.length; i += IMPORT_BATCH_SIZE) {
    const batch = rows.slice(i, i + IMPORT_BATCH_SIZE);
    const result = await importContactBatch(job.data, batch);
    progress = {
      processed: i + batch.length,
      created: progress.created + result.created,
      updated: progress.updated + result.updated,
      skipped: progress.skipped + result.skipped,
      addedToGroup: progress.addedToGroup + result.addedToGroup,
    };
    await job.updateProgress(progress);
  }

  await connection.del(contactImportRowsKey(jobId));
  return progress;
}

interface CustomFieldValueInput {
  id: string;
  value: string;
}

/**
 * Write one batch in a transaction: contacts, custom field values and group links commit
 * together, so a retried batch never finds a contact that exists without its fields.
 *
 * What gets written — and which integration events follow — matches what the import did
 * on main before it moved to the worker (`createMultipleContacts` / `updateMulitplceContacts`
 * / `addNewContactsToGroup`). Only the batching is new.
 */
export async function importContactBatch(
  { orgId, fieldIds, updateExisting, contactGroupId }: ContactImportJobData,
  batch: ContactImportRow[],
): Promise<Omit<ContactImportProgress, "processed">> {
  // The row's non-empty custom field values, as main built them for each contact.
  const fieldsByPhone = new Map<string, CustomFieldValueInput[]>(
    batch.map(([, phone, values]) => [
      phone,
      fieldIds.flatMap((id, i) => (values[i] ? [{ id, value: values[i] }] : [])),
    ]),
  );

  const { created, updated, skipped, newMembers } = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.contact.findMany({
        where: { orgId, phone: { in: batch.map(([, phone]) => phone) } },
      });
      const existingByPhone = new Map(existing.map((contact) => [contact.phone, contact]));

      const fresh = batch.filter(([, phone]) => !existingByPhone.has(phone));
      const created = fresh.length
        ? await tx.contact.createManyAndReturn({
            data: fresh.map(([name, phone]) => ({ orgId, name, phone, source: CSV_IMPORT_SOURCE })),
            // A contact that arrived on WhatsApp between the read and this write is left alone.
            skipDuplicates: true,
          })
        : [];

      // Update-existing rewrites the name and the source, as the upsert on main did.
      const toUpdate = updateExisting
        ? batch.filter(([, phone]) => existingByPhone.has(phone))
        : [];
      if (toUpdate.length) {
        await tx.$executeRaw`
          UPDATE "Contact" AS c SET name = v.name, source = ${CSV_IMPORT_SOURCE}
          FROM unnest(${toUpdate.map(([name]) => name)}::text[], ${toUpdate.map(([, phone]) => phone)}::text[]) AS v(name, phone)
          WHERE c."orgId" = ${orgId}::uuid AND c.phone = v.phone`;
      }
      const nameByPhone = new Map(toUpdate.map(([name, phone]) => [phone, name]));
      const updated = existing
        .filter((contact) => contact.phone && nameByPhone.has(contact.phone))
        .map((contact) => ({
          ...contact,
          name: nameByPhone.get(contact.phone ?? "") ?? null,
          source: CSV_IMPORT_SOURCE,
        }));

      // An updated contact that has values in the file has all its old values replaced,
      // as main's upsert path did; one without values in the file keeps what it has.
      const replaced = updated
        .filter((contact) => fieldsByPhone.get(contact.phone ?? "")?.length)
        .map((contact) => contact.id);
      if (replaced.length) {
        await tx.contactCustomFieldValue.deleteMany({ where: { contactId: { in: replaced } } });
      }
      const values = [...created, ...updated].flatMap((contact) =>
        (fieldsByPhone.get(contact.phone ?? "") ?? []).map((field) => ({
          contactId: contact.id,
          fieldId: field.id,
          value: field.value,
        })),
      );
      if (values.length) await tx.contactCustomFieldValue.createMany({ data: values });

      // Every valid row joins the group, whether it was created, updated or left as it was.
      const newMembers = contactGroupId
        ? await tx.contactGroupMap.createManyAndReturn({
            data: [...created, ...existing].map((contact) => ({
              contactId: contact.id,
              contactGroupId,
            })),
            skipDuplicates: true,
          })
        : [];

      return {
        created,
        updated,
        skipped: batch.length - created.length - updated.length,
        newMembers,
      };
    },
    { timeout: 60_000 },
  );

  // After the commit, so a rolled-back batch never announces contacts that do not exist.
  await sendImportEvents(orgId, {
    updateExisting,
    created,
    updated,
    newMembers,
    fieldsByPhone,
  });

  return {
    created: created.length,
    updated: updated.length,
    skipped,
    addedToGroup: newMembers.length,
  };
}

interface TriggerSubscription {
  subscribed_field?: string;
  active?: boolean;
}

/**
 * Which Zapier and Zoho triggers this org would actually act on — the same tests
 * `notifyZapier` and `processZoho` apply when a job reaches them. Read once per batch, so a
 * subscription switched on mid-import starts receiving from the next batch.
 */
async function subscribedImportTriggers(orgId: string) {
  const integrations = await prisma.integration.findMany({
    where: { orgId, name: { in: ["zapier", "zoho"] } },
    select: { name: true, active: true, credential: true },
  });
  const keys = (name: string, requireActive: boolean) => {
    const integration = integrations.find((i) => i.name === name);
    if (!integration || (requireActive && !integration.active)) return new Set<string>();
    const subs = (integration.credential as { triggerSubscriptions?: unknown } | null)
      ?.triggerSubscriptions;
    return new Set(
      (Array.isArray(subs) ? (subs as TriggerSubscription[]) : [])
        .filter((sub) => sub.active && sub.subscribed_field)
        .map((sub) => sub.subscribed_field as string),
    );
  };
  // `processIntegration` drops a Zoho job for an inactive integration; `notifyZapier` does not
  // look at `active`, only at the subscriptions.
  return { zapier: keys("zapier", false), zoho: keys("zoho", true) };
}

type ContactIntegrationIds = {
  zoho?: { contact?: { id: string }; lead?: { id: string } };
  bigin?: { contact?: { id: string } };
} | null;

/**
 * The integration events main sent for the same import, unchanged in name, trigger and
 * payload — except that a Zapier or Zoho job is not queued when the org has no active
 * subscription for it, since the worker would drop it on arrival. Enqueueing those would
 * put several jobs per contact on the queues, and Zoho logs every job it receives at info.
 *
 * - Create mode (main: `createMultipleContacts`): Zapier "new contact", Zoho contact,
 *   Bigin contact and Zoho lead for every created contact.
 * - Update mode (main: `updateMulitplceContacts`): every row was upserted, so every contact
 *   — new or existing — gets the update events, and none gets the create ones.
 * - Group (main: `addNewContactsToGroup`): Zapier "added to group" for each new member.
 */
async function sendImportEvents(
  orgId: string,
  {
    updateExisting,
    created,
    updated,
    newMembers,
    fieldsByPhone,
  }: {
    updateExisting: boolean;
    created: Contact[];
    updated: Contact[];
    newMembers: { contactId: string; contactGroupId: string }[];
    fieldsByPhone: Map<string, CustomFieldValueInput[]>;
  },
) {
  const upserted = updateExisting ? [...updated, ...created] : [];
  const createdOnly = updateExisting ? [] : created;
  if (!upserted.length && !createdOnly.length && !newMembers.length) return;

  const subscribed = await subscribedImportTriggers(orgId);
  const zapierOn = (trigger: ZapierTriggers) => subscribed.zapier.has(trigger);
  const zohoOn = (trigger: string) => subscribed.zoho.has(trigger);

  const zapierJobs: { name: string; data: unknown }[] = [];
  const zohoJobs: { name: string; data: unknown }[] = [];
  const zohoJob = (name: string, triggerKey: string, data: unknown, rateupContactId?: string) => {
    if (zohoOn(triggerKey)) {
      zohoJobs.push({
        name,
        data: { integrationName: "zoho", triggerKey, orgId, data, rateupContactId },
      });
    }
  };

  for (const contact of createdOnly) {
    if (zapierOn(ZapierTriggers.CONTACT_CREATE)) {
      zapierJobs.push({
        name: ZapierTriggers.CONTACT_CREATE,
        data: { data: { [ZapierTriggers.CONTACT_CREATE]: contact }, orgId },
      });
    }
    const contactPayload = buildZohoContactPayload(contact);
    zohoJob("zoho-contact-create", ZohoTriggers.CONTACT_CREATE, contactPayload, contact.id);
    zohoJob(
      "zoho-bigin-contact-create",
      ZohoTriggers.BIGIN_CONTACT_CREATE,
      contactPayload,
      contact.id,
    );
    zohoJob(
      "zoho-lead-create",
      ZohoTriggers.LEAD_CREATE,
      buildZohoLeadPayload(contact),
      contact.id,
    );
  }

  const lifecycleNames = new Map<string, string | null>();
  const lifecycleName = async (id: string) => {
    if (!lifecycleNames.has(id)) {
      const lifecycle = await prisma.lifecycle.findUnique({
        where: { id },
        select: { name: true },
      });
      lifecycleNames.set(id, lifecycle?.name ?? null);
    }
    return lifecycleNames.get(id) ?? null;
  };

  for (const contact of upserted) {
    if (zapierOn(ZapierTriggers.CONTACT_UPDATED)) {
      // Main sent the spreadsheet row here, not the saved contact.
      zapierJobs.push({
        name: ZapierTriggers.CONTACT_UPDATED,
        data: {
          data: {
            [ZapierTriggers.CONTACT_UPDATED]: {
              name: contact.name,
              phone: contact.phone,
              source: CSV_IMPORT_SOURCE,
              customFields: fieldsByPhone.get(contact.phone ?? "") ?? [],
            },
          },
          orgId,
        },
      });
    }
    const integrationIds = contact.integrationIds as ContactIntegrationIds;
    zohoJob("zoho-contact-update", ZohoTriggers.CONTACT_UPDATE, {
      zohoContactId: integrationIds?.zoho?.contact?.id,
      ...buildZohoContactPayload(contact),
    });
    zohoJob("zoho-bigin-contact-update", ZohoTriggers.BIGIN_CONTACT_UPDATE, {
      biginContactId: integrationIds?.bigin?.contact?.id,
      ...buildZohoContactPayload(contact),
    });

    if (contact.lifecycleId && integrationIds?.zoho?.lead?.id) {
      const name = await lifecycleName(contact.lifecycleId);
      if (name) {
        const { Lead_Status: _mapped, ...payload } = buildZohoLeadPayload(contact);
        await pushCrmLeadStatus(
          orgId,
          integrationIds.zoho.lead.id,
          { lifecycleId: contact.lifecycleId, lifecycleName: name },
          payload,
        );
      }
    }
    if (contact.lifecycleId) {
      zohoJob(
        "zoho-bigin-deal-update",
        ZohoTriggers.BIGIN_DEAL_CREATE,
        {
          name: contact.name,
          source: contact.source,
          email: contact.email,
          phone: contact.phone,
          notes: contact.notes,
          lifecycleId: contact.lifecycleId,
        },
        contact.id,
      );
      // Not awaited, as on main; it catches its own failures.
      void triggerConversionsApiForContact(contact, contact.lifecycleId);
    }
  }

  if (zapierOn(ZapierTriggers.CONTACT_ADDED_TO_GROUP)) {
    for (const member of newMembers) {
      zapierJobs.push({
        name: ZapierTriggers.CONTACT_ADDED_TO_GROUP,
        data: { data: { [ZapierTriggers.CONTACT_ADDED_TO_GROUP]: member }, orgId },
      });
    }
  }

  if (zapierJobs.length) await zapierTriggerQueue.addBulk(zapierJobs);
  if (zohoJobs.length) await integrationTriggerQueue.addBulk(zohoJobs);
}

export type ContactImportState = "queued" | "running" | "completed" | "failed";

export interface ContactImportStatus extends ContactImportProgress {
  jobId: string;
  state: ContactImportState;
  total: number;
  rejected: RejectedImportRow[];
  rejectedCount: number;
  duplicateCount: number;
}

/** What the import dialog polls. Null when the job is gone or belongs to another org. */
export async function getContactImportStatus(
  jobId: string,
  orgId: string,
): Promise<ContactImportStatus | null> {
  const job = await contactImportQueue.getJob(jobId);
  if (!job || job.data.orgId !== orgId) return null;

  const jobState = await job.getState();
  const progress =
    jobState === "completed" && job.returnvalue
      ? readProgress(job.returnvalue)
      : readProgress(job.progress);
  let state: ContactImportState;
  if (jobState === "completed") state = "completed";
  else if (jobState === "failed") state = "failed";
  // Between two attempts a job is "delayed", but the rows it already wrote are real.
  else if (jobState === "active" || progress.processed > 0) state = "running";
  else state = "queued";

  return {
    jobId,
    state,
    ...progress,
    total: job.data.total,
    rejected: job.data.rejected,
    rejectedCount: job.data.rejectedCount,
    duplicateCount: job.data.duplicateCount,
  };
}
