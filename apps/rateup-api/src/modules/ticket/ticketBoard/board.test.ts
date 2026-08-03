import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    ticketBoard: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    teamMember: { findMany: vi.fn(), findFirst: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("../ticketColumn/column.service.js", () => ({ createColumn: vi.fn() }));
vi.mock("../../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { createColumn } from "../ticketColumn/column.service.js";
import { checkSession } from "../../../utils/checkSession.js";
import {
  createBoard,
  deleteBoard,
  getBoardById,
  getBoards,
  getBoardTeamMembersById,
  isBoardMember,
  updateBoard,
} from "./board.service.js";
import {
  createBoardHandler,
  deleteBoardHandler,
  getAllBoardsHandler,
  getBoardTeamMembersHandler,
  getSingleBoardHandler,
  updateBoardHandler,
} from "./board.controller.js";
import { verifyBoardAccess } from "./board.auth.js";
import { boardRoutes } from "./board.route.js";
import { createBoardRequestSchema, updateBoardRequestSchema } from "./board.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  ticketBoard: Record<string, Mock>;
  teamMember: Record<string, Mock>;
  $queryRaw: Mock;
};

const USER = "11111111-1111-1111-1111-111111111111";
const BOARD = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const OWN_TEAM = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const VICTIM_TEAM = "cccccccc-cccc-cccc-cccc-cccccccccccc";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

function request(over: any = {}) {
  return { log: { error: vi.fn() }, userId: USER, ...over } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations but drops queued values.
  db.ticketBoard.create.mockResolvedValue({ id: BOARD, title: "Support" });
  db.ticketBoard.findMany.mockResolvedValue([]);
  db.ticketBoard.findUnique.mockResolvedValue(null);
  db.ticketBoard.update.mockResolvedValue({ id: BOARD });
  db.ticketBoard.delete.mockResolvedValue({ id: BOARD });
  db.teamMember.findMany.mockResolvedValue([]);
  db.teamMember.findFirst.mockResolvedValue(null);
  db.$queryRaw.mockResolvedValue([]);
  (createColumn as unknown as Mock).mockResolvedValue({ id: "col-1" });
});

// ===========================================================================
// createBoard — who may attach a team
// ===========================================================================

