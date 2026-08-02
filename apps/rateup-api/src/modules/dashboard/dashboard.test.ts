import { beforeEach, describe, expect, test, vi } from "vitest";

// No dayjs.extend(utc) here any more: the service's only use of the utc plugin was
// inside the last-login backfill, which is gone with 23.3/23.4, so the module no
// longer depends on a plugin another module happens to register. See issues.txt 23.7.

vi.mock("../../utils/prisma.js", () => ({
  default: { $queryRaw: vi.fn(), team: { findFirst: vi.fn() } },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import prisma from "../../utils/prisma.js";
import { getActiveSurveyStats, getOverallStats, getTeamMemberStats } from "./dashboard.service.js";
import {
  getActiveSurveyStatsHandler,
  getOverallStatsHandler,
  getTeamMemberStatsHandler,
} from "./dashboard.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as { $queryRaw: Mock; team: Record<string, Mock> };

const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const TEAM = "33333333-3333-4333-8333-333333333333";

/// The SQL text and the bound values of a $queryRaw tagged-template call.
function query(index = 0) {
  const [strings, ...values] = db.$queryRaw.mock.calls[index];
  return { sql: (strings as string[]).join("?"), values };
}

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function request(over: Record<string, unknown> = {}): any {
  return { user: { orgId: ORG, userId: USER }, params: {}, query: {}, body: {}, ...over };
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

interface MemberFixture {
  id: string;
  name: string;
  email: string;
  profilePhoto: string | null;
  role: string;
  status: string;
  lastLoggedInAt: string;
  assignedTicketsCount: number;
  assignedChatsCount: number;
}

function member(over: Record<string, unknown> = {}) {
  const base: MemberFixture = {
    id: USER,
    name: "Ann",
    email: "ann@example.test",
    profilePhoto: null,
    role: "ADMIN",
    status: "online",
    lastLoggedInAt: "2026-03-01T00:00:00.000Z",
    assignedTicketsCount: 3,
    assignedChatsCount: 5,
  };
  return { ...base, ...over };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.$queryRaw.mockResolvedValue([]);
  db.team.findFirst.mockResolvedValue({ id: TEAM });
});

// ===========================================================================
// getOverallStats
// ===========================================================================

describe("getOverallStats", () => {
  test("binds the org into every count and the user into the team count", async () => {
    db.$queryRaw.mockResolvedValue([{ newChatCount: 1 }]);

    await getOverallStats(ORG, USER);

    const { values } = query();
    expect(values.filter((v) => v === ORG)).toHaveLength(8);
    expect(values).toContain(USER);
  });

  test("returns the single aggregate row", async () => {
    db.$queryRaw.mockResolvedValue([{ newChatCount: 4, ticketCount: 2 }]);

    expect(await getOverallStats(ORG, USER)).toEqual({ newChatCount: 4, ticketCount: 2 });
  });

  test("counts only chats and tickets from the last twenty-four hours", async () => {
    await getOverallStats(ORG, USER);

    const { sql } = query();
    expect(sql).toContain(`"lastReceivedMessageTimeStamp" > NOW() - INTERVAL '24 hours'`);
    expect(sql).toContain(`tc."createdAt" > NOW() - INTERVAL '24 hours'`);
  });

  test("scopes campaigns and tickets to the org through their team", async () => {
    await getOverallStats(ORG, USER);

    const { sql } = query();
    expect(sql).toContain(`JOIN "Team" t ON cp."teamId" = t.id`);
    expect(sql).toContain(`JOIN "Team" t ON tbt."teamId" = t.id`);
  });

  // The headline defect of the module: the query counted `FROM "LoyaltyCustomer"`,
  // a table migration 20260120044921_new_loyalty dropped in the loyalty rewrite.
  // Postgres resolves relations for the whole statement before executing any of
  // it, so `relation "LoyaltyCustomer" does not exist` took every tile on the
  // dashboard down together, not just the loyalty one. See issues.txt 23.1.
  test("counts loyalty customers through the table the rewrite left behind", async () => {
    await getOverallStats(ORG, USER);

    const { sql } = query();
    expect(sql).not.toContain(`"LoyaltyCustomer"`);
    expect(sql).toContain(`FROM "CustomerLoyaltyAccount" cla JOIN "LoyaltyProgram" lp`);
    expect(sql).toContain(`lp."orgId" =`);
  });

  test("selects the teamsCount the return type declares", async () => {
    await getOverallStats(ORG, USER);

    expect(query().sql).toContain(`AS "teamsCount"`);
  });

  // An aggregate of scalar sub-selects always returns exactly one row, so the
  // fallback is unreachable today — but nothing guarded it and the declared return
  // type promised an object. See issues.txt 23.6.
  test("returns a zeroed shape rather than undefined for an empty result", async () => {
    db.$queryRaw.mockResolvedValue([]);

    expect(await getOverallStats(ORG, USER)).toMatchObject({
      newChatCount: 0,
      teamsCount: 0,
      ticketCount: 0,
    });
  });
});

// ===========================================================================
// getActiveSurveyStats
// ===========================================================================

describe("getActiveSurveyStats", () => {
  test("scopes the surveys to the teams the caller belongs to", async () => {
    await getActiveSurveyStats(USER);

    const { sql, values } = query();
    expect(sql).toContain(`WHERE tm."userId" =`);
    expect(values).toContain(USER);
  });

  test("counts only active surveys", async () => {
    await getActiveSurveyStats(USER);

    expect(query().sql).toContain(`s."active" = TRUE`);
  });

  test("counts distinct responses so the joins cannot inflate them", async () => {
    await getActiveSurveyStats(USER);

    expect(query().sql).toContain(`COUNT(DISTINCT sr.id)`);
  });

  test("returns at most ten of each survey type", async () => {
    await getActiveSurveyStats(USER);

    const { sql } = query();
    expect(sql.match(/LIMIT 10/g)).toHaveLength(2);
    expect(sql).toContain("UNION ALL");
  });

  test("returns the rows the query produced", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "s1", responseCount: 3 }]);

    expect(await getActiveSurveyStats(USER)).toEqual([{ id: "s1", responseCount: 3 }]);
  });

  // The ORDER BY used to live inside the CTE, with neither branch of the UNION ALL
  // ordering what it selected from it. Postgres does not guarantee a subquery's
  // ordering survives into the outer query, so "the ten most recent of each type"
  // held only by accident of the plan. Each branch orders alongside its own LIMIT
  // now. See issues.txt 23.5.
  test("orders inside each branch of the union, next to its LIMIT", async () => {
    await getActiveSurveyStats(USER);

    const { sql } = query();
    expect(sql.match(/ORDER BY "createdAt" DESC LIMIT 10/g)).toHaveLength(2);
    expect(sql.indexOf("ORDER BY")).toBeGreaterThan(sql.indexOf("filtered_surveys AS"));
  });
});

