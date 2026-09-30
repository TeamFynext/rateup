import { isAxiosError, type AxiosInstance } from "axios";

import type { Integration } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { IntegratedApps } from "../../../types/enums.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import { LEADS_PIPELINE_TYPE } from "../../pipeline/pipelineTypes.js";
import type { ProviderJobData } from "../providers/integrationProvider.types.js";
import { findLinkByExternalId, recordLink } from "../shared/entityLink.js";
import { OAuthConnectError } from "../shared/oauthConnectError.js";
import { hubSpotClientFor } from "./hubspot.auth.js";
import {
  createHubSpotContact,
  toHubSpotContactProperties,
  type HubSpotContactProperties,
} from "./hubspot.contacts.js";
import { processHubSpotDealJob } from "./hubspot.deals.js";
import { fromHubSpotContact, importHubSpotContact } from "./hubspot.inbound.js";
import {
  readHubSpotCredential,
  type HubSpotBulkKind,
  type HubSpotBulkRun,
} from "./hubspot.types.js";

/**
 * The first-time sync (step 2.6), started from the HubSpot page and run in the
 * background: `import` pulls HubSpot's contacts into RateUp; `export` sends
 * RateUp's unlinked contacts to HubSpot in batches of 100 and, with deals on,
 * its Leads board leads as deals. Both only add and link; nothing already linked
 * is changed. Each run's counts are kept on the credential for the page to show.
 */

export const HUBSPOT_BULK = "bulk";

const PAGE = 100;

/** A run left `running` this long ago died with its worker; another may start. */
const STALE_RUN_MS = 2 * 60 * 60 * 1000;

const CONTACT_LINK = "contact";

export interface HubSpotBulkJobData {
  kind: HubSpotBulkKind;
}

/** Waits between retries of a rate-limited call; replaced in tests. */
export const bulkTiming = {
  sleep: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
};

/**
 * Runs a HubSpot call, riding out its rate limit: a 429 waits the ten-second
 * window out and tries again, three times at most.
 */
async function withRateLimit<T>(call: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call();
    } catch (error) {
      if (attempt >= 3 || !(isAxiosError(error) && error.response?.status === 429)) throw error;
      await bulkTiming.sleep(10_000);
    }
  }
}

