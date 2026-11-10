import { isAxiosError, type AxiosInstance } from "axios";

import type { Integration } from "../../../generated/prisma/client.js";
import { IntegratedApps } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { contactWhereHasIdentity } from "../../contacts/identity/contactFields.js";
import { noteContactSelect, toNoteContact, type NoteContact } from "../shared/activityNotes.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import { LEADS_PIPELINE_TYPE } from "../../pipelines/pipelineTypes.js";
import type { ProviderJobData } from "../providers/integrationProvider.types.js";
import { recordLink } from "../shared/entityLink.js";
import { OAuthConnectError } from "../shared/oauthConnectError.js";
import { pipedriveClientFor } from "./pipedrive.client.js";
import {
  PipedriveContactBusyError,
  toPipedrivePersonFields,
  withContactLock,
  type PipedrivePerson,
} from "./pipedrive.contacts.js";
import { processPipedriveDealJob } from "./pipedrive.deals.js";
import { fromPipedrivePerson, importPipedrivePerson } from "./pipedrive.inbound.js";
import {
  readPipedriveCredential,
  type PipedriveBulkKind,
  type PipedriveBulkRun,
} from "./pipedrive.types.js";

/**
 * The first-time sync (step 5.6), started from the Pipedrive page and run in the
 * background: `import` pulls Pipedrive's persons into RateUp; `export` sends
 * RateUp's unlinked contacts to Pipedrive and, with deals on, its Leads board
 * leads as deals. Both only add and link; nothing already linked is changed.
 * Each run's counts are kept on the credential for the page to show.
 *
 * Pipedrive has no batch writes, and a search costs far more of the company's
 * daily budget than a page of a list. So the export reads every person once, page
 * by page, and matches RateUp's contacts against that in memory — which also
 * matches phones Pipedrive holds formatted (`+91 98765 43210`) — then creates the
 * rest one by one.
 */

export const PIPEDRIVE_BULK = "bulk";

/** Pipedrive's largest page. */
const PAGE = 500;

/** RateUp contacts read per batch. */
const BATCH = 100;

/** A run left `running` this long ago died with its worker; another may start. */
const STALE_RUN_MS = 2 * 60 * 60 * 1000;

const CONTACT_LINK = "contact";

export interface PipedriveBulkJobData {
  kind: PipedriveBulkKind;
}

/** Waits between retries of a rate-limited call; replaced in tests. */
export const bulkTiming = {
  sleep: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
};

/** Said when Pipedrive keeps refusing: most often the company's daily budget is spent. */
export class PipedriveRateLimitError extends Error {
  constructor() {
    super(
      "Pipedrive's API limit was reached. Its daily allowance resets within a day; run this again then — what was done is kept.",
    );
  }
}

/**
 * Runs a Pipedrive call, riding out its burst limit: a 429 waits and tries again,
 * three times at most. Past that the daily budget is the likelier cause, and the
 * run stops with a message that says so.
 */
async function withRateLimit<T>(call: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call();
    } catch (error) {
      if (!(isAxiosError(error) && error.response?.status === 429)) throw error;
      if (attempt >= 3) throw new PipedriveRateLimitError();
      await bulkTiming.sleep(10_000);
    }
  }
}

const emptyRun = (): PipedriveBulkRun => ({
  status: "running",
  startedAt: new Date().toISOString(),
  created: 0,
  linked: 0,
  skipped: 0,
  failed: 0,
});

/**
 * Saves one run onto the credential. Re-reads it first, so a token refreshed or a
 * setting saved since the run started is not written over.
 */
async function saveRun(integrationId: string, kind: PipedriveBulkKind, run: PipedriveBulkRun) {
  const current = await prisma.integration.findUnique({
    where: { id: integrationId },
    select: { credential: true },
  });
  const credential = (current?.credential ?? {}) as Record<string, unknown>;
  const bulk = (credential.bulk ?? {}) as Record<string, unknown>;
  await prisma.integration.update({
    where: { id: integrationId },
    data: { credential: { ...credential, bulk: { ...bulk, [kind]: run } } as never },
  });
}

/** Starts a run, refusing a second one of the same kind while the first is going. */
export async function startPipedriveBulk(orgId: string, kind: PipedriveBulkKind) {
  const integration = await prisma.integration.findUnique({
    where: { orgid_integration_name_unique: { orgId, name: IntegratedApps.pipedrive } },
  });
  const credential = integration?.active ? readPipedriveCredential(integration.credential) : null;
  if (!integration || !credential) throw new OAuthConnectError("Pipedrive is not connected.", 400);

  const previous = credential.bulk?.[kind];
  if (
    previous?.status === "running" &&
    Date.now() - new Date(previous.startedAt).getTime() < STALE_RUN_MS
  ) {
    throw new OAuthConnectError("This is already running. Wait for it to finish.", 409);
  }

  await saveRun(integration.id, kind, emptyRun());
  const job: ProviderJobData<PipedriveBulkJobData> = {
    integrationName: IntegratedApps.pipedrive,
    triggerKey: PIPEDRIVE_BULK,
    orgId,
    data: { kind },
  };
  // One attempt: a retry would start over and double every count.
  await integrationTriggerQueue.add(`pipedrive-${PIPEDRIVE_BULK}-${kind}`, job, {
    attempts: 1,
    removeOnComplete: true,
  });
}

