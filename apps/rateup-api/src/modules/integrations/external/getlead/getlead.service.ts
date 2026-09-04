import type { Integration } from "../../../../../generated/prisma/client.js";
import prisma from "../../../../utils/prisma.js";
import { log } from "../../../../utils/logger.js";
import { IntegratedApps } from "../../../../types/enums.js";
import { recordIntegrationSyncActivity } from "../integrationActivity.js";
import {
  createGetLead,
  createGetLeadAxios,
  createGetLeadNote,
  getGetLeadMeta,
  updateGetLead,
  updateGetLeadByIdentifier,
} from "./getlead.client.js";
import {
  getGetLeadCredential,
  isGetLeadNotFound,
  isInvalidStatusTransition,
  parseGetLeadError,
  readRateLimit,
  type GetLeadCredential,
  type GetLeadMeta,
  type GetLeadWritePayload,
} from "./getlead.types.js";
import {
  buildGetLeadPayload,
  isGetLeadTriggerEnabled,
  toGetLeadPhone,
  type GetLeadSource,
} from "./getlead.utils.js";

/** Rateup events forwarded to GetLead, gated per-org by `triggerSubscriptions`. */
export enum GetLeadTriggers {
  LEAD_CREATE = "getlead_lead_create",
  LEAD_UPDATE = "getlead_lead_update",
  NOTE_CREATE = "getlead_note_create",
}

/** How stale a cached `GET /meta` may be before a read refreshes it. */
const META_TTL_MS = 24 * 60 * 60 * 1000;

/** The org's GetLead integration row, or null when it was never connected. */
export async function getGetLeadIntegration(orgId: string) {
  return prisma.integration.findUnique({
    where: {
      orgid_integration_name_unique: { orgId, name: IntegratedApps.getlead },
    },
  });
}

/**
 * Writes `patch` over the stored credential, keeping every field it does not
 * mention.
 *
 * `updateIntegrationByName` assigns the whole `credential` column, so saving one
 * part of the config through it would drop the rest — a mapping save would wipe
 * the API key. Everything that edits GetLead config goes through here instead.
 */
export async function mergeGetLeadCredential(
  orgId: string,
  patch: Partial<GetLeadCredential>,
): Promise<GetLeadCredential> {
  const existing = await getGetLeadIntegration(orgId);
  const current = existing ? getGetLeadCredential(existing) : ({} as GetLeadCredential);
  const credential: GetLeadCredential = { ...current, ...patch };

  await prisma.integration.upsert({
    where: {
      orgid_integration_name_unique: { orgId, name: IntegratedApps.getlead },
    },
    create: { orgId, name: IntegratedApps.getlead, credential },
    update: { credential },
  });

  return credential;
}

export class GetLeadConnectionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GetLeadConnectionError";
  }
}

/**
 * Verifies a pasted API key and stores it.
 *
 * `GET /meta` doubles as the liveness check — it is the cheapest authenticated
 * call, so a 401 here means the key is wrong. Validating on save is what stops a
 * typo from sitting silently in the credential until the first lead fails to
 * sync; the generic integration CRUD cannot do this because it is
 * provider-agnostic.
 *
 * The reference data the check returns is cached in the same write, so
 * connecting costs one round trip rather than two.
 */