// ===========================================================================
// getTeamMemberStats
// ===========================================================================

describe("getTeamMemberStats", () => {
  // The query used to filter on the path's team id ALONE — no org in this function,
  // its handler or its route — so a team id was enough for a user of any
  // organisation to read that team's roster: names, EMAIL ADDRESSES, roles,
  // last-login times, workloads and who was online. See issues.txt 23.2.
  test("filters on the org as well as the team", async () => {
    await getTeamMemberStats(TEAM, ORG);

    const { sql, values } = query();
    expect(sql).toContain(`WHERE tm."teamId" =`);
    expect(sql).toContain(`t."orgId" =`);
    expect(values).toContain(ORG);
  });

  test("refuses a team belonging to another org before reading anything", async () => {
    db.team.findFirst.mockResolvedValue(null);

    expect(await getTeamMemberStats("team-another-org", ORG)).toBeNull();
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  test("checks the team against the org it was asked for", async () => {
    await getTeamMemberStats(TEAM, ORG);

    expect(db.team.findFirst.mock.calls[0][0].where).toEqual({ id: TEAM, orgId: ORG });
  });

  // The OrgMember join carried no org either, so a user who belongs to several
  // organisations could have their role and availability read from the wrong one.
  test("reads the role and status from the caller's own org membership", async () => {
    await getTeamMemberStats(TEAM, ORG);

    expect(query().sql).toContain(`orm."orgId" =`);
  });

  test("returns each member's identity, role and workload", async () => {
    db.$queryRaw.mockResolvedValue([member()]);

    const [row] = (await getTeamMemberStats(TEAM, ORG))!;

    expect(row).toMatchObject({
      email: "ann@example.test",
      role: "ADMIN",
      assignedTicketsCount: 3,
      assignedChatsCount: 5,
    });
  });

  test("derives isOnline from the org member's availability status", async () => {
    db.$queryRaw.mockResolvedValue([member({ status: "online" }), member({ status: "away" })]);

    const rows = (await getTeamMemberStats(TEAM, ORG))!;

    expect(rows.map((r) => r.isOnline)).toEqual([true, false]);
  });

  test("returns an empty list for a team of the caller's org with no members", async () => {
    expect(await getTeamMemberStats(TEAM, ORG)).toEqual([]);
  });

  // The declared return type is `(TeamMember & { isOnline: boolean })[] | null`, so
  // the rows describe themselves and these tests no longer have to cast past an
  // intersection-with-an-array. See issues.txt 23.6.
  test("hands back rows the declared return type describes", async () => {
    db.$queryRaw.mockResolvedValue([member()]);

    const rows = (await getTeamMemberStats(TEAM, ORG))!;

    expect(rows[0].email).toBe("ann@example.test");
    expect(rows[0].isOnline).toBe(true);
  });

  // It used to backfill lastLoggedInAt from SuperTokens inside the GET: one
  // session-list call per member plus one per handle plus a prisma write, all
  // sequential, repeated on every page load — and the write NULLED the timestamp of
  // any member whose sessions had expired, destroying the only record of when they
  // were last active. The endpoint is read-only now. See issues.txt 23.3 and 23.4.
  test("reports the stored last-login as it is, old or absent", async () => {
    db.$queryRaw.mockResolvedValue([
      member({ id: "u1", lastLoggedInAt: "2019-05-01T00:00:00.000Z" }),
      member({ id: "u2", lastLoggedInAt: null }),
    ]);

    const rows = (await getTeamMemberStats(TEAM, ORG))!;

    expect(rows.map((r) => r.lastLoggedInAt)).toEqual(["2019-05-01T00:00:00.000Z", null]);
  });

  test("makes no SuperTokens call and writes nothing", async () => {
    db.$queryRaw.mockResolvedValue([member({ lastLoggedInAt: null })]);

    await getTeamMemberStats(TEAM, ORG);

    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/modules/dashboard/dashboard.service.ts", "utf8"),
    );
    expect(source).not.toContain("supertokens-node");
    expect(source).not.toContain("updateLastLoggedInTime");
  });

  // The backfill was the module's only use of the dayjs utc plugin, which it never
  // registered — it worked only because survey.service.ts and response.service.ts
  // happened to extend the shared singleton first. Both are gone. issues.txt 23.7.
  test("no longer depends on a dayjs plugin another module registers", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/modules/dashboard/dashboard.service.ts", "utf8"),
    );

    expect(source).not.toContain("dayjs");
  });
});