describe("createBoard", () => {
  beforeEach(() => {
    // By default the caller belongs to their own team and to no other.
    db.teamMember.findMany.mockResolvedValue([{ teamId: OWN_TEAM }]);
  });

  test("creates the board, its team links and its first column in one call", async () => {
    await createBoard({ title: "Support", description: "d", teamIds: [OWN_TEAM], userId: USER });

    expect(db.ticketBoard.create.mock.calls[0][0].data).toEqual({
      title: "Support",
      description: "d",
      teams: { createMany: { skipDuplicates: true, data: [{ teamId: OWN_TEAM }] } },
      ticketColumns: { create: { title: "To Do", order: 0 } },
    });
  });

  test("records no creator on the row", async () => {
    await createBoard({ title: "Support", teamIds: [OWN_TEAM], userId: USER });

    expect(JSON.stringify(db.ticketBoard.create.mock.calls[0][0])).not.toContain(USER);
  });

  test("refuses a team the caller does not belong to", async () => {
    await expect(
      createBoard({ title: "x", teamIds: [VICTIM_TEAM, OWN_TEAM], userId: USER }),
    ).rejects.toThrow(/only attach teams you belong to/);

    expect(db.ticketBoard.create).not.toHaveBeenCalled();
  });

  test("checks the ids against the caller's own memberships", async () => {
    await createBoard({ title: "x", teamIds: [OWN_TEAM], userId: USER });

    expect(db.teamMember.findMany.mock.calls[0][0].where).toEqual({
      userId: USER,
      teamId: { in: [OWN_TEAM] },
    });
  });

  test("the create handler answers 403 for a foreign team", async () => {
    const rep = reply();

    await createBoardHandler(request({ body: { title: "x", teamIds: [VICTIM_TEAM] } }), rep);

    expect(answer(rep).code).toBe(403);
    expect(db.ticketBoard.create).not.toHaveBeenCalled();
  });

  test("accepts an empty team list, making an unreachable board", async () => {
    expect(createBoardRequestSchema.safeParse({ title: "x", teamIds: [] }).success).toBe(true);

    await createBoard({ title: "x", teamIds: [], userId: USER });

    expect(db.ticketBoard.create.mock.calls[0][0].data.teams.createMany.data).toEqual([]);
  });

  test("seeds the To Do column as part of the board write, not after it", async () => {
    await createBoardHandler(request({ body: { title: "x", teamIds: [OWN_TEAM] } }), reply());

    expect(createColumn).not.toHaveBeenCalled();
    expect(db.ticketBoard.create.mock.calls[0][0].data.ticketColumns).toEqual({
      create: { title: "To Do", order: 0 },
    });
  });

  test("a failed write leaves no board behind", async () => {
    db.ticketBoard.create.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await createBoardHandler(request({ body: { title: "x", teamIds: [OWN_TEAM] } }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Error creating board" } });
  });
});

// ===========================================================================
// getBoards — the listing
// ===========================================================================

describe("getBoards", () => {
  test("lists boards through the caller's team memberships", async () => {
    db.teamMember.findMany.mockResolvedValueOnce([{ teamId: OWN_TEAM }]);

    await getBoards(USER);

    expect(db.teamMember.findMany.mock.calls[0][0].where).toEqual({ userId: USER });
    expect(db.ticketBoard.findMany.mock.calls[0][0].where).toEqual({
      teams: { some: { teamId: { in: [OWN_TEAM] } } },
    });
  });

  // NOTE: TicketBoard carries no orgId, so team membership is the only tenant
  // boundary in the module — a board attached to two orgs' teams is listed for
  // members of both.
  test("has no org condition of its own", async () => {
    db.teamMember.findMany.mockResolvedValueOnce([{ teamId: OWN_TEAM }]);

    await getBoards(USER);

    expect(JSON.stringify(db.ticketBoard.findMany.mock.calls[0][0].where)).not.toContain("orgId");
  });

  test("a user in no team sees an empty in-list, not every board", async () => {
    await getBoards(USER);

    expect(db.ticketBoard.findMany.mock.calls[0][0].where.teams.some.teamId.in).toEqual([]);
  });

  test("the handler takes the user from the session and answers 200", async () => {
    db.ticketBoard.findMany.mockResolvedValueOnce([{ id: BOARD }]);
    const rep = reply();

    await getAllBoardsHandler(request(), rep);

    expect(db.teamMember.findMany.mock.calls[0][0].where).toEqual({ userId: USER });
    expect(answer(rep)).toEqual({ code: 200, body: [{ id: BOARD }] });
  });
});

// ===========================================================================
// getBoardById — what board access exposes
// ===========================================================================

describe("getBoardById", () => {
  test("selects by id with no membership condition of its own", async () => {
    await getBoardById(BOARD);

    expect(db.ticketBoard.findUnique.mock.calls[0][0].where).toEqual({ id: BOARD });
  });

  // NOTE: the include reaches contacts through both cards and survey responses.
  // Board access therefore implies read access to contact names and phone
  // numbers, which is what makes the unchecked team attach (28.1) matter.
  test("pulls contact names and phone numbers in with the cards", async () => {
    await getBoardById(BOARD);

    const include = db.ticketBoard.findUnique.mock.calls[0][0].include;
    const card = include.ticketColumns.include.ticketCards.include;
    expect(card.contact.select).toEqual({ id: true, name: true, phone: true });
    expect(card.surveyResponse.include.Contact.select).toEqual({
      id: true,
      name: true,
      phone: true,
    });
  });

  test("flattens the label join rows into plain labels", async () => {
    db.ticketBoard.findUnique.mockResolvedValueOnce({
      id: BOARD,
      ticketColumns: [
        {
          id: "col-1",
          ticketCards: [{ id: "card-1", labels: [{ label: { id: "l-1", name: "Bug" } }] }],
        },
      ],
    });

    const board = await getBoardById(BOARD);

    expect((board as any).ticketColumns[0].ticketCards[0].labels).toEqual([
      { id: "l-1", name: "Bug" },
    ]);
  });

  test("gives a card with no labels an empty array", async () => {
    // The query always runs with `include: { labels: ... }`, so a card with no labels
    // comes back with an empty join list rather than the key missing.
    db.ticketBoard.findUnique.mockResolvedValueOnce({
      id: BOARD,
      ticketColumns: [{ id: "col-1", ticketCards: [{ id: "card-1", labels: [] }] }],
    });

    const board = await getBoardById(BOARD);

    expect(board?.ticketColumns[0].ticketCards[0].labels).toEqual([]);
  });

  test("returns null untouched for a board that does not exist", async () => {
    await expect(getBoardById(BOARD)).resolves.toBeNull();
  });

  test("the handler answers 404 for a missing board", async () => {
    const rep = reply();

    await getSingleBoardHandler(request({ params: { id: BOARD } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { message: "Board not found" } });
  });
});

// ===========================================================================
// verifyBoardAccess / isBoardMember
// ===========================================================================

describe("the board access check", () => {
  test("grants access to a member of any of the board's teams", async () => {
    db.ticketBoard.findUnique.mockResolvedValueOnce({ teams: [{ teamId: OWN_TEAM }] });
    db.teamMember.findFirst.mockResolvedValueOnce({ id: "tm-1", userId: USER });

    await expect(isBoardMember(BOARD, USER)).resolves.toBe(true);
    expect(db.teamMember.findFirst.mock.calls[0][0].where).toEqual({
      teamId: { in: [OWN_TEAM] },
      userId: USER,
    });
  });

  test("refuses a user who is in none of them", async () => {
    db.ticketBoard.findUnique.mockResolvedValueOnce({ teams: [{ teamId: OWN_TEAM }] });

    await expect(isBoardMember(BOARD, USER)).resolves.toBe(false);
  });

  test("refuses a board that does not exist, without a second query", async () => {
    await expect(isBoardMember(BOARD, USER)).resolves.toBe(false);
    expect(db.teamMember.findFirst).not.toHaveBeenCalled();
  });

  // NOTE: this is the correct reading — checkSession sets request.userId
  // (checkSession.ts:20). The label module reads request.user.id instead, which
  // does not exist; see 28.2.
  test("the preHandler reads request.userId, which the session sets", async () => {
    db.ticketBoard.findUnique.mockResolvedValueOnce({ teams: [{ teamId: OWN_TEAM }] });
    db.teamMember.findFirst.mockResolvedValueOnce({ id: "tm-1" });
    const rep = reply();

    await verifyBoardAccess(request({ params: { id: BOARD } }), rep);

    expect(db.teamMember.findFirst.mock.calls[0][0].where.userId).toBe(USER);
    expect(rep.code).not.toHaveBeenCalled();
  });

  test("403s a caller who is not a member", async () => {
    db.ticketBoard.findUnique.mockResolvedValueOnce({ teams: [{ teamId: VICTIM_TEAM }] });
    const rep = reply();

    await verifyBoardAccess(request({ params: { id: BOARD } }), rep);

    expect(answer(rep)).toEqual({
      code: 403,
      body: { message: "You don't have access to this board" },
    });
  });

  // NOTE: a board that does not exist and a board the caller cannot see are
  // both 403, so the id space cannot be enumerated through this route.
  test("answers 403 rather than 404 for a board that does not exist", async () => {
    const rep = reply();

    await verifyBoardAccess(request({ params: { id: BOARD } }), rep);

    expect(answer(rep).code).toBe(403);
  });

  test("accepts the id under either param name", async () => {
    db.ticketBoard.findUnique.mockResolvedValue({ teams: [{ teamId: OWN_TEAM }] });
    db.teamMember.findFirst.mockResolvedValue({ id: "tm-1" });

    await verifyBoardAccess(request({ params: { ticketBoardId: BOARD } }), reply());

    expect(db.ticketBoard.findUnique.mock.calls[0][0].where).toEqual({ id: BOARD });
  });

  test("400s when neither param is present", async () => {
    const rep = reply();

    await verifyBoardAccess(request({ params: {} }), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { message: "Board ID is required" } });
  });
});

// ===========================================================================
// updateBoard
// ===========================================================================

describe("updateBoard", () => {
  test("selects the board by id", async () => {
    await updateBoard(BOARD, { title: "Renamed" }, USER);

    expect(db.ticketBoard.update.mock.calls[0][0].where).toEqual({ id: BOARD });
  });

  // The teams block replaces the whole set — deleteMany with no filter is scoped to
  // this board's rows by the nested update, then the new list is written.
  test("replaces the team set wholesale when teamIds is given", async () => {
    db.teamMember.findMany.mockResolvedValueOnce([{ teamId: OWN_TEAM }]);

    await updateBoard(BOARD, { teamIds: [OWN_TEAM] }, USER);

    expect(db.ticketBoard.update.mock.calls[0][0].data.teams).toEqual({
      deleteMany: {},
      createMany: { skipDuplicates: true, data: [{ teamId: OWN_TEAM }] },
    });
  });

  test("refuses to attach an arbitrary team alongside the caller's own", async () => {
    db.teamMember.findMany.mockResolvedValueOnce([{ teamId: OWN_TEAM }]);

    await expect(updateBoard(BOARD, { teamIds: [OWN_TEAM, VICTIM_TEAM] }, USER)).rejects.toThrow(
      /only attach teams you belong to/,
    );
    expect(db.ticketBoard.update).not.toHaveBeenCalled();
  });

  test("refuses an update that would leave the board with no teams", async () => {
    await expect(updateBoard(BOARD, { teamIds: [] }, USER)).rejects.toThrow(
      /only attach teams you belong to/,
    );
    expect(db.ticketBoard.update).not.toHaveBeenCalled();
  });

  test("the handler answers 403 for both refusals", async () => {
    const rep = reply();

    await updateBoardHandler(request({ params: { id: BOARD }, body: { teamIds: [] } }), rep);

    expect(answer(rep)).toEqual({
      code: 403,
      body: { message: "A board must keep at least one team" },
    });
  });

  test("leaves the teams alone when teamIds is absent", async () => {
    await updateBoard(BOARD, { title: "Renamed" }, USER);

    expect(db.ticketBoard.update.mock.calls[0][0].data.teams).toBeUndefined();
    expect(db.teamMember.findMany).not.toHaveBeenCalled();
  });

  test("replaces the notification recipients the same way", async () => {
    await updateBoard(BOARD, { assignedToIds: [USER] }, USER);

    expect(db.ticketBoard.update.mock.calls[0][0].data.notificationRecipients).toEqual({
      deleteMany: {},
      createMany: { skipDuplicates: true, data: [{ userId: USER }] },
    });
  });

  // NOTE: title and the four notification booleans are assigned unconditionally
  // while description, teamIds and assignedToIds are guarded — the two styles
  // only agree because Prisma drops undefined.
  test("passes absent fields through as undefined", async () => {
    db.teamMember.findMany.mockResolvedValueOnce([{ teamId: OWN_TEAM }]);

    await updateBoard(BOARD, { teamIds: [OWN_TEAM] }, USER);

    const data = db.ticketBoard.update.mock.calls[0][0].data;
    expect(data.title).toBeUndefined();
    expect(data.ticketCreatedEmail).toBeUndefined();
    expect(data).not.toHaveProperty("description");
  });

  test("the update schema makes every field optional", () => {
    expect(updateBoardRequestSchema.safeParse({}).success).toBe(true);
  });

  test("the update schema rejects a non-uuid team id", () => {
    expect(updateBoardRequestSchema.safeParse({ teamIds: ["not-a-uuid"] }).success).toBe(false);
  });

  test("answers 200 for an update that succeeds", async () => {
    const rep = reply();

    await updateBoardHandler(request({ params: { id: BOARD }, body: { title: "x" } }), rep);

    expect(answer(rep).code).toBe(200);
  });

  test("a failed update answers 500", async () => {
    db.ticketBoard.update.mockRejectedValueOnce(
      Object.assign(new Error("Record to update not found"), { code: "P2025" }),
    );
    const rep = reply();

    await updateBoardHandler(request({ params: { id: BOARD }, body: { title: "x" } }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Error updating board" } });
  });
});

// ===========================================================================
// deleteBoard
// ===========================================================================

describe("deleteBoard", () => {
  test("deletes by id", async () => {
    await deleteBoard(BOARD);

    expect(db.ticketBoard.delete).toHaveBeenCalledWith({ where: { id: BOARD } });
  });

  // NOTE: the route's only gate is verifyBoardAccess, which asks whether the
  // caller is in one of the board's teams — not what their role is. The lowest
  // member of a team can delete the board for everyone.
  test("the route gates deletion on membership alone", async () => {
    const { srv, routes } = fakeServer();

    await boardRoutes(srv);

    const del = routes.find((r) => r.method === "DELETE" && r.url === "/:id");
    expect(del.opts.preHandler).toEqual([verifyBoardAccess]);
  });

  test("answers 204 with no body", async () => {
    const rep = reply();

    await deleteBoardHandler(request({ params: { id: BOARD } }), rep);

    expect(answer(rep)).toEqual({ code: 204, body: undefined });
  });

  test("a failed delete answers 500", async () => {
    db.ticketBoard.delete.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await deleteBoardHandler(request({ params: { id: BOARD } }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Error deleting board" } });
  });
});

// ===========================================================================
// getBoardTeamMembersById
// ===========================================================================

describe("getBoardTeamMembersById", () => {
  test("binds the board id as a uuid parameter", async () => {
    await getBoardTeamMembersById(BOARD);

    const [strings, ...values] = db.$queryRaw.mock.calls[0];
    const sql = strings.join("?");
    expect(sql).toContain(`tbt."boardId" =`);
    expect(sql).toContain("::uuid");
    expect(values).toEqual([BOARD]);
  });

  test("selects no email address", async () => {
    await getBoardTeamMembersById(BOARD);

    const sql = db.$queryRaw.mock.calls[0][0].join("?");
    expect(sql).toContain("u.id");
    expect(sql).toContain("u.name");
    expect(sql).not.toContain("email");
  });

  test("de-duplicates members who are in two of the board's teams", async () => {
    await getBoardTeamMembersById(BOARD);

    expect(db.$queryRaw.mock.calls[0][0].join("?")).toContain("SELECT DISTINCT");
  });

  test("answers 200 with an empty list", async () => {
    const rep = reply();

    await getBoardTeamMembersHandler(request({ params: { id: BOARD } }), rep);

    expect(answer(rep)).toEqual({ code: 200, body: [] });
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

function fakeServer() {
  const routes: any[] = [];
  const hooks: any[] = [];
  const srv: any = {
    addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
    register: vi.fn(),
    get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
    post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
    put: vi.fn((url, opts, handler) => routes.push({ method: "PUT", url, opts, handler })),
    delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
  };
  return { srv, routes, hooks };
}

describe("boardRoutes", () => {
  test("does not add a second checkSession on top of the parent's", async () => {
    const { srv, hooks } = fakeServer();

    await boardRoutes(srv);

    expect(hooks).toEqual([]);
  });

  test("guards every by-id route with the board access check", async () => {
    const { srv, routes } = fakeServer();

    await boardRoutes(srv);

    const byId = routes.filter((r) => r.url.startsWith("/:id"));
    expect(byId).toHaveLength(4);
    for (const r of byId) {
      expect(r.opts.preHandler).toEqual([verifyBoardAccess]);
    }
  });

  // NOTE: the commented-out preHandler on the create route is the team check
  // that would make 28.1 impossible.
  test("leaves the create route with no access check", async () => {
    const { srv, routes } = fakeServer();

    await boardRoutes(srv);

    const create = routes.find((r) => r.url === "/create");
    expect(create.opts.preHandler).toBeUndefined();
    expect(Object.keys(create.opts)).toEqual(["schema"]);
  });

  test("the listing route needs no board check because it derives its own", async () => {
    const { srv, routes } = fakeServer();

    await boardRoutes(srv);

    const list = routes.find((r) => r.url === "/" && r.method === "GET");
    expect(list.opts).toBe(getAllBoardsHandler);
  });

  test("registers six routes", async () => {
    const { srv, routes } = fakeServer();

    await boardRoutes(srv);

    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual([
      "POST /create",
      "GET /",
      "GET /:id",
      "PUT /:id",
      "DELETE /:id",
      "GET /:id/team-members",
    ]);
  });

  test("no route declares a role requirement", async () => {
    const { srv, routes } = fakeServer();

    await boardRoutes(srv);

    for (const r of routes) {
      expect(JSON.stringify(r.opts?.preHandler ?? [])).not.toContain("role");
    }
  });
});
