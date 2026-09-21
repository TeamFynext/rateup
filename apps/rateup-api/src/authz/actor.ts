import prisma from "../utils/prisma.js";
import redis from "../utils/redisConnection.js";
import { log } from "../utils/logger.js";
import { WaAssignedChatPermission } from "../types/enums.js";
import type { Permission } from "./permissions.js";
import { effectivePermissions } from "./overrides.js";
import { permissionsFor, teamScopeFor, type Principal } from "./principal.js";
import {
  isRoleKey,
  legacyRoleToKey,
  ROLES,
  type LegacyRole,
  type RoleKey,
  type TeamScope,
} from "./roles.js";

/**
 * Which conversations an actor sees inside its teams. Derived from the org's
 * `waAssignedChatPermission` setting, which stays the customer's to choose.
 */
export type InboxScope = "all" | "own_teams" | "assigned_only";

export interface ActorScope {
  /** Every team in the org. `teamIds` is empty and meaningless when this is true. */
  all: boolean;
  teamIds: readonly string[];
  inbox: InboxScope;
}

export interface Actor {
  principal: Principal;
  orgId: string;
  userId?: string;
  roleKey?: RoleKey;
  permissions: ReadonlySet<Permission>;
  scope: ActorScope;
  can(permission: Permission): boolean;
}

export const ACTOR_CACHE_TTL_SECONDS = 60;

const cacheKey = (userId: string, orgId: string) => `authz:${userId}:${orgId}`;

interface Membership {
  roleKey: RoleKey;
  teamIds: string[];
  inboxPolicy: string;
  grants: string[];
  denies: string[];
}

/**
 * Under the `Admins` policy today's ADMIN sees every assigned conversation while a MEMBER
 * sees only their own. `inbox.manage` is what separates those two roles, so it draws the
 * same line without naming a role.
 */
export function inboxScopeFor(
  teamScope: TeamScope,
  inboxPolicy: string,
  permissions: ReadonlySet<Permission>,
): InboxScope {
  if (teamScope === "ALL") return "all";
  switch (inboxPolicy) {
    case WaAssignedChatPermission.TeamMembers:
      return "own_teams";
    case WaAssignedChatPermission.Admins:
      return permissions.has("inbox.manage") ? "all" : "assigned_only";
    default:
      return "all";
  }
}

export function buildActor(
  principal: Principal,
  extra: {
    teamIds?: readonly string[];
    inboxPolicy?: string;
    grants?: readonly string[];
    denies?: readonly string[];
  } = {},
): Actor {
  const permissions =
    principal.kind === "user"
      ? effectivePermissions(principal.roleKey, extra.grants, extra.denies)
      : permissionsFor(principal);
  const teamScope = teamScopeFor(principal);
  const all = teamScope === "ALL";
  const scope: ActorScope = {
    all,
    teamIds: all ? [] : [...(extra.teamIds ?? [])],
    inbox: inboxScopeFor(teamScope, extra.inboxPolicy ?? WaAssignedChatPermission.All, permissions),
  };
  return {
    principal,
    orgId: principal.orgId,
    userId: principal.kind === "user" ? principal.userId : undefined,
    roleKey: principal.kind === "user" ? principal.roleKey : undefined,
    permissions,
    scope,
    can: (permission) => permissions.has(permission),
  };
}

async function cacheGet(key: string): Promise<Membership | null> {
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as Membership) : null;
  } catch (err) {
    log.warn({ err, key }, "authz cache read failed; reading membership from Postgres");
    return null;
  }
}

async function cacheSet(key: string, membership: Membership): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(membership), "EX", ACTOR_CACHE_TTL_SECONDS);
  } catch (err) {
    log.warn({ err, key }, "authz cache write failed");
  }
}

async function loadMembership(userId: string, orgId: string): Promise<Membership | null> {
  const key = cacheKey(userId, orgId);
  const cached = await cacheGet(key);
  if (cached) return cached;

  const member = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: {
      role: true,
      roleKey: true,
      permissionGrants: true,
      permissionDenies: true,
      org: { select: { ownerId: true, waAssignedChatPermission: true } },
    },
  });
  if (!member) return null;

  const roleKey = resolveRoleKey(member, member.org.ownerId === userId);
  // Team ids are filtered through the team's org: a user in several orgs must not carry
  // one org's teams into another.
  const teamIds =
    ROLES[roleKey].teamScope === "ALL"
      ? []
      : (
          await prisma.teamMember.findMany({
            where: { userId, team: { orgId } },
            select: { teamId: true },
          })
        ).map((row) => row.teamId);

  const membership: Membership = {
    roleKey,
    teamIds,
    inboxPolicy: member.org.waAssignedChatPermission,
    grants: member.permissionGrants ?? [],
    denies: member.permissionDenies ?? [],
  };
  await cacheSet(key, membership);
  return membership;
}

/** `roleKey` once the data migration has written it; the legacy column until then. */
export function resolveRoleKey(
  member: { role: string; roleKey?: string | null },
  isOwner: boolean,
): RoleKey {
  if (member.roleKey && isRoleKey(member.roleKey)) return member.roleKey;
  return legacyRoleToKey(member.role as LegacyRole, isOwner);
}

/** The actor for a signed-in user, or null when they are not a member of the org. */
export async function loadActor(userId: string, orgId: string): Promise<Actor | null> {
  const membership = await loadMembership(userId, orgId);
  if (!membership) return null;
  return buildActor(
    { kind: "user", userId, orgId, roleKey: membership.roleKey },
    {
      teamIds: membership.teamIds,
      inboxPolicy: membership.inboxPolicy,
      grants: membership.grants,
      denies: membership.denies,
    },
  );
}

/** Call after a role, team membership or ownership change so the next request sees it. */
export async function bustActor(userId: string, orgId: string): Promise<void> {
  try {
    await redis.del(cacheKey(userId, orgId));
  } catch (err) {
    log.warn({ err, userId, orgId }, "authz cache bust failed");
  }
}

/** Call after an org-wide change (inbox policy, channel scope of a team). */
export async function bustActorsForOrg(orgId: string): Promise<void> {
  try {
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", `authz:*:${orgId}`, "COUNT", 200);
      cursor = next;
      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== "0");
  } catch (err) {
    log.warn({ err, orgId }, "authz org cache bust failed");
  }
}

/** Call when a user is deleted or deactivated; their memberships across every org go stale. */
export async function bustActorsForUser(userId: string): Promise<void> {
  try {
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", `authz:${userId}:*`, "COUNT", 200);
      cursor = next;
      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== "0");
  } catch (err) {
    log.warn({ err, userId }, "authz user cache bust failed");
  }
}