// ===========================================================================
// The handlers
// ===========================================================================

describe("the dashboard handlers", () => {
  test("overall stats come from the session's org and user", async () => {
    db.$queryRaw.mockResolvedValue([{ newChatCount: 1 }]);
    const rep = reply();

    await getOverallStatsHandler(request(), rep);

    expect(query().values).toContain(ORG);
    expect(answer(rep)).toEqual({ code: 200, body: { newChatCount: 1 } });
  });

  test("active surveys come from the session's user alone", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "s1" }]);
    const rep = reply();

    await getActiveSurveyStatsHandler(request(), rep);

    expect(query().values).toEqual([USER, "web", "waFlow"]);
    expect(answer(rep).code).toBe(200);
  });

  // The handler used to read only the path parameter — request.user was never
  // touched — so nothing in the request path tied the team to the caller.
  // See issues.txt 23.2.
  test("team stats answer 404 for a team the caller's org does not own", async () => {
    db.team.findFirst.mockResolvedValue(null);
    const rep = reply();

    await getTeamMemberStatsHandler(request({ params: { teamId: "team-another-org" } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { message: "Team not found" } });
  });

  test("team stats pass the session's org to the service", async () => {
    db.$queryRaw.mockResolvedValue([]);
    const rep = reply();

    await getTeamMemberStatsHandler(request({ params: { teamId: TEAM } }), rep);

    expect(db.team.findFirst.mock.calls[0][0].where).toEqual({ id: TEAM, orgId: ORG });
    expect(answer(rep).code).toBe(200);
  });

  // All three catches used to do `reply.code(500).send(e)` with the Error object.
  // An Error has no enumerable own properties, so it serialised to `{}` — a 500
  // with an empty body, which is very likely why 23.1's breakage went unnoticed
  // for six months. See issues.txt 23.6.
  test("every handler answers a failure with a message", async () => {
    db.$queryRaw.mockRejectedValue(new Error(`relation "LoyaltyCustomer" does not exist`));

    const reps = [reply(), reply(), reply()];
    await getOverallStatsHandler(request(), reps[0]);
    await getActiveSurveyStatsHandler(request(), reps[1]);
    await getTeamMemberStatsHandler(request({ params: { teamId: TEAM } }), reps[2]);

    for (const rep of reps) {
      expect(answer(rep)).toEqual({ code: 500, body: { message: "Something went wrong" } });
    }
  });
});
