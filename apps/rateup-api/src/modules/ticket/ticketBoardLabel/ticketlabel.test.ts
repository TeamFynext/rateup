import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    ticketBoardLabel: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    ticketBoard: { findUnique: vi.fn() },
    teamMember: { findFirst: vi.fn() },
  },
}));

import prisma from "../../../utils/prisma.js";
import { isBoardMember } from "../ticketBoard/board.service.js";
import {
  createLabel,
  deleteLabel,
  deleteLabels,
  getLabels,
  updateLabel,
  verifyLabelAccess,
} from "./ticketlabel.service.js";
import {
  createLabelHandler,
  deleteLabelHandler,
  deleteLabelsHandler,
  getLabelsHandler,
  updateLabelHandler,
} from "./ticketlabel.controller.js";
import ticketLabelsRoutes from "./ticketlabel.route.js";
import { createLabelSchema, deleteLabelsSchema, updateLabelSchema } from "./ticketlabel.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  ticketBoardLabel: Record<string, Mock>;
  ticketBoard: Record<string, Mock>;
  teamMember: Record<string, Mock>;
};

const USER = "11111111-1111-1111-1111-111111111111";
const OUTSIDER = "99999999-9999-9999-9999-999999999999";
const BOARD = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const LABEL = "3f8a1e2c-5b7d-4c9e-8a1b-2d3e4f5a6b7c";
const VICTIM_TEAM = "cccccccc-cccc-cccc-cccc-cccccccccccc";

// Exactly the shape checkSession.ts:22 puts on the request: userId, not id.
const session = (userId = OUTSIDER) => ({
  userId,
  role: "MEMBER",
  orgId: "22222222-2222-2222-2222-222222222222",
  email: "outsider@example.test",
});

function reply() {
  const rep: any = {
    code: vi.fn(() => rep),
    status: vi.fn(() => rep),
    send: vi.fn(() => rep),
  };
  return rep;
}

function answer(rep: any) {
  return {
    code: rep.status.mock.calls[0]?.[0] ?? rep.code.mock.calls[0]?.[0],
    body: rep.send.mock.calls[0]?.[0],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.ticketBoardLabel.create.mockResolvedValue({ id: LABEL, name: "Bug", color: "#f00" });
  db.ticketBoardLabel.findMany.mockResolvedValue([]);
  db.ticketBoardLabel.findUnique.mockResolvedValue(null);
  db.ticketBoardLabel.update.mockResolvedValue({ id: LABEL });
  db.ticketBoardLabel.delete.mockResolvedValue({ id: LABEL });
  db.ticketBoardLabel.deleteMany.mockResolvedValue({ count: 0 });
  db.ticketBoard.findUnique.mockResolvedValue({ teams: [{ teamId: VICTIM_TEAM }] });
  db.teamMember.findFirst.mockResolvedValue(null);
});

// ===========================================================================
// The authorisation check every handler performs
// ===========================================================================

