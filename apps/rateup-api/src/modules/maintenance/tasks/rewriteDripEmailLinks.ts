import { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import type { TaskContext, TaskOutcome } from "../task.js";

/**
 * Dashboard addresses renamed on 2026-10-30, old prefix → new. The old ones still redirect,
 * so this is about links reading right, not working. Each matches a whole path segment, and
 * a more specific entry is listed before the one it would otherwise fall under.
 */
const RENAMED: [from: string, to: string][] = [
  ["/dashboard/journeys", "/dashboard/automation/journeys"],
  ["/dashboard/chatbots", "/dashboard/automation/journeys"],
  ["/dashboard/campaign", "/dashboard/campaigns"],
  ["/dashboard/pipeline", "/dashboard/pipelines"],
  ["/dashboard/contacts/groups", "/dashboard/contacts/audiences"],
  ["/dashboard/settings/account", "/dashboard/settings/profile"],
  ["/dashboard/settings/security", "/dashboard/settings/password"],
  ["/dashboard/settings/team", "/dashboard/settings/teams"],
  ["/dashboard/loyalty/customers", "/dashboard/loyalty/members"],
  ["/dashboard/loyalty/dashboard", "/dashboard/loyalty/overview"],
  ["/dashboard/whatsapp/conversational-components", "/dashboard/whatsapp/ice-breakers"],
  ["/dashboard/features", "/dashboard/customize-menu"],
  ["/dashboard/analytics/call-history", "/dashboard/inbox/calls"],
  ["/dashboard/analytics/calls", "/dashboard/inbox/calls"],
  ["/dashboard/testimonial", "/dashboard/surveys/testimonials"],
];

/** Inbox tab values renamed with their labels. */
const INBOX_TABS: Record<string, string> = {
  new: "unassigned",
  mine: "assigned",
  favourites: "starred",
};

/** The new address for a link, or the link unchanged. Full https links are left alone. */
export function rewriteDashboardPath(path: string): string {
  if (!path.startsWith("/dashboard")) return path;
  const cut = path.search(/[?#]/);
  let pathname = cut === -1 ? path : path.slice(0, cut);
  let rest = cut === -1 ? "" : path.slice(cut);

  const segmentMatch = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

  // Rules moved under the Automation group; /automation/<id> was a rule.
  if (
    segmentMatch("/dashboard/automation") &&
    !/^\/dashboard\/automation\/(rules|journeys)(\/|$)/.test(pathname)
  ) {
    pathname = `/dashboard/automation/rules${pathname.slice("/dashboard/automation".length)}`;
  } else {
    const hit = RENAMED.find(([from]) => segmentMatch(from));
    if (hit) pathname = hit[1] + pathname.slice(hit[0].length);
  }

  if (pathname === "/dashboard/inbox" && rest.startsWith("?")) {
    rest = rest.replace(
      /([?&]tab=)(new|mine|favourites)(?=&|#|$)/,
      (_, key: string, tab: string) => key + INBOX_TABS[tab],
    );
  }
  return pathname + rest;
}

interface SavedLinks {
  cta?: { path?: unknown };
  highlights?: { path?: unknown }[];
}

/** The saved email with its links rewritten, and which links changed. */
function rewriteEmail(email: SavedLinks): { email: SavedLinks; changed: string[] } {
  const changed: string[] = [];
  const fix = (path: unknown) => {
    if (typeof path !== "string") return path;
    const next = rewriteDashboardPath(path);
    if (next !== path) changed.push(`${path} → ${next}`);
    return next;
  };
  return {
    email: {
      ...email,
      ...(email.cta && { cta: { ...email.cta, path: fix(email.cta.path) } }),
      ...(Array.isArray(email.highlights) && {
        highlights: email.highlights.map((h) =>
          h.path === undefined ? h : { ...h, path: fix(h.path) },
        ),
      }),
    },
    changed,
  };
}

/**
 * Staff-edited onboarding emails keep whatever links were typed into them, so a link saved
 * before the renames still points at an old address. Rewrites those links in place; the rest
 * of each email is left exactly as saved. Steps with no saved wording send the catalogue's,
 * which already uses the new addresses.
 */
export async function rewriteDripEmailLinks({ apply, log }: TaskContext): Promise<TaskOutcome> {
  const rows = await prisma.dripStepSetting.findMany({
    where: { email: { not: Prisma.DbNull } },
    select: { key: true, email: true },
  });

  const updated: string[] = [];
  for (const row of rows) {
    if (!row.email || typeof row.email !== "object") continue;
    const { email, changed } = rewriteEmail(row.email as SavedLinks);
    if (changed.length === 0) continue;
    for (const line of changed) log(`${row.key}: ${line}`);
    updated.push(row.key);
    if (apply) {
      await prisma.dripStepSetting.update({
        where: { key: row.key },
        data: { email: email as Prisma.InputJsonValue },
      });
    }
  }

  return {
    summary: `${apply ? "Updated" : "Would update"} ${updated.length} of ${rows.length} edited emails`,
    details: { edited: rows.length, updated: updated.length, keys: updated },
  };
}
