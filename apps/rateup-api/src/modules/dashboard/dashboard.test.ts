import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { beforeEach, describe, expect, test, vi } from "vitest";

// dashboard.service.ts formats with `dayjs(...).utc()` but never calls
// dayjs.extend(utc) — in the running app the plugin is present only because
// survey.service.ts and response.service.ts happen to register it on the shared
// dayjs singleton first. Loading this service on its own, as these tests do,
// throws "dayjs(...).utc is not a function"; the line below is what the module
// itself should be doing. See issues.txt 23.7.
dayjs.extend(utc);

vi.mock("../../utils/prisma.js", () => ({ default: { $queryRaw: vi.fn() } }));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("supertokens-node/recipe/session/index.js", () => ({
  default: {
    getAllSessionHandlesForUser: vi.fn(),
    getSessionInformation: vi.fn(),
  },
}));

vi.mock("../user/user.service.js", () => ({ updateLastLoggedInTime: vi.fn() }));

import prisma from "../../utils/prisma.js";
import Session from "supertokens-node/recipe/session/index.js";
import { updateLastLoggedInTime } from "../user/user.service.js";
import { getActiveSurveyStats, getOverallStats, getTeamMemberStats } from "./dashboard.service.js";
import {
  getActiveSurveyStatsHandler,
  getOverallStatsHandler,
  getTeamMemberStatsHandler,
} from "./dashboard.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as { $queryRaw: Mock };
const st = Session as unknown as Record<string, Mock>;

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
  st.getAllSessionHandlesForUser.mockResolvedValue([]);
  st.getSessionInformation.mockResolvedValue({ timeCreated: 0 });
  (updateLastLoggedInTime as Mock).mockResolvedValue(undefined);
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

  // NOTE: pins current behaviour, and this is the headline defect of the module.
  // The query counts `FROM "LoyaltyCustomer"`, and migration
  // 20260120044921_new_loyalty runs `DROP TABLE "LoyaltyCustomer"` — the loyalty
  // rewrite replaced it with CustomerLoyaltyAccount. Postgres therefore raises
  // `relation "LoyaltyCustomer" does not exist` for the WHOLE statement, so
  // every tile on the dashboard fails together, not just the loyalty one.
  // See issues.txt 23.1.
  test("counts from a table the loyalty migration dropped", async () => {
    await getOverallStats(ORG, USER);

    const { sql } = query();
    expect(sql).toContain(`FROM "LoyaltyCustomer"`);
    expect(sql).not.toContain(`FROM "CustomerLoyaltyAccount"`);
  });

  // NOTE: the SQL selects a `teamsCount` the OverallStats interface does not
  // declare, and declares `ticketCount` which it does select — so the return type
  // understates the payload by one field. See issues.txt 23.6.
  test("selects a teamsCount the declared return type omits", async () => {
    await getOverallStats(ORG, USER);

    expect(query().sql).toContain(`AS "teamsCount"`);
  });

  // NOTE: an aggregate of scalar sub-selects always returns exactly one row, so
  // this is safe today — but nothing guards it, and the declared return type
  // promises an object. See issues.txt 23.6.
  test("returns undefined rather than a zeroed shape for an empty result", async () => {
    db.$queryRaw.mockResolvedValue([]);

    expect(await getOverallStats(ORG, USER)).toBeUndefined();
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

  // NOTE: the ORDER BY lives inside the CTE, and each branch of the UNION ALL
  // selects from it without its own ORDER BY. Postgres does not guarantee that a
  // subquery's ordering survives into the outer query, so "the ten most recent"
  // is what this usually returns rather than what it promises. There is no
  // ORDER BY on the union either, so the two blocks' relative order is
  // unspecified too. See issues.txt 23.5.
  test("orders inside the CTE and not in either branch of the union", async () => {
    await getActiveSurveyStats(USER);

    const { sql } = query();
    const orderBys = sql.match(/ORDER BY/g) ?? [];
    expect(orderBys).toHaveLength(1);
    expect(sql.indexOf("ORDER BY")).toBeLessThan(sql.indexOf("UNION ALL"));
  });
});

// ===========================================================================
// getTeamMemberStats
// ===========================================================================

