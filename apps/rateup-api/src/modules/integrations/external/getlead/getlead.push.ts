import type { Integration } from "../../../../../generated/prisma/client.js";
import prisma from "../../../../utils/prisma.js";
import { log } from "../../../../utils/logger.js";
import type { ProviderJobData } from "../../providers/integrationProvider.types.js";
import { recordIntegrationSyncActivity } from "../integrationActivity.js";
import {
  createGetLead,
  createGetLeadAxios,
  createGetLeadNote,
  updateGetLead,
  updateGetLeadByIdentifier,
} from "./getlead.client.js";
import {
  getGetLeadCredential,
  GetLeadTriggers,
  isGetLeadNotFound,
  isInvalidStatusTransition,
  type GetLeadWritePayload,
} from "./getlead.types.js";
import {
  buildGetLeadPayload,
  isGetLeadTriggerEnabled,
  toGetLeadPhone,
  type GetLeadSource,
} from "./getlead.utils.js";

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
 * The provider's `processJob`: runs one queued GetLead trigger.
 *
 * Throws on failure so BullMQ retries — GetLead jobs are enqueued with
 * `GETLEAD_JOB_OPTIONS`, which is what turns a 429 into a delayed retry instead
 * of a lost lead.
 */
export async function processGetLeadJob(integration: Integration, job: ProviderJobData) {
  const { triggerKey, orgId, rateupContactId, rateupLeadId } = job;
  const data = job.data as GetLeadSource;
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
