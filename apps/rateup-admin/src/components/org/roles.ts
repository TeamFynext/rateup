import type { OrgMember } from "@/api/orgs.api";

/** Mirrors `ROLES` in rateup-api `src/authz/roles.ts`: order is most to least access. */
export const ROLE_ORDER = ["OWNER", "ADMIN", "MANAGER", "STAFF", "AGENT", "VIEWER"] as const;

export const ROLE_SUMMARIES: Record<string, string> = {
  OWNER: "Everything, including billing, deleting the organisation and handing it over.",
  ADMIN: "Everything across every team, except deleting or transferring the organisation.",
  MANAGER: "Runs their teams: invites people, manages the inbox, integrations and loyalty.",
  STAFF: "Works in their teams: inbox, campaigns, surveys, flows, contacts and the cashier.",
  AGENT: "Replies in the inbox and serves the loyalty counter for their teams.",
  VIEWER: "Read-only access to their teams' data and analytics.",
};

const rank = (key: string) => {
  const index = ROLE_ORDER.indexOf(key as (typeof ROLE_ORDER)[number]);
  return index === -1 ? ROLE_ORDER.length : index;
};

/** Members bucketed by role, most access first; each bucket keeps the API's order. */
export function groupByRole(members: OrgMember[]) {
  const groups = new Map<string, { key: string; label: string; members: OrgMember[] }>();
  for (const member of members) {
    const group = groups.get(member.roleKey);
    if (group) group.members.push(member);
    else groups.set(member.roleKey, { key: member.roleKey, label: member.role, members: [member] });
  }
  return [...groups.values()].sort((a, b) => rank(a.key) - rank(b.key));
}