const emptyRun = (): HubSpotBulkRun => ({
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
async function saveRun(integrationId: string, kind: HubSpotBulkKind, run: HubSpotBulkRun) {
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
export async function startHubSpotBulk(orgId: string, kind: HubSpotBulkKind) {
  const integration = await prisma.integration.findUnique({
    where: { orgid_integration_name_unique: { orgId, name: IntegratedApps.hubspot } },
  });
  const credential = integration?.active ? readHubSpotCredential(integration.credential) : null;
  if (!integration || !credential) throw new OAuthConnectError("HubSpot is not connected.", 400);

  const previous = credential.bulk?.[kind];
  if (
    previous?.status === "running" &&
    Date.now() - new Date(previous.startedAt).getTime() < STALE_RUN_MS
  ) {
    throw new OAuthConnectError("This is already running. Wait for it to finish.", 409);
  }

  await saveRun(integration.id, kind, emptyRun());
  const job: ProviderJobData<HubSpotBulkJobData> = {
    integrationName: IntegratedApps.hubspot,
    triggerKey: HUBSPOT_BULK,
    orgId,
    data: { kind },
  };
  // One attempt: a retry would start over and double every count.
  await integrationTriggerQueue.add(`hubspot-${HUBSPOT_BULK}-${kind}`, job, {
    attempts: 1,
    removeOnComplete: true,
  });
}

/** The worker side: runs the job and records how it ended, whichever way. */
export async function processHubSpotBulkJob(integration: Integration, job: ProviderJobData) {
  const { kind } = job.data as HubSpotBulkJobData;
  const run = emptyRun();
  run.startedAt =
    readHubSpotCredential(integration.credential)?.bulk?.[kind]?.startedAt ?? run.startedAt;
  const progress = () => saveRun(integration.id, kind, run);
  try {
    if (kind === "import") await importContacts(integration, run, progress);
    else await exportAll(integration, run, progress);
    run.status = "done";
  } catch (error) {
    log.error({ err: error, integrationId: integration.id, kind }, "HubSpot bulk run failed");
    run.status = "failed";
    run.error = error instanceof Error ? error.message.slice(0, 300) : "Failed";
  }
  run.finishedAt = new Date().toISOString();
  await progress();
  return run;
}

// ---------------------------------------------------------------------------
// HubSpot → RateUp
// ---------------------------------------------------------------------------

interface HubSpotPage {
  results: { id: string; properties: Record<string, string | null | undefined> }[];
  paging?: { next?: { after?: string } };
}

async function importContacts(
  integration: Integration,
  run: HubSpotBulkRun,
  progress: () => Promise<void>,
) {
  const orgId = integration.orgId;
  if (!orgId) return;
  const key = { integrationId: integration.id, entityType: CONTACT_LINK };
  const client = await hubSpotClientFor(integration);
  let after: string | undefined;
  do {
    const page = await withRateLimit(() =>
      client.get<HubSpotPage>("/crm/v3/objects/contacts", {
        params: {
          limit: PAGE,
          properties: "firstname,lastname,email,phone",
          ...(after && { after }),
        },
      }),
    );
    for (const record of page.data.results ?? []) {
      try {
        if (await findLinkByExternalId(key, record.id)) {
          run.skipped++;
          continue;
        }
        const { outcome } = await importHubSpotContact(
          { id: integration.id, orgId },
          record.id,
          fromHubSpotContact(record.properties),
        );
        if (outcome === "no_phone") run.skipped++;
        else run[outcome]++;
      } catch (error) {
        log.warn({ err: error, hubSpotId: record.id }, "HubSpot contact not imported");
        run.failed++;
      }
    }
    await progress();
    after = page.data.paging?.next?.after;
  } while (after);
}

// ---------------------------------------------------------------------------
// RateUp → HubSpot
// ---------------------------------------------------------------------------

async function exportAll(
  integration: Integration,
  run: HubSpotBulkRun,
  progress: () => Promise<void>,
) {
  const client = await hubSpotClientFor(integration);
  await exportContacts(integration, client, run, progress);

  const credential = readHubSpotCredential(integration.credential);
  if (credential?.syncDeals && credential.dealPipelineId && credential.stageMappings?.length) {
    run.deals = { created: 0, skipped: 0, failed: 0 };
    await exportDeals(
      integration,
      credential.stageMappings.map((m) => m.stageId),
      run,
      progress,
    );
  }
}

interface Pending {
  contactId: string;
  properties: HubSpotContactProperties;
}

async function exportContacts(
  integration: Integration,
  client: AxiosInstance,
  run: HubSpotBulkRun,
  progress: () => Promise<void>,
) {
  if (!integration.orgId) return;
  const key = { integrationId: integration.id, entityType: CONTACT_LINK };
  let cursor: string | undefined;
  for (;;) {
    const contacts = await prisma.contact.findMany({
      where: { orgId: integration.orgId, OR: [{ email: { not: null } }, { phone: { not: null } }] },
      select: { id: true, name: true, email: true, phone: true },
      orderBy: { id: "asc" },
      take: PAGE,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    if (!contacts.length) break;
    cursor = contacts[contacts.length - 1].id;

    const linked = new Set(
      (
        await prisma.integrationEntityLink.findMany({
          where: {
            integrationId: integration.id,
            entityType: CONTACT_LINK,
            rateupId: { in: contacts.map((c) => c.id) },
          },
          select: { rateupId: true },
        })
      ).map((link) => link.rateupId),
    );
    const pending: Pending[] = [];
    for (const contact of contacts) {
      const properties = linked.has(contact.id) ? null : toHubSpotContactProperties(contact);
      if (properties) pending.push({ contactId: contact.id, properties });
      else run.skipped++;
    }

    try {
      await sendBatch(client, pending, run, async (item, externalId) => {
        await recordLink(key, { rateupId: item.contactId, externalId, payload: item.properties });
      });
    } catch (error) {
      log.warn({ err: error, integrationId: integration.id }, "HubSpot contact batch failed");
      run.failed += pending.length;
    }
    await progress();
    if (contacts.length < PAGE) break;
  }
}

/**
 * One batch: people HubSpot already has — by email in one batch read, by phone in
 * one search — are linked; the rest are created together. A batch create HubSpot
 * refuses as a whole (one malformed email fails all 100) falls back to one create
 * per contact, so one bad record costs only itself.
 */
async function sendBatch(
  client: AxiosInstance,
  pending: Pending[],
  run: HubSpotBulkRun,
  link: (item: Pending, externalId: string) => Promise<void>,
) {
  if (!pending.length) return;
  const byEmail = new Map<string, string>();
  const byPhone = new Map<string, string>();

  const emails = [
    ...new Set(pending.flatMap((p) => (p.properties.email ? [p.properties.email] : []))),
  ];
  if (emails.length) {
    const found = await withRateLimit(() =>
      client.post<{ results?: { id: string; properties: { email?: string | null } }[] }>(
        "/crm/v3/objects/contacts/batch/read",
        {
          idProperty: "email",
          properties: ["email"],
          inputs: emails.map((email) => ({ id: email })),
        },
      ),
    );
    for (const record of found.data.results ?? []) {
      const email = record.properties.email?.toLowerCase();
      if (email) byEmail.set(email, record.id);
    }
  }

  const phones = pending.flatMap((p) =>
    p.properties.phone && !(p.properties.email && byEmail.has(p.properties.email))
      ? [p.properties.phone]
      : [],
  );
  if (phones.length) {
    const found = await withRateLimit(() =>
      client.post<{ results?: { id: string; properties: { phone?: string | null } }[] }>(
        "/crm/v3/objects/contacts/search",
        {
          filterGroups: [{ filters: [{ propertyName: "phone", operator: "IN", values: phones }] }],
          properties: ["phone"],
          limit: PAGE,
        },
      ),
    );
    for (const record of found.data.results ?? []) {
      if (record.properties.phone) byPhone.set(record.properties.phone, record.id);
    }
  }

  const toCreate: Pending[] = [];
  // Two RateUp contacts sharing an email are one HubSpot contact; the second is
  // linked to whatever the first becomes.
  const emailOwners = new Map<string, Pending>();
  const sharers: Pending[] = [];
  for (const item of pending) {
    const { email, phone } = item.properties;
    const match = (email && byEmail.get(email)) || (phone && byPhone.get(phone));
    if (match) {
      await link(item, match);
      run.linked++;
    } else if (email && emailOwners.has(email)) {
      sharers.push(item);
    } else {
      if (email) emailOwners.set(email, item);
      toCreate.push(item);
    }
  }

  const createdIds = new Map<Pending, string>();
  if (toCreate.length) {
    try {
      const created = await withRateLimit(() =>
        client.post<{ results?: { id: string; properties: Record<string, string | null> }[] }>(
          "/crm/v3/objects/contacts/batch/create",
          { inputs: toCreate.map((item) => ({ properties: item.properties })) },
        ),
      );
      // Results are not in input order; match them back on what makes each unique.
      for (const record of created.data.results ?? []) {
        const email = record.properties.email?.toLowerCase();
        const item = toCreate.find(
          (candidate) =>
            (email && candidate.properties.email === email) ||
            (!candidate.properties.email && candidate.properties.phone === record.properties.phone),
        );
        if (item) createdIds.set(item, record.id);
      }
    } catch (error) {
      if (!(isAxiosError(error) && [400, 409].includes(error.response?.status ?? 0))) throw error;
      for (const item of toCreate) {
        try {
          const { id } = await withRateLimit(() => createHubSpotContact(client, item.properties));
          createdIds.set(item, id);
        } catch {
          run.failed++;
        }
      }
    }
  }
  for (const [item, id] of createdIds) {
    await link(item, id);
    run.created++;
  }
  for (const item of sharers) {
    const owner = item.properties.email ? emailOwners.get(item.properties.email) : undefined;
    const id = owner ? createdIds.get(owner) : undefined;
    if (id) {
      await link(item, id);
      run.linked++;
    } else {
      run.failed++;
    }
  }
}

/**
 * Leads board leads in mapped columns with no deal yet, one at a time through the
 * same path as a lead moving (step 2.3): it finds or creates the deal's contact
 * and links the deal. Boards hold far fewer leads than the contact book.
 */
async function exportDeals(
  integration: Integration,
  mappedColumns: string[],
  run: HubSpotBulkRun,
  progress: () => Promise<void>,
) {
  const deals = run.deals!;
  if (!integration.orgId) return;
  let cursor: string | undefined;
  for (;;) {
    const leads = await prisma.lead.findMany({
      where: {
        pipeline: { orgId: integration.orgId, type: LEADS_PIPELINE_TYPE },
        stageId: { in: mappedColumns },
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: PAGE,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    if (!leads.length) break;
    cursor = leads[leads.length - 1].id;

    const linked = new Set(
      (
        await prisma.integrationEntityLink.findMany({
          where: {
            integrationId: integration.id,
            entityType: "lead",
            rateupId: { in: leads.map((l) => l.id) },
          },
          select: { rateupId: true },
        })
      ).map((link) => link.rateupId),
    );
    for (const lead of leads) {
      if (linked.has(lead.id)) {
        deals.skipped++;
        continue;
      }
      try {
        const outcome = await withRateLimit(() =>
          processHubSpotDealJob(integration, {
            integrationName: IntegratedApps.hubspot,
            triggerKey: HUBSPOT_BULK,
            orgId: integration.orgId!,
            data: { leadId: lead.id },
          }),
        );
        if (outcome === "created") deals.created++;
        else deals.skipped++;
      } catch (error) {
        log.warn({ err: error, leadId: lead.id }, "Lead not sent to HubSpot as a deal");
        deals.failed++;
      }
    }
    await progress();
    if (leads.length < PAGE) break;
  }
}