describe("the handlers' access check", () => {
  // NOTE: checkSession sets request.user = { userId, role, orgId, email }
  // (checkSession.ts:22) — there is no `id`. Every handler in this file reads
  // user.id, so the value handed to the membership check is always undefined.
  test("passes undefined as the user id to isBoardMember", async () => {
    db.teamMember.findFirst.mockResolvedValueOnce({ id: "tm-1", userId: "a-real-member" });

    await getLabelsHandler({ params: { ticketBoardId: BOARD }, user: session() } as never, reply());

    expect(db.teamMember.findFirst.mock.calls[0][0].where.userId).toBeUndefined();
  });

  // NOTE: Prisma drops undefined keys rather than matching NULL
  // (strictUndefinedChecks is not enabled), so the filter collapses to "any
  // member of any of this board's teams" — which any populated board has.
  test("the membership query degrades to any member of the board", async () => {
    db.teamMember.findFirst.mockResolvedValueOnce({ id: "tm-1", userId: "someone-else" });

    await expect(isBoardMember(BOARD, undefined as never)).resolves.toBe(true);
    expect(db.teamMember.findFirst.mock.calls[0][0].where).toEqual({
      teamId: { in: [VICTIM_TEAM] },
      userId: undefined,
    });
  });

  // NOTE: this is the bypass. The caller belongs to no team on this board; the
  // board has one member who is somebody else; the 403 does not fire.
  test("lets a non-member read another board's labels", async () => {
    db.teamMember.findFirst.mockResolvedValueOnce({ id: "tm-1", userId: "a-real-member" });
    db.ticketBoardLabel.findMany.mockResolvedValueOnce([{ id: LABEL, name: "Bug" }]);
    const rep = reply();

    await getLabelsHandler({ params: { ticketBoardId: BOARD }, user: session() } as never, rep);

    expect(rep.send).toHaveBeenCalledWith([{ id: LABEL, name: "Bug" }]);
  });

  test("lets a non-member create a label on another board", async () => {
    db.teamMember.findFirst.mockResolvedValueOnce({ id: "tm-1", userId: "a-real-member" });
    const rep = reply();

    await createLabelHandler(
      {
        params: { ticketBoardId: BOARD },
        body: { name: "Bug", color: "#f00" },
        user: session(),
      } as never,
      rep,
    );

    expect(db.ticketBoardLabel.create).toHaveBeenCalledOnce();
    expect(answer(rep).code).toBe(201);
  });

  test("lets a non-member bulk delete another board's labels", async () => {
    db.teamMember.findFirst.mockResolvedValueOnce({ id: "tm-1", userId: "a-real-member" });
    const rep = reply();

    await deleteLabelsHandler(
      { params: { ticketBoardId: BOARD }, body: { labelIds: [LABEL] }, user: session() } as never,
      rep,
    );

    expect(db.ticketBoardLabel.deleteMany).toHaveBeenCalledOnce();
    expect(answer(rep).code).toBe(204);
  });

  test("the same undefined reaches the by-id check", async () => {
    db.ticketBoardLabel.findUnique.mockResolvedValueOnce({
      id: LABEL,
      ticketBoardId: BOARD,
      ticketBoard: { teams: [{ teamId: VICTIM_TEAM }] },
    });
    db.teamMember.findFirst.mockResolvedValueOnce({ id: "tm-1", userId: "a-real-member" });
    const rep = reply();

    await deleteLabelHandler({ params: { id: LABEL }, user: session() } as never, rep);

    expect(db.teamMember.findFirst.mock.calls[0][0].where.userId).toBeUndefined();
    expect(db.ticketBoardLabel.delete).toHaveBeenCalledWith({ where: { id: LABEL } });
  });

  test("lets a non-member rename another board's label", async () => {
    db.ticketBoardLabel.findUnique.mockResolvedValue({
      id: LABEL,
      ticketBoardId: BOARD,
      ticketBoard: { teams: [{ teamId: VICTIM_TEAM }] },
    });
    db.teamMember.findFirst.mockResolvedValueOnce({ id: "tm-1", userId: "a-real-member" });
    const rep = reply();

    await updateLabelHandler(
      { params: { id: LABEL }, body: { name: "Renamed" }, user: session() } as never,
      rep,
    );

    expect(db.ticketBoardLabel.update).toHaveBeenCalledOnce();
  });

  // NOTE: the check only holds where it was never going to matter — a board
  // with no teams, or no members in them, has nothing to protect.
  test("still refuses when the board has no members at all", async () => {
    await expect(
      getLabelsHandler({ params: { ticketBoardId: BOARD }, user: session() } as never, reply()),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test("still refuses when there is no session user", async () => {
    await expect(
      getLabelsHandler({ params: { ticketBoardId: BOARD }, user: undefined } as never, reply()),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  // NOTE: the sibling board module reads request.userId, which the session does
  // set — so the same helper is called correctly there and incorrectly here.
  test("the correct property yields a real membership filter", async () => {
    db.teamMember.findFirst.mockResolvedValueOnce({ id: "tm-1" });

    await isBoardMember(BOARD, session(USER).userId);

    expect(db.teamMember.findFirst.mock.calls[0][0].where.userId).toBe(USER);
  });
});

// ===========================================================================
// createLabel
// ===========================================================================

describe("createLabel", () => {
  test("stores the label against the board", async () => {
    await createLabel(BOARD, { name: "Bug", color: "#f00" });

    expect(db.ticketBoardLabel.create).toHaveBeenCalledWith({
      data: { name: "Bug", color: "#f00", ticketBoardId: BOARD },
    });
  });

  test("refuses a name already used on the board", async () => {
    db.ticketBoardLabel.findUnique.mockResolvedValueOnce({ id: "other", name: "Bug" });

    await expect(createLabel(BOARD, { name: "Bug", color: "#f00" })).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(db.ticketBoardLabel.create).not.toHaveBeenCalled();
  });

  test("checks uniqueness against the compound key the model declares", async () => {
    await createLabel(BOARD, { name: "Bug", color: "#f00" });

    expect(db.ticketBoardLabel.findUnique.mock.calls[0][0].where).toEqual({
      ticketBoardId_name: { ticketBoardId: BOARD, name: "Bug" },
    });
  });

  // NOTE: the check and the insert are two statements with no transaction, so a
  // concurrent create passes the check and then trips the real constraint —
  // and nothing catches P2002, so that request 500s instead of answering 409.
  test("a race past the pre-check surfaces as an uncaught constraint error", async () => {
    db.ticketBoardLabel.create.mockRejectedValueOnce(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );

    await expect(createLabel(BOARD, { name: "Bug", color: "#f00" })).rejects.toMatchObject({
      code: "P2002",
    });
  });

  test("the schema bounds the name but not the colour", () => {
    expect(createLabelSchema.safeParse({ name: "", color: "#f00" }).success).toBe(false);
    expect(createLabelSchema.safeParse({ name: "x".repeat(51), color: "#f00" }).success).toBe(
      false,
    );
    expect(createLabelSchema.safeParse({ name: "Bug", color: "not-a-colour" }).success).toBe(true);
  });

  test("colour is required on create and optional on update", () => {
    expect(createLabelSchema.safeParse({ name: "Bug" }).success).toBe(false);
    expect(updateLabelSchema.safeParse({ name: "Bug" }).success).toBe(true);
  });

  test("an empty update body is accepted", () => {
    expect(updateLabelSchema.safeParse({}).success).toBe(true);
  });
});

// ===========================================================================
// getLabels / updateLabel / deleteLabel(s)
// ===========================================================================

describe("the label readers and writers", () => {
  test("labels are listed per board in creation order", async () => {
    await getLabels(BOARD);

    expect(db.ticketBoardLabel.findMany).toHaveBeenCalledWith({
      where: { ticketBoardId: BOARD },
      orderBy: { createdAt: "asc" },
    });
  });

  test("a rename checks the new name against the label's own board", async () => {
    db.ticketBoardLabel.findUnique
      .mockResolvedValueOnce({ id: LABEL, ticketBoardId: BOARD })
      .mockResolvedValueOnce(null);

    await updateLabel(LABEL, { name: "Renamed" });

    expect(db.ticketBoardLabel.findUnique.mock.calls[1][0].where).toEqual({
      ticketBoardId_name: { ticketBoardId: BOARD, name: "Renamed" },
    });
  });

  test("a rename onto another label's name is refused", async () => {
    db.ticketBoardLabel.findUnique
      .mockResolvedValueOnce({ id: LABEL, ticketBoardId: BOARD })
      .mockResolvedValueOnce({ id: "other", name: "Renamed" });

    await expect(updateLabel(LABEL, { name: "Renamed" })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test("renaming a label to its own name is allowed", async () => {
    db.ticketBoardLabel.findUnique
      .mockResolvedValueOnce({ id: LABEL, ticketBoardId: BOARD })
      .mockResolvedValueOnce({ id: LABEL, name: "Bug" });

    await expect(updateLabel(LABEL, { name: "Bug" })).resolves.toBeDefined();
  });

  // NOTE: when the label does not exist the uniqueness check is skipped
  // silently and the update runs anyway, raising P2025 rather than a 404.
  test("a missing label skips the check and fails at the update", async () => {
    db.ticketBoardLabel.findUnique.mockResolvedValueOnce(null);
    db.ticketBoardLabel.update.mockRejectedValueOnce(
      Object.assign(new Error("Record to update not found"), { code: "P2025" }),
    );

    await expect(updateLabel(LABEL, { name: "Renamed" })).rejects.toMatchObject({ code: "P2025" });
  });

  test("a colour-only update skips the uniqueness check", async () => {
    await updateLabel(LABEL, { color: "#0f0" });

    expect(db.ticketBoardLabel.findUnique).not.toHaveBeenCalled();
    expect(db.ticketBoardLabel.update.mock.calls[0][0].data).toEqual({ color: "#0f0" });
  });

  test("the single delete is by id alone", async () => {
    await deleteLabel(LABEL);

    expect(db.ticketBoardLabel.delete).toHaveBeenCalledWith({ where: { id: LABEL } });
  });

  // NOTE: the bulk delete is the one operation that constrains by board as
  // well as by id, so ids from another board are silently ignored rather than
  // deleted.
  test("the bulk delete is constrained to the named board", async () => {
    await deleteLabels(BOARD, [LABEL, "7c6b5a4f-3e2d-4b1a-9c8d-7e6f5a4b3c2d"]);

    expect(db.ticketBoardLabel.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: [LABEL, "7c6b5a4f-3e2d-4b1a-9c8d-7e6f5a4b3c2d"] },
        ticketBoardId: BOARD,
      },
    });
  });

  test("an empty id list deletes nothing", async () => {
    await deleteLabels(BOARD, []);

    expect(db.ticketBoardLabel.deleteMany.mock.calls[0][0].where.id.in).toEqual([]);
  });

  test("the bulk delete schema requires uuids", () => {
    expect(deleteLabelsSchema.safeParse({ labelIds: ["nope"] }).success).toBe(false);
    expect(deleteLabelsSchema.safeParse({ labelIds: [LABEL] }).success).toBe(true);
  });
});

// ===========================================================================
// verifyLabelAccess
// ===========================================================================

describe("verifyLabelAccess", () => {
  test("resolves the label's board teams in one query", async () => {
    db.ticketBoardLabel.findUnique.mockResolvedValueOnce({
      id: LABEL,
      ticketBoard: { teams: [{ teamId: VICTIM_TEAM }] },
    });
    db.teamMember.findFirst.mockResolvedValueOnce({ id: "tm-1" });

    await expect(verifyLabelAccess(LABEL, USER)).resolves.toBe(true);
    expect(db.ticketBoardLabel.findUnique.mock.calls[0][0].include).toEqual({
      ticketBoard: { select: { teams: { select: { teamId: true } } } },
    });
  });

  test("refuses a label that does not exist without a second query", async () => {
    await expect(verifyLabelAccess(LABEL, USER)).resolves.toBe(false);
    expect(db.teamMember.findFirst).not.toHaveBeenCalled();
  });

  test("refuses a user in none of the board's teams", async () => {
    db.ticketBoardLabel.findUnique.mockResolvedValueOnce({
      id: LABEL,
      ticketBoard: { teams: [{ teamId: VICTIM_TEAM }] },
    });

    await expect(verifyLabelAccess(LABEL, USER)).resolves.toBe(false);
  });

  // NOTE: correct when given a real user id — the defect is entirely in what
  // the controller passes.
  test("filters on the user id it is actually given", async () => {
    db.ticketBoardLabel.findUnique.mockResolvedValueOnce({
      id: LABEL,
      ticketBoard: { teams: [{ teamId: VICTIM_TEAM }] },
    });

    await verifyLabelAccess(LABEL, USER);

    expect(db.teamMember.findFirst.mock.calls[0][0].where.userId).toBe(USER);
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

describe("ticketLabelsRoutes", () => {
  function fakeServer() {
    const routes: any[] = [];
    const hooks: any[] = [];
    const srv: any = {
      addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
      get: vi.fn((url, opts) => routes.push({ method: "GET", url, opts })),
      post: vi.fn((url, opts) => routes.push({ method: "POST", url, opts })),
      put: vi.fn((url, opts) => routes.push({ method: "PUT", url, opts })),
      delete: vi.fn((url, opts) => routes.push({ method: "DELETE", url, opts })),
    };
    return { srv, routes, hooks };
  }

  test("registers five routes with no prefix of its own", async () => {
    const { srv, routes } = fakeServer();

    await ticketLabelsRoutes(srv);

    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual([
      "POST /boards/:ticketBoardId/labels",
      "GET /boards/:ticketBoardId/labels",
      "PUT /labels/:id",
      "DELETE /labels/:id",
      "DELETE /boards/:ticketBoardId/labels",
    ]);
  });

  // NOTE: the sibling board subtree puts verifyBoardAccess in a preHandler.
  // This one adds no hook and no preHandler and re-implements the check inside
  // each handler instead — which is how the wrong property went unnoticed.
  test("adds no hook and no preHandler anywhere", async () => {
    const { srv, routes, hooks } = fakeServer();

    await ticketLabelsRoutes(srv);

    expect(hooks).toHaveLength(0);
    for (const r of routes) {
      expect(r.opts.preHandler).toBeUndefined();
      expect(r.opts.onRequest).toBeUndefined();
    }
  });

  test("declares no params schema on any route", async () => {
    const { srv, routes } = fakeServer();

    await ticketLabelsRoutes(srv);

    for (const r of routes) {
      expect(r.opts.schema.params).toBeUndefined();
    }
  });

  test("the two read-free deletes still validate their body", async () => {
    const { srv, routes } = fakeServer();

    await ticketLabelsRoutes(srv);

    const bulk = routes.find((r) => r.method === "DELETE" && r.url.includes(":ticketBoardId"));
    expect(bulk.opts.schema.body).toBe(deleteLabelsSchema);
  });
});