export async function connectGetLead(orgId: string, apiKey: string, baseUrl?: string) {
  let meta: GetLeadMeta;
  try {
    meta = await getGetLeadMeta(createGetLeadAxios(apiKey, baseUrl));
  } catch (error) {
    const parsed = parseGetLeadError(error);
    log.warn("GetLead key validation failed for org %s: %s", orgId, parsed.message);

    if (parsed.status === 401) {
      throw new GetLeadConnectionError("That API key was rejected by GetLead.", 400);
    }
    throw new GetLeadConnectionError(
      `Could not reach GetLead: ${parsed.message}`,
      parsed.status === 429 ? 429 : 502,
    );
  }

  const existing = await getGetLeadIntegration(orgId);
  const existingCredential = existing ? getGetLeadCredential(existing) : null;
  const alreadySubscribed = (existingCredential?.triggerSubscriptions?.length ?? 0) > 0;

  // Seeded so the first sync is attributed to something meaningful: a lead sent
  // with no `source_id` is filed by GetLead under its own "API" source, which
  // tells the org nothing about where the lead came from. "Direct" is the
  // closest honest default — Rateup is not Facebook or Google Ads, and guessing
  // one of those would be worse than saying nothing. Overridden in the mapping
  // screen, and only seeded when the org has not chosen already.
  const directSourceId = meta.sources.find((s) => s.name.toLowerCase() === "direct")?.id;
  const seedDefaults = !existingCredential?.defaults?.sourceId && directSourceId;

  // Issued on the first connect so the settings screen has a URL to show the
  // moment a key is saved, rather than behind a second button nobody presses.
  // Never re-issued: replacing a key must not silently break a workflow that is
  // already delivering — `POST /webhook` is the deliberate way to rotate it.
  // Keyed on `token`, not on `inbound` existing: a credential written before the
  // token was stored cannot produce a URL, so it is repaired here rather than
  // left showing a broken one forever. An inbound that works is never replaced —
  // re-pasting a key must not break a workflow that is already delivering.
  // Imported here rather than at the top. `getlead.webhook` imports this module
  // back for its credential writes, and a static edge in both directions is a
  // cycle: under ESM the module that loses the race sees the other's exports as
  // undefined. That failure surfaces far from here — it took out an unrelated
  // Zoho test — so the edge is kept dynamic.
  const { createGetLeadInbound } = await import("./getlead.webhook.js");
  const inbound = existingCredential?.inbound?.token
    ? existingCredential.inbound
    : await createGetLeadInbound();

  const credential = await mergeGetLeadCredential(orgId, {
    apiKey,
    ...(baseUrl && { baseUrl }),
    meta: { ...meta, fetchedAt: new Date().toISOString() },
    // Every trigger is gated on a subscription, so an org that connected and
    // found none enabled would see nothing sync and no error explaining it.
    // Connecting means "start syncing"; turning individual triggers off is the
    // deliberate act, not turning them on. Only seeded on a first connect, so
    // re-pasting a key does not silently re-enable what an org switched off.
    ...(!alreadySubscribed && {
      triggerSubscriptions: Object.values(GetLeadTriggers).map((trigger) => ({
        subscribed_field: trigger,
        active: true,
      })),
    }),
    ...(seedDefaults && {
      defaults: { ...existingCredential?.defaults, sourceId: directSourceId },
    }),
    inbound,
  });

  log.info("GetLead connected for org %s", orgId);
  return { meta: credential.meta };
}

/**
 * The business's reference data, from cache unless it is stale or `refresh` is set.
 *
 * Sources, statuses and purposes are edited rarely and every lead push needs
 * their ids, so re-fetching per push would spend the 100/min budget on data that
 * almost never changes.
 */
export async function getCachedGetLeadMeta(orgId: string, refresh = false) {
  const integration = await getGetLeadIntegration(orgId);
  if (!integration) {
    throw new GetLeadConnectionError("GetLead is not connected for this organisation.", 404);
  }

  const credential = getGetLeadCredential(integration);
  const cached = credential.meta;
  const fresh =
    cached?.fetchedAt && Date.now() - new Date(cached.fetchedAt).getTime() < META_TTL_MS;

  if (cached && fresh && !refresh) return cached;

  try {
    const meta = await getGetLeadMeta(createGetLeadAxios(credential.apiKey, credential.baseUrl));
    const updated = await mergeGetLeadCredential(orgId, {
      meta: { ...meta, fetchedAt: new Date().toISOString() },
    });
    return updated.meta;
  } catch (error) {
    const parsed = parseGetLeadError(error);
    // Stale reference data still resolves ids, so a failed refresh should not
    // take the settings screen down with it.
    if (cached) {
      log.warn("GetLead meta refresh failed for org %s, serving cache: %s", orgId, parsed.message);
      return cached;
    }
    throw new GetLeadConnectionError(`Could not reach GetLead: ${parsed.message}`, 502);
  }
}

// ---------------------------------------------------------------------------
// Outbound push
// ---------------------------------------------------------------------------

/**
 * Where a lead's GetLead id lives.
 *
 * The contact wins whenever there is one — that is where the rest of the app
 * looks, and a lead can be deleted off the board while the person remains. A
 * lead typed straight onto the board has no contact, so it holds its own id;
 * without that it would open a fresh GetLead lead on every stage change.
 */
export interface GetLeadIdHolder {
  kind: "contact" | "lead";
  id: string;
}

function resolveHolder(rateupContactId?: string, rateupLeadId?: string): GetLeadIdHolder | null {
  if (rateupContactId) return { kind: "contact", id: rateupContactId };
  if (rateupLeadId) return { kind: "lead", id: rateupLeadId };
  return null;
}

async function readIntegrationIds(holder: GetLeadIdHolder | null) {
  if (!holder) return {} as ContactIntegrationIds;
  const row =
    holder.kind === "contact"
      ? await prisma.contact.findUnique({
          where: { id: holder.id },
          select: { integrationIds: true },
        })
      : await prisma.lead.findUnique({
          where: { id: holder.id },
          select: { integrationIds: true },
        });
  return (row?.integrationIds as ContactIntegrationIds | null) ?? ({} as ContactIntegrationIds);
}

