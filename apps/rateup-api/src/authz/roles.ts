import { ALL_PERMISSIONS, type Permission } from "./permissions.js";

export const ROLE_KEYS = ["OWNER", "ADMIN", "MANAGER", "STAFF", "AGENT", "VIEWER"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

/** ALL: every team in the org. OWN_TEAMS: only rows belonging to a team the user is in. */
export type TeamScope = "ALL" | "OWN_TEAMS";

/** The three values `OrgMember.role` holds until the data migration writes `roleKey`. */
export type LegacyRole = "SUPER_ADMIN" | "ADMIN" | "MEMBER";
export const LEGACY_ROLES: readonly LegacyRole[] = ["SUPER_ADMIN", "ADMIN", "MEMBER"];

export interface RoleDefinition {
  key: RoleKey;
  label: string;
  summary: string;
  teamScope: TeamScope;
  permissions: ReadonlySet<Permission>;
}

function set(...permissions: Permission[]): ReadonlySet<Permission> {
  return new Set(permissions);
}

function union(...sets: ReadonlySet<Permission>[]): ReadonlySet<Permission> {
  const out = new Set<Permission>();
  for (const s of sets) for (const p of s) out.add(p);
  return out;
}

function without(base: ReadonlySet<Permission>, ...removed: Permission[]): ReadonlySet<Permission> {
  const out = new Set(base);
  for (const p of removed) out.delete(p);
  return out;
}

const AGENT_PERMISSIONS = set(
  "inbox.read",
  "inbox.reply",
  "inbox.assign",
  "contacts.read",
  "loyalty.read",
  "loyalty.cashier",
  "analytics.read",
  "members.read",
  "teams.read",
  "channels.read",
);

// STAFF is exactly what a legacy MEMBER can do today: every route that has no role guard,
// inside the modules their teams enable. parity.test.ts freezes this against the old guards.
const STAFF_PERMISSIONS = union(
  AGENT_PERMISSIONS,
  set(
    "contacts.manage",
    "campaigns.read",
    "campaigns.manage",
    "campaigns.send",
    "surveys.read",
    "surveys.manage",
    "flows.read",
    "flows.manage",
    "templates.read",
    "templates.manage",
    "automation.read",
    "automation.manage",
    "chatbots.read",
    "meta_agent.read",
    "meta_agent.use",
    "pipelines.read",
    "pipelines.manage",
    "catalog.manage",
    "integrations.read",
  ),
);

// MANAGER is exactly what a legacy ADMIN can do today: STAFF plus the `[SUPER_ADMIN, ADMIN]` routes.
const MANAGER_PERMISSIONS = union(
  STAFF_PERMISSIONS,
  set(
    "inbox.manage",
    "inbox.delete",
    "inbox.export",
    "contacts.export",
    "responses.manage",
    "templates.sync",
    "chatbots.manage",
    "meta_agent.manage",
    "loyalty.manage",
    "loyalty.approve",
    "loyalty.accounts.export",
    "loyalty.accounts.delete",
    "members.invite",
    "teams.manage_members",
    "integrations.manage",
    "integrations.shopify",
    "webhooks.read",
    "webhooks.manage",
    "org.settings",
    "org.webhook_secret",
    "notify.billing",
    "notify.integrations",
  ),
);

// VIEWER is the read-only half of STAFF, so it stays grantable by every team-scoped role.
const VIEWER_PERMISSIONS: ReadonlySet<Permission> = new Set(
  [...STAFF_PERMISSIONS].filter((permission) => permission.endsWith(".read")),
);

const ADMIN_PERMISSIONS = without(ALL_PERMISSIONS, "org.delete", "org.transfer_ownership");

export const ROLES: Record<RoleKey, RoleDefinition> = {
  OWNER: {
    key: "OWNER",
    label: "Owner",
    summary: "Everything, including billing, deleting the organisation and handing it over.",
    teamScope: "ALL",
    permissions: ALL_PERMISSIONS,
  },
  ADMIN: {
    key: "ADMIN",
    label: "Admin",
    summary: "Everything across every team, except deleting or transferring the organisation.",
    teamScope: "ALL",
    permissions: ADMIN_PERMISSIONS,
  },
  MANAGER: {
    key: "MANAGER",
    label: "Manager",
    summary: "Runs their teams: invites people, manages the inbox, integrations and loyalty.",
    teamScope: "OWN_TEAMS",
    permissions: MANAGER_PERMISSIONS,
  },
  STAFF: {
    key: "STAFF",
    label: "Staff",
    summary: "Works in their teams: inbox, campaigns, surveys, flows, contacts and the cashier.",
    teamScope: "OWN_TEAMS",
    permissions: STAFF_PERMISSIONS,
  },
  AGENT: {
    key: "AGENT",
    label: "Agent",
    summary: "Replies in the inbox and serves the loyalty counter for their teams.",
    teamScope: "OWN_TEAMS",
    permissions: AGENT_PERMISSIONS,
  },
  VIEWER: {
    key: "VIEWER",
    label: "Viewer",
    summary: "Read-only access to their teams' data and analytics.",
    teamScope: "OWN_TEAMS",
    permissions: VIEWER_PERMISSIONS,
  },
};

export const ROLE_PERMISSIONS: Record<RoleKey, ReadonlySet<Permission>> = Object.fromEntries(
  ROLE_KEYS.map((key) => [key, ROLES[key].permissions]),
) as Record<RoleKey, ReadonlySet<Permission>>;

/** An invitation that names no role. The old default was ADMIN, which escalated by omission. */
export const DEFAULT_INVITED_ROLE: RoleKey = "STAFF";

export function isRoleKey(value: string): value is RoleKey {
  return (ROLE_KEYS as readonly string[]).includes(value);
}

export function rolesWith(permission: Permission): RoleKey[] {
  return ROLE_KEYS.filter((key) => ROLE_PERMISSIONS[key].has(permission));
}

/**
 * Which stored `OrgMember.role` values carry a permission, for Prisma `where` clauses that
 * pick recipients until `roleKey` exists. SUPER_ADMIN maps through ADMIN, the weaker of its
 * two destinations, and OWNER is a superset of ADMIN, so the answer is right for owners too.
 */
export function legacyRolesWith(permission: Permission): LegacyRole[] {
  return LEGACY_ROLES.filter((role) =>
    ROLE_PERMISSIONS[legacyRoleToKey(role, false)].has(permission),
  );
}

export function legacyRoleToKey(role: LegacyRole, isOwner: boolean): RoleKey {
  switch (role) {
    case "SUPER_ADMIN":
      return isOwner ? "OWNER" : "ADMIN";
    case "ADMIN":
      return "MANAGER";
    case "MEMBER":
      return "STAFF";
  }
}

/** The legacy column keeps being written until the contract migration drops it. */
export function roleKeyToLegacy(key: RoleKey): LegacyRole {
  switch (key) {
    case "OWNER":
    case "ADMIN":
      return "SUPER_ADMIN";
    case "MANAGER":
      return "ADMIN";
    case "STAFF":
    case "AGENT":
    case "VIEWER":
      return "MEMBER";
  }
}