describe("getTeamMemberStats", () => {
  // NOTE: pins current behaviour. The team id comes from the path and the query
  // filters on it alone — there is no org anywhere in this function or in its
  // handler, and the route carries only checkSession. Any authenticated user of
  // any org can read any team's roster: names, email addresses, profile photos,
  // roles, last-login times, assigned ticket and chat counts, and who is online.
  // See issues.txt 23.2.
  test("filters on the team id alone, with no org restriction", async () => {
    await getTeamMemberStats(TEAM);

    const { sql, values } = query();
    expect(sql).toContain(`WHERE tm."teamId" =`);
    expect(sql).not.toContain("orgId");
    expect(values).toEqual([TEAM]);
  });

  test("returns each member's identity, role and workload", async () => {
    db.$queryRaw.mockResolvedValue([member()]);

    const [row] = (await getTeamMemberStats(TEAM)) as any[];

    expect(row).toMatchObject({
      email: "ann@example.test",
      role: "ADMIN",
      assignedTicketsCount: 3,
      assignedChatsCount: 5,
    });
  });

  test("derives isOnline from the org member's availability status", async () => {
    db.$queryRaw.mockResolvedValue([member({ status: "online" }), member({ status: "away" })]);

    const rows = (await getTeamMemberStats(TEAM)) as any[];

    expect(rows.map((r: any) => r.isOnline)).toEqual([true, false]);
  });

  test("returns an empty list for a team with no members", async () => {
    expect(await getTeamMemberStats(TEAM)).toEqual([]);
  });

  // NOTE: the signature is `Promise<TeamMember & { isOnline: boolean }[]>`, which
  // TypeScript parses as `TeamMember & ({ isOnline: boolean }[])` — an
  // intersection of the object type with an ARRAY, not an array of the
  // intersection. Indexing the result therefore yields only `{ isOnline: boolean }`
  // and every real field on it is a type error at the call site, which is why
  // these tests have to cast. The parentheses are missing.
  // See issues.txt 23.6.
  test("hands back rows the declared return type cannot describe", async () => {
    db.$queryRaw.mockResolvedValue([member()]);

    const rows = (await getTeamMemberStats(TEAM)) as any[];

    expect(rows[0].email).toBe("ann@example.test");
    expect(rows[0].isOnline).toBe(true);
  });

  test("leaves a recent last-login alone and asks SuperTokens nothing about it", async () => {
    db.$queryRaw.mockResolvedValue([member({ lastLoggedInAt: "2026-03-01T00:00:00.000Z" })]);

    const [row] = (await getTeamMemberStats(TEAM)) as any[];

    expect(row.lastLoggedInAt).toBe("2026-03-01T00:00:00.000Z");
    expect(updateLastLoggedInTime).not.toHaveBeenCalled();
  });

  test("backfills a missing last-login from the newest live session", async () => {
    db.$queryRaw.mockResolvedValue([member({ lastLoggedInAt: null })]);
    st.getAllSessionHandlesForUser.mockResolvedValue(["h1", "h2"]);
    st.getSessionInformation
      .mockResolvedValueOnce({ timeCreated: 1_700_000_000_000 })
      .mockResolvedValueOnce({ timeCreated: 1_800_000_000_000 });

    const [row] = (await getTeamMemberStats(TEAM)) as any[];

    expect(updateLastLoggedInTime).toHaveBeenCalledWith(USER, expect.any(String));
    expect(row.lastLoggedInAt).toBe((updateLastLoggedInTime as Mock).mock.calls[0][1]);
  });

  test("treats a pre-2021 timestamp as needing a backfill", async () => {
    db.$queryRaw.mockResolvedValue([member({ lastLoggedInAt: "2019-05-01T00:00:00.000Z" })]);
    st.getAllSessionHandlesForUser.mockResolvedValue(["h1"]);
    st.getSessionInformation.mockResolvedValue({ timeCreated: 1_800_000_000_000 });

    await getTeamMemberStats(TEAM);

    expect(st.getAllSessionHandlesForUser).toHaveBeenCalledWith(USER);
    expect(updateLastLoggedInTime).toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. When a member has an old timestamp and no live
  // sessions, the second arm of `if (lastLoggedInAt || (user.lastLoggedInAt &&
  // !lastLoggedInAt))` fires and writes NULL — so the backfill DESTROYS the only
  // record of when that user last logged in rather than leaving it be. Anyone
  // who has not signed in since their sessions expired loses the date entirely,
  // and merely opening the dashboard is what does it. See issues.txt 23.3.
  test("erases an old last-login when the member has no live sessions", async () => {
    db.$queryRaw.mockResolvedValue([member({ lastLoggedInAt: "2019-05-01T00:00:00.000Z" })]);
    st.getAllSessionHandlesForUser.mockResolvedValue([]);

    const [row] = (await getTeamMemberStats(TEAM)) as any[];

    expect(updateLastLoggedInTime).toHaveBeenCalledWith(USER, null);
    expect(row.lastLoggedInAt).toBeNull();
  });

  test("writes nothing when the member has neither a timestamp nor a session", async () => {
    db.$queryRaw.mockResolvedValue([member({ lastLoggedInAt: null })]);
    st.getAllSessionHandlesForUser.mockResolvedValue([]);

    await getTeamMemberStats(TEAM);

    expect(updateLastLoggedInTime).not.toHaveBeenCalled();
  });

  // NOTE: a read endpoint that writes. The backfill is a data migration running
  // inside a GET, so listing a team can update the User table — and it does so
  // once per member, serially, with one SuperTokens round trip to list the
  // handles and another per handle. A twenty-person team whose timestamps are
  // stale makes twenty-plus sequential network calls before the page renders.
  // See issues.txt 23.4.
  test("makes one SuperTokens round trip per member plus one per session, serially", async () => {
    db.$queryRaw.mockResolvedValue([
      member({ id: "u1", lastLoggedInAt: null }),
      member({ id: "u2", lastLoggedInAt: null }),
    ]);
    st.getAllSessionHandlesForUser.mockResolvedValue(["h1", "h2"]);
    st.getSessionInformation.mockResolvedValue({ timeCreated: 1_800_000_000_000 });

    await getTeamMemberStats(TEAM);

    expect(st.getAllSessionHandlesForUser.mock.calls).toHaveLength(2);
    expect(st.getSessionInformation.mock.calls).toHaveLength(4);
    expect(updateLastLoggedInTime).toHaveBeenCalledTimes(2);
  });

  test("lets a SuperTokens failure take the whole listing down", async () => {
    db.$queryRaw.mockResolvedValue([member({ lastLoggedInAt: null })]);
    st.getAllSessionHandlesForUser.mockRejectedValue(new Error("supertokens unreachable"));

    await expect(getTeamMemberStats(TEAM)).rejects.toThrow("supertokens unreachable");
  });

  // NOTE: the backfill formats with `dayjs(...).utc()`, but this module never
  // calls `dayjs.extend(utc)` — only response.service.ts and survey.service.ts
  // do. dayjs is a singleton, so the plugin is present only because one of those
  // unrelated modules happened to be imported first. The test below imports this
  // service without them and the call fails, which is what a new entrypoint (a
  // worker, a script, a leaner route tree) would see. See issues.txt 23.7.
  test("depends on a dayjs plugin another module registers", async () => {
    db.$queryRaw.mockResolvedValue([member({ lastLoggedInAt: null })]);
    st.getAllSessionHandlesForUser.mockResolvedValue(["h1"]);
    st.getSessionInformation.mockResolvedValue({ timeCreated: 1_800_000_000_000 });

    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/modules/dashboard/dashboard.service.ts", "utf8"),
    );

    expect(source).toContain(".utc()");
    expect(source).not.toContain("dayjs.extend");
    expect(source).not.toContain("dayjs/plugin/utc");
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

  // NOTE: the handler reads only the path parameter — request.user is never
  // touched — so nothing anywhere in this request path ties the team to the
  // caller. See issues.txt 23.2.
  test("team stats are read from the path id without consulting the session", async () => {
    db.$queryRaw.mockResolvedValue([]);
    const rep = reply();

    await getTeamMemberStatsHandler(request({ params: { teamId: "team-another-org" } }), rep);

    expect(query().values).toEqual(["team-another-org"]);
    expect(answer(rep).code).toBe(200);
  });

  // NOTE: all three catches do `reply.code(500).send(e)` with the Error object.
  // An Error has no enumerable own properties, so it serialises to `{}` — a 500
  // with an empty body. Same shape as issues.txt 21.13 and 20.43.
  // See issues.txt 23.6.
  test("every handler answers a failure with the bare Error object", async () => {
    const boom = new Error(`relation "LoyaltyCustomer" does not exist`);
    db.$queryRaw.mockRejectedValue(boom);

    const reps = [reply(), reply(), reply()];
    await getOverallStatsHandler(request(), reps[0]);
    await getActiveSurveyStatsHandler(request(), reps[1]);
    await getTeamMemberStatsHandler(request({ params: { teamId: TEAM } }), reps[2]);

    for (const rep of reps) {
      expect(answer(rep).code).toBe(500);
      expect(answer(rep).body).toBe(boom);
      expect(JSON.stringify(answer(rep).body)).toBe("{}");
    }
  });
});