/**
 * Caches the id GetLead assigned, so the next push is a single PATCH.
 *
 * Exported because the inbound half writes the same field: a lead GetLead
 * created and pushed to us has to remember its GetLead id too, or the status
 * change that follows it would fall back to matching on a phone number.
 */
export async function writeGetLeadId(holder: GetLeadIdHolder | null, leadId: string) {
  if (!holder) return;
  const existing = await readIntegrationIds(holder);
  const integrationIds = { ...existing, getlead: { lead: { id: leadId } } };

  if (holder.kind === "contact") {
    await prisma.contact.update({ where: { id: holder.id }, data: { integrationIds } });
  } else {
    await prisma.lead.update({ where: { id: holder.id }, data: { integrationIds } });
  }
}

/**
 * Sends the payload, dropping `status_id` if GetLead refuses the transition.
 *
 * A board column can map to a status the org's GetLead workflow will not accept
 * from the lead's current one. Failing the whole push would lose the name, email
 * and notes over a status GetLead was always going to reject, so the status is
 * dropped and the rest lands. The rejection is logged for the mapping UI to
 * surface — it is a configuration problem, not a transient one.
 */
async function sendWithStatusFallback(
  payload: GetLeadWritePayload,
  send: (body: GetLeadWritePayload) => Promise<string | void>,
  orgId: string,
  outcome: { statusRejected?: boolean },
) {
  try {
    return await send(payload);
  } catch (error) {
    if (!isInvalidStatusTransition(error) || payload.status_id === undefined) throw error;

    const { status_id: rejected, ...withoutStatus } = payload;
    log.warn("GetLead refused status %s for org %s; retrying without it", rejected, orgId);
    // Carried out to the timeline: the lead syncs, but its stage did not, and
    // that is a mapping the org needs to correct.
    outcome.statusRejected = true;
    return send(withoutStatus);
  }
}

/**
 * Creates or updates the lead in GetLead.
 *
 * Ordered id -> identifier -> create rather than create-first: `POST /leads`
 * answers 422 on a duplicate phone or email, and Rateup will routinely push
 * someone GetLead already knows. This way the steady state is one call, and the
 * fallback never depends on parsing an error code. `by-identifier` returns the
 * id it matched, which is what makes the next push a single PATCH.
 */
async function pushLead(
  client: ReturnType<typeof createGetLeadAxios>,
  payload: GetLeadWritePayload,
  phone: string,
  holder: GetLeadIdHolder | null,
  orgId: string,
): Promise<{ leadId?: string; created: boolean; statusRejected: boolean }> {
  const outcome: { statusRejected?: boolean } = {};
  const known = (await readIntegrationIds(holder)).getlead?.lead?.id;

  if (known) {
    try {
      await sendWithStatusFallback(
        payload,
        (body) => updateGetLead(client, known, body),
        orgId,
        outcome,
      );
      return { leadId: known, created: false, statusRejected: outcome.statusRejected === true };
    } catch (error) {
      // The lead was deleted in GetLead. Fall through and re-establish it rather
      // than failing on the same dead id forever.
      if (!isGetLeadNotFound(error)) throw error;
      log.info("GetLead lead %s is gone; re-matching by identifier", known);
    }
  }

  try {
    const matched = await sendWithStatusFallback(
      payload,
      (body) => updateGetLeadByIdentifier(client, { phone_number: phone }, body),
      orgId,
      outcome,
    );
    if (typeof matched === "string") {
      await writeGetLeadId(holder, matched);
      return { leadId: matched, created: false, statusRejected: outcome.statusRejected === true };
    }
  } catch (error) {
    if (!isGetLeadNotFound(error)) throw error;
  }

  const created = await sendWithStatusFallback(
    payload,
    (body) => createGetLead(client, body),
    orgId,
    outcome,
  );
  if (typeof created === "string") await writeGetLeadId(holder, created);
  return {
    leadId: typeof created === "string" ? created : undefined,
    created: true,
    statusRejected: outcome.statusRejected === true,
  };
}

/**
 * Handles one queued GetLead trigger. Reached through `processIntegration`.
 *
 * Throws on failure so BullMQ retries — GetLead jobs are enqueued with
 * `GETLEAD_JOB_OPTIONS`, which is what turns a 429 into a delayed retry instead
 * of a lost lead.
 */
