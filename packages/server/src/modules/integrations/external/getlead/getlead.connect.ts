import { log } from "../../../../utils/logger.js";
import { IntegrationConnectError } from "../../shared/oauthConnectError.js";
import { createGetLeadAxios, getGetLeadMeta } from "./getlead.client.js";
import { getGetLeadIntegration, mergeGetLeadCredential } from "./getlead.credential.js";
import { getleadConnectSchema } from "./getlead.schema.js";
import {
  getGetLeadCredential,
  GetLeadTriggers,
  parseGetLeadError,
  type GetLeadMeta,
} from "./getlead.types.js";
import { createGetLeadInbound } from "./getlead.webhook.js";

/** How stale a cached `GET /meta` may be before a read refreshes it. */
const META_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * The provider's `apiKey.connect`, behind the shared `POST /:name/connect`: the
 * settings form's fields, checked, then {@link connectGetLead}.
 */
export async function connectGetLeadFromForm(
  orgId: string,
  fields: Readonly<Record<string, string>>,
) {
  const parsed = getleadConnectSchema.safeParse(fields);
  if (!parsed.success) {
    throw new IntegrationConnectError(
      parsed.error.issues[0]?.message ?? "That API key is not valid.",
      400,
    );
  }
  return connectGetLead(orgId, parsed.data.apiKey, parsed.data.baseUrl);
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
      throw new IntegrationConnectError("That API key was rejected by GetLead.", 400);
    }
    throw new IntegrationConnectError(
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
    throw new IntegrationConnectError("GetLead is not connected for this organisation.", 404);
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
    throw new IntegrationConnectError(`Could not reach GetLead: ${parsed.message}`, 502);
  }
}