/** The worker side: runs the job and records how it ended, whichever way. */
export async function processPipedriveBulkJob(integration: Integration, job: ProviderJobData) {
  const { kind } = job.data as PipedriveBulkJobData;
  const run = emptyRun();
  run.startedAt =
    readPipedriveCredential(integration.credential)?.bulk?.[kind]?.startedAt ?? run.startedAt;
  const progress = () => saveRun(integration.id, kind, run);
  try {
    if (kind === "import") await importPersons(integration, run, progress);
    else await exportAll(integration, run, progress);
    run.status = "done";
  } catch (error) {
    log.error({ err: error, integrationId: integration.id, kind }, "Pipedrive bulk run failed");
    run.status = "failed";
    run.error = error instanceof Error ? error.message.slice(0, 300) : "Failed";
  }
  run.finishedAt = new Date().toISOString();
  await progress();
  return run;
}

/** Every person in the company, a page at a time. */
async function* persons(client: AxiosInstance) {
  let cursor: string | undefined;
  do {
    const page = await withRateLimit(() =>
      client.get<{
        data?: PipedrivePerson[] | null;
        additional_data?: { next_cursor?: string | null };
      }>("/v2/persons", { params: { limit: PAGE, ...(cursor && { cursor }) } }),
    );
    yield page.data.data ?? [];
    cursor = page.data.additional_data?.next_cursor ?? undefined;
  } while (cursor);
}

/** The external ids of this integration's links among `ids`, by RateUp id or by Pipedrive id. */
async function linkedAmong(
  integrationId: string,
  entityType: string,
  side: "rateupId" | "externalId",
  ids: string[],
) {
  const links = await prisma.integrationEntityLink.findMany({
    where: { integrationId, entityType, [side]: { in: ids } },
    select: { rateupId: true, externalId: true },
  });
  return new Set(links.map((link) => link[side]));
}

// ---------------------------------------------------------------------------
// Pipedrive → RateUp
// ---------------------------------------------------------------------------

async function importPersons(
  integration: Integration,
  run: PipedriveBulkRun,
  progress: () => Promise<void>,
) {
  const orgId = integration.orgId;
  if (!orgId) return;
  const client = await pipedriveClientFor(integration);
  for await (const page of persons(client)) {
    const linked = await linkedAmong(
      integration.id,
      CONTACT_LINK,
      "externalId",
      page.map((person) => String(person.id)),
    );
    for (const person of page) {
      if (person.is_deleted || linked.has(String(person.id))) {
        run.skipped++;
        continue;
      }
      try {
        const { outcome } = await importPipedrivePerson(
          { id: integration.id, orgId },
          String(person.id),
          fromPipedrivePerson(person),
        );
        if (outcome === "no_phone") run.skipped++;
        else run[outcome]++;
      } catch (error) {
        log.warn({ err: error, personId: person.id }, "Pipedrive person not imported");
        run.failed++;
      }
    }
    await progress();
  }
}

// ---------------------------------------------------------------------------
// RateUp → Pipedrive
// ---------------------------------------------------------------------------

const digitsOf = (value: string | undefined | null) => value?.replace(/\D/g, "") ?? "";

/** Every person's emails and international phones, to match RateUp's contacts against. */
async function indexPersons(client: AxiosInstance) {
  const byEmail = new Map<string, number>();
  const byPhone = new Map<string, number>();
  for await (const page of persons(client)) {
    for (const person of page) {
      if (person.is_deleted) continue;
      for (const { value } of person.emails ?? []) {
        const email = value?.trim().toLowerCase();
        if (email && !byEmail.has(email)) byEmail.set(email, person.id);
      }
      for (const { value } of person.phones ?? []) {
        // Only numbers with their country code can be compared with RateUp's.
        const digits = value?.trim().startsWith("+") ? digitsOf(value) : "";
        if (digits.length >= 8 && !byPhone.has(digits)) byPhone.set(digits, person.id);
      }
    }
  }
  return { byEmail, byPhone };
}