export async function processGetLead(
  integration: Integration,
  triggerKey: string,
  data: GetLeadSource,
  orgId: string,
  rateupContactId?: string,
  rateupLeadId?: string,
) {
  const credential = getGetLeadCredential(integration);
  if (!credential.apiKey) return;

  if (!isGetLeadTriggerEnabled(credential, triggerKey)) {
    log.info("GetLead trigger %s is not subscribed for org %s", triggerKey, orgId);
    return;
  }

  const phone = toGetLeadPhone(data.phone);
  if (!phone) {
    // GetLead requires a valid phone, so there is nothing to send. Skipped
    // rather than failed: retrying cannot conjure a number, and a failed job
    // would retry four more times to no purpose.
    //
    // This is routine, not exceptional. Instagram and Messenger contacts are
    // created from an igsId/psid with no phone at all, so every lead from a DM
    // lands here. The source is logged because "which channel" is the first
    // question when an org asks why its leads are not in GetLead.
    log.info(
      "Skipping GetLead sync for org %s: lead from %s has no usable phone number",
      orgId,
      data.leadSource ?? "an unknown source",
    );
    await recordIntegrationSyncActivity(rateupLeadId, "INTEGRATION_SKIPPED", "GetLead", {
      skipReason: "NO_PHONE",
      ...(data.leadSource && { sourceLabel: data.leadSource }),
    });
    return;
  }

  const client = createGetLeadAxios(credential.apiKey, credential.baseUrl);
  const payload = buildGetLeadPayload(data, credential, phone);
  const holder = resolveHolder(rateupContactId, rateupLeadId);

  switch (triggerKey) {
    case GetLeadTriggers.LEAD_CREATE:
    case GetLeadTriggers.LEAD_UPDATE: {
      const { leadId, created, statusRejected } = await pushLead(
        client,
        payload,
        phone,
        holder,
        orgId,
      );
      log.info("GetLead lead %s synced for org %s", leadId, orgId);
      await recordIntegrationSyncActivity(rateupLeadId, "INTEGRATION_SYNCED", "GetLead", {
        ...(leadId && { externalId: leadId }),
        externalCreated: created,
        ...(statusRejected && { statusRejected: true }),
        ...(data.stageName && { toStageName: data.stageName }),
      });
      return;
    }

    case GetLeadTriggers.NOTE_CREATE: {
      if (!data.notes) return;
      // Ensures the lead exists before the note is hung off it; the id is cached
      // by then, so this is a PATCH in the steady state rather than an extra
      // round trip against the rate limit.
      const { leadId } = await pushLead(client, payload, phone, holder, orgId);
      if (leadId) {
        await createGetLeadNote(client, leadId, { content: data.notes });
      }
      return;
    }

    default:
      log.warn("Unknown GetLead trigger %s", triggerKey);
  }
}

/** Records what GetLead said is left of the org's budget, for the pre-emptive check. */
export function noteRateLimit(orgId: string, headers: unknown) {
  const { limit, remaining } = readRateLimit(headers);
  if (remaining !== undefined) {
    log.debug("GetLead budget for org %s: %s/%s remaining", orgId, remaining, limit ?? "?");
  }
  return { limit, remaining };
}

/** The configurable half of the credential — everything but the key itself. */
export async function getGetLeadSettings(orgId: string) {
  const integration = await getGetLeadIntegration(orgId);
  if (!integration) {
    throw new GetLeadConnectionError("GetLead is not connected for this organisation.", 404);
  }

  const credential = getGetLeadCredential(integration);
  return {
    stageMappings: credential.stageMappings ?? [],
    defaults: credential.defaults ?? {},
    triggerSubscriptions: credential.triggerSubscriptions ?? [],
  };
}

/**
 * Saves mappings, defaults and trigger toggles.
 *
 * Goes through `mergeGetLeadCredential` rather than the generic integration
 * update, which assigns the whole `credential` column and would drop the API key
 * along with everything else this does not mention (§5.2).
 */
export async function saveGetLeadSettings(
  orgId: string,
  patch: Pick<GetLeadCredential, "stageMappings" | "defaults" | "triggerSubscriptions">,
) {
  const integration = await getGetLeadIntegration(orgId);
  if (!integration) {
    throw new GetLeadConnectionError("GetLead is not connected for this organisation.", 404);
  }

  // Every mapped column must be one of this org's own.
  //
  // The ids arrive from the client and are only shape-checked by the schema, so
  // without this an org could map a column belonging to someone else — and an
  // inbound status change would then move its lead onto a board it has no part
  // in. Rejected rather than filtered out, because a mapping that silently did
  // not save would be worse than an error.
  if (patch.stageMappings?.length) {
    const owned = await prisma.pipelineStage.count({
      where: {
        id: { in: patch.stageMappings.map((m) => m.stageId) },
        pipeline: { orgId },
      },
    });
    const distinct = new Set(patch.stageMappings.map((m) => m.stageId)).size;
    if (owned !== distinct) {
      throw new GetLeadConnectionError(
        "A mapped column does not belong to this organisation.",
        400,
      );
    }
  }

  const credential = await mergeGetLeadCredential(orgId, patch);
  return {
    stageMappings: credential.stageMappings ?? [],
    defaults: credential.defaults ?? {},
    triggerSubscriptions: credential.triggerSubscriptions ?? [],
  };
}
