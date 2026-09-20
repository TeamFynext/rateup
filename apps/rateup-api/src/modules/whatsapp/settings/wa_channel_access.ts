import prisma from "../../../utils/prisma.js";
import type { Actor } from "../../../authz/actor.js";
import { channelIdentifierSpellings } from "../../../utils/channelIdentifier.js";

/**
 * Team-scoped channel visibility.
 *
 * A team either reaches every channel in the org (`Team.allChannels`, the default) or only the
 * channels explicitly linked through `Team.whatsappChannels`. A user's scope is the *union* across
 * every team they belong to — there is no "acting as team" concept in this product, so belonging to
 * a team can only ever widen access, never narrow it.
 *
 * Users who belong to no team at all fall back to full access. Scoping is opt-in per team; hiding
 * every channel from team-less users (org admins, freshly invited members) would be a regression,
 * and an admin who wants someone scoped can put them in a scoped team.
 *
 * This drives what the dashboard *shows*, not what the API *allows* — the endpoints themselves
 * remain open to any authenticated member of the org.
 */

/** When `all` is true the team reaches every channel and `ids` is meaningless (and empty). */
export interface ChannelScope {
  all: boolean;
  ids: Set<string>;
}

const SCOPE_ALL: ChannelScope = { all: true, ids: new Set() };

const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 5_000;
const scopeCache = new Map<string, { expiresAt: number; scope: ChannelScope }>();

/**
 * Drops cached scopes. Call after any write that changes team membership or channel assignment,
 * otherwise the change takes up to CACHE_TTL_MS to show up.
 */
export function invalidateChannelAccessCache(orgId?: string) {
  if (!orgId) {
    scopeCache.clear();
    return;
  }
  for (const key of scopeCache.keys()) {
    if (key.startsWith(`${orgId}:`)) scopeCache.delete(key);
  }
}

async function computeScope(actor: Actor): Promise<ChannelScope> {
  if (actor.scope.all) return SCOPE_ALL;

  // Not in any team — scoping was never applied to this user.
  if (actor.scope.teamIds.length === 0) return SCOPE_ALL;

  const teams = await prisma.team.findMany({
    where: { orgId: actor.orgId, id: { in: [...actor.scope.teamIds] } },
    select: { allChannels: true, channelAccess: { select: { channelId: true } } },
  });

  // Any unscoped team widens the union to everything.
  if (teams.some((team) => team.allChannels)) return SCOPE_ALL;

  const ids = new Set<string>();
  for (const team of teams) {
    for (const grant of team.channelAccess) ids.add(grant.channelId);
  }
  return { all: false, ids };
}

/**
 * The scope expressed as `WaMessage.sourceIdentifier` values, for querying conversations.
 *
 * That column holds a heterogeneous union — the WA display phone (both `+`-prefixed and stripped,
 * depending on whether the row came from the webhook or the send queue), the Instagram `ibaId`, and
 * the Facebook `fbPageId`. It never holds `WhatsappSettings.id`, so the scope's ids have to be
 * resolved to identifiers before they are any use here.
 *
 * `identifiers` is empty only when the team is scoped to zero channels — callers must treat that as
 * "match nothing", not as "no filter".
 */
export async function getScopedSourceIdentifiers(
  actor: Actor,
): Promise<{ all: boolean; identifiers: string[] }> {
  const scope = await getChannelScope(actor);
  if (scope.all) return { all: true, identifiers: [] };

  const channels = await prisma.whatsappSettings.findMany({
    where: { orgId: actor.orgId, id: { in: Array.from(scope.ids) } },
    select: { phone: true, ibaId: true, fbPageId: true },
  });

  // Every spelling of the number, not just the two this used to list. `phone` is a
  // display string (`+9655-033-4145`) while messages hold several spellings of
  // that same number, and the missing ones were not matched — so an agent scoped
  // to a channel silently lost whole stretches of their own inbox. Instagram and
  // Facebook ids are opaque and contribute only themselves.
  const identifiers = new Set<string>();
  for (const channel of channels) {
    for (const spelling of channelIdentifierSpellings(channel.phone)) {
      identifiers.add(spelling);
    }
    for (const value of [channel.ibaId, channel.fbPageId]) {
      if (value) identifiers.add(value);
    }
  }
  return { all: false, identifiers: Array.from(identifiers) };
}

export async function getChannelScope(actor: Actor): Promise<ChannelScope> {
  if (actor.scope.all) return SCOPE_ALL;
  const cacheKey = `${actor.orgId}:${actor.userId ?? actor.principal.kind}`;
  const cached = scopeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.scope;

  const scope = await computeScope(actor);

  // Cheap bound: the cache is a latency optimisation, not a correctness requirement.
  if (scopeCache.size >= CACHE_MAX_ENTRIES) scopeCache.clear();
  scopeCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, scope });

  return scope;
}