async function exportAll(
  integration: Integration,
  run: PipedriveBulkRun,
  progress: () => Promise<void>,
) {
  const client = await pipedriveClientFor(integration);
  await exportContacts(integration, client, run, progress);

  const credential = readPipedriveCredential(integration.credential);
  if (credential?.syncDeals && credential.dealPipelineId) {
    run.deals = { created: 0, skipped: 0, failed: 0 };
    await exportDeals(
      integration,
      credential.stageMappings?.map((m) => m.stageId) ?? [],
      run,
      progress,
    );
  }
}

async function exportContacts(
  integration: Integration,
  client: AxiosInstance,
  run: PipedriveBulkRun,
  progress: () => Promise<void>,
) {
  if (!integration.orgId) return;
  const key = { integrationId: integration.id, entityType: CONTACT_LINK };
  const { byEmail, byPhone } = await indexPersons(client);

  let cursor: string | undefined;
  for (;;) {
    const rows = await prisma.contact.findMany({
      where: {
        orgId: integration.orgId,
        OR: [contactWhereHasIdentity("email"), contactWhereHasIdentity("phone")],
      },
      select: noteContactSelect,
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    const contacts: NoteContact[] = rows.map(toNoteContact);
    if (!contacts.length) break;
    cursor = contacts[contacts.length - 1].id;

    const linked = await linkedAmong(
      integration.id,
      CONTACT_LINK,
      "rateupId",
      contacts.map((c) => c.id),
    );
    for (const contact of contacts) {
      const fields = linked.has(contact.id) ? null : toPipedrivePersonFields(contact);
      if (!fields) {
        run.skipped++;
        continue;
      }
      try {
        const outcome = await withContactLock(integration.id, contact.id, async () => {
          const match =
            (fields.email && byEmail.get(fields.email)) ||
            (fields.phone && byPhone.get(digitsOf(fields.phone))) ||
            undefined;
          if (match) {
            await recordLink(key, {
              rateupId: contact.id,
              externalId: String(match),
              payload: fields,
            });
            return "linked" as const;
          }
          const created = await withRateLimit(() =>
            client.post<{ data: { id: number } }>("/v2/persons", {
              name: fields.name,
              ...(fields.email && {
                emails: [{ value: fields.email, primary: true, label: "work" }],
              }),
              ...(fields.phone && {
                phones: [{ value: fields.phone, primary: true, label: "mobile" }],
              }),
            }),
          );
          const id = created.data.data.id;
          await recordLink(key, { rateupId: contact.id, externalId: String(id), payload: fields });
          // Two RateUp contacts sharing an email are one person: the next is linked to it.
          if (fields.email) byEmail.set(fields.email, id);
          if (fields.phone) byPhone.set(digitsOf(fields.phone), id);
          return "created" as const;
        });
        run[outcome]++;
      } catch (error) {
        if (error instanceof PipedriveRateLimitError) throw error;
        // A live push is sending this contact right now; it links it itself.
        if (error instanceof PipedriveContactBusyError) {
          run.skipped++;
          continue;
        }
        log.warn({ err: error, contactId: contact.id }, "Contact not sent to Pipedrive");
        run.failed++;
      }
    }
    await progress();
    if (contacts.length < BATCH) break;
  }
}

/**
 * Leads board leads with no deal yet, in mapped columns or in Won and Lost ones,
 * one at a time through the same path as a lead moving (step 5.3). The contacts
 * were linked just before, so the deals rarely need a person found.
 */
async function exportDeals(
  integration: Integration,
  mappedColumns: string[],
  run: PipedriveBulkRun,
  progress: () => Promise<void>,
) {
  const deals = run.deals!;
  if (!integration.orgId) return;
  let cursor: string | undefined;
  for (;;) {
    const leads = await prisma.lead.findMany({
      where: {
        pipeline: { orgId: integration.orgId, type: LEADS_PIPELINE_TYPE },
        OR: [{ stageId: { in: mappedColumns } }, { stage: { status: { in: ["WON", "LOST"] } } }],
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    if (!leads.length) break;
    cursor = leads[leads.length - 1].id;

    const linked = await linkedAmong(
      integration.id,
      "lead",
      "rateupId",
      leads.map((l) => l.id),
    );
    for (const lead of leads) {
      if (linked.has(lead.id)) {
        deals.skipped++;
        continue;
      }
      try {
        const outcome = await withRateLimit(() =>
          processPipedriveDealJob(integration, {
            integrationName: IntegratedApps.pipedrive,
            triggerKey: PIPEDRIVE_BULK,
            orgId: integration.orgId!,
            data: { leadId: lead.id },
          }),
        );
        if (outcome === "created") deals.created++;
        else deals.skipped++;
      } catch (error) {
        if (error instanceof PipedriveRateLimitError) throw error;
        log.warn({ err: error, leadId: lead.id }, "Lead not sent to Pipedrive as a deal");
        deals.failed++;
      }
    }
    await progress();
    if (leads.length < BATCH) break;
  }
}
