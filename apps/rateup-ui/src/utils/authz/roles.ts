import { PERMISSIONS, type Permission } from "./permissions.ts";

/**
 * The six system roles. Mirrors `rateup-api/src/authz/roles.ts`; the API's bundles are
 * authoritative and arrive as `permissions` on `/user/info`. `ROLE_PERMISSIONS` here is
 * the fallback while an older API still answers without them, and the source of the
 * roles matrix.
 */
export const ROLE_KEYS = ["OWNER", "ADMIN", "MANAGER", "STAFF", "AGENT", "VIEWER"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];
export type TeamScope = "ALL" | "OWN_TEAMS";

/** The values `OrgMember.role` still carries; older API responses name only these. */
export type LegacyRole = "SUPER_ADMIN" | "ADMIN" | "MEMBER";

function set(...permissions: Permission[]): ReadonlySet<Permission> {
  return new Set(permissions);
}
function union(...sets: ReadonlySet<Permission>[]): ReadonlySet<Permission> {
  const out = new Set<Permission>();
  for (const s of sets) for (const p of s) out.add(p);
  return out;
}

const AGENT = set(
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
const STAFF = union(
  AGENT,
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
const MANAGER = union(
  STAFF,
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
const OWNER: ReadonlySet<Permission> = new Set(PERMISSIONS);
const ADMIN: ReadonlySet<Permission> = new Set(
  PERMISSIONS.filter((p) => p !== "org.delete" && p !== "org.transfer_ownership"),
);
const VIEWER: ReadonlySet<Permission> = new Set([...STAFF].filter((p) => p.endsWith(".read")));

export const ROLE_PERMISSIONS: Record<RoleKey, ReadonlySet<Permission>> = {
  OWNER,
  ADMIN,
  MANAGER,
  STAFF,
  AGENT,
  VIEWER,
};

export const ROLE_TEAM_SCOPE: Record<RoleKey, TeamScope> = {
  OWNER: "ALL",
  ADMIN: "ALL",
  MANAGER: "OWN_TEAMS",
  STAFF: "OWN_TEAMS",
  AGENT: "OWN_TEAMS",
  VIEWER: "OWN_TEAMS",
};

export interface RoleMeta {
  key: RoleKey;
  /** Literal so the translation extractor finds it. */
  label: string;
  summary: string;
  teamScope: TeamScope;
}

/** Labels and one-line summaries, as `t()` keys. Keep them literal for the extractor. */
export const ROLE_META: Record<RoleKey, RoleMeta> = {
  OWNER: {
    key: "OWNER",
    label: "Owner",
    summary: "Everything, including billing, deleting the organisation and handing it over.",
    teamScope: "ALL",
  },
  ADMIN: {
    key: "ADMIN",
    label: "Admin",
    summary: "Everything across every team, except deleting or transferring the organisation.",
    teamScope: "ALL",
  },
  MANAGER: {
    key: "MANAGER",
    label: "Manager",
    summary: "Runs their teams: invites people, manages the inbox, integrations and loyalty.",
    teamScope: "OWN_TEAMS",
  },
  STAFF: {
    key: "STAFF",
    label: "Staff",
    summary: "Works in their teams: inbox, campaigns, surveys, flows, contacts and the cashier.",
    teamScope: "OWN_TEAMS",
  },
  AGENT: {
    key: "AGENT",
    label: "Agent",
    summary: "Replies in the inbox and serves the loyalty counter for their teams.",
    teamScope: "OWN_TEAMS",
  },
  VIEWER: {
    key: "VIEWER",
    label: "Viewer",
    summary: "Read-only access to their teams' data and analytics.",
    teamScope: "OWN_TEAMS",
  },
};

export function isRoleKey(value: string | null | undefined): value is RoleKey {
  return typeof value === "string" && (ROLE_KEYS as readonly string[]).includes(value);
}

/**
 * The role an older API's `role` string implies. SUPER_ADMIN cannot tell owner from admin
 * without `Org.ownerId`, so it lands on ADMIN, the weaker of the two.
 */
export function legacyRoleToKey(role: string | null | undefined): RoleKey | undefined {
  switch (role) {
    case "SUPER_ADMIN":
      return "ADMIN";
    case "ADMIN":
      return "MANAGER";
    case "MEMBER":
      return "STAFF";
    default:
      return undefined;
  }
}

/** What the change-role and invite endpoints still accept beside `roleKey`. */
export function roleKeyToLegacy(key: RoleKey): LegacyRole {
  switch (key) {
    case "OWNER":
    case "ADMIN":
      return "SUPER_ADMIN";
    case "MANAGER":
      return "ADMIN";
    default:
      return "MEMBER";
  }
}

/** Roles whose permissions are a subset of the actor's; OWNER is never granted, only transferred. */
export function grantableRolesFor(permissions: ReadonlySet<string>): RoleKey[] {
  return ROLE_KEYS.filter(
    (key) => key !== "OWNER" && [...ROLE_PERMISSIONS[key]].every((p) => permissions.has(p)),
  );
}
