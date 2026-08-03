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
  // (checkSession.ts:22) — there is no `id`. Every handler in this file used to
  // read user.id, so the value handed to the membership check was always
  // undefined, and the 403 never actually filtered by the real caller. Fixed to
  // read user.userId, the property the session actually sets.
  test("passes the session's real userId to isBoardMember", async () => {
    db.teamMember.findFirst.mockResolvedValueOnce({ id: "tm-1", userId: OUTSIDER });

    await getLabelsHandler({ params: { ticketBoardId: BOARD }, user: session() } as never, reply());

    expect(db.teamMember.findFirst.mock.calls[0][0].where.userId).toBe(OUTSIDER);
  });

  // NOTE: Prisma drops undefined keys rather than matching NULL
  // (strictUndefinedChecks is not enabled), so the filter collapses to "any
  // member of any of this board's teams" — which any populated board has. Still
  // true of isBoardMember itself; the fix above stops the handlers from ever
  // calling it with undefined.
  test("the membership query degrades to any member of the board", async () => {
    db.teamMember.findFirst.mockResolvedValueOnce({ id: "tm-1", userId: "someone-else" });

    await expect(isBoardMember(BOARD, undefined as never)).resolves.toBe(true);
    expect(db.teamMember.findFirst.mock.calls[0][0].where).toEqual({
      teamId: { in: [VICTIM_TEAM] },
      userId: undefined,
    });
  });

  // A mocked teamMember.findFirst that actually discriminates by the userId it's
  // asked about, so these tests can prove a genuine outsider gets refused (a mock
  // that just resolves truthy unconditionally can't tell the two cases apart).
  function findFirstMemberExcept(nonMemberUserId: string) {
    return ({ where }: { where: { userId: string } }) =>
      Promise.resolve(
        where.userId === nonMemberUserId ? null : { id: "tm-1", userId: "a-real-member" },
      );
  }

  test("refuses a non-member reading another board's labels", async () => {
    db.teamMember.findFirst.mockImplementationOnce(findFirstMemberExcept(OUTSIDER));

    await expect(
      getLabelsHandler({ params: { ticketBoardId: BOARD }, user: session() } as never, reply()),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test("refuses a non-member creating a label on another board", async () => {
    db.teamMember.findFirst.mockImplementationOnce(findFirstMemberExcept(OUTSIDER));

    await expect(
      createLabelHandler(
        {
          params: { ticketBoardId: BOARD },
          body: { name: "Bug", color: "#f00" },
          user: session(),
        } as never,
        reply(),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(db.ticketBoardLabel.create).not.toHaveBeenCalled();
  });

  test("refuses a non-member bulk deleting another board's labels", async () => {
    db.teamMember.findFirst.mockImplementationOnce(findFirstMemberExcept(OUTSIDER));

    await expect(
      deleteLabelsHandler(
        { params: { ticketBoardId: BOARD }, body: { labelIds: [LABEL] }, user: session() } as never,
        reply(),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(db.ticketBoardLabel.deleteMany).not.toHaveBeenCalled();
  });

  test("passes the session's real userId to the by-id check", async () => {
    db.ticketBoardLabel.findUnique.mockResolvedValueOnce({
      id: LABEL,
      ticketBoardId: BOARD,
      ticketBoard: { teams: [{ teamId: VICTIM_TEAM }] },
    });
    db.teamMember.findFirst.mockResolvedValueOnce({ id: "tm-1", userId: OUTSIDER });

    await deleteLabelHandler({ params: { id: LABEL }, user: session() } as never, reply());

    expect(db.teamMember.findFirst.mock.calls[0][0].where.userId).toBe(OUTSIDER);
    expect(db.ticketBoardLabel.delete).toHaveBeenCalledWith({ where: { id: LABEL } });
  });

  test("refuses a non-member renaming another board's label", async () => {
    db.ticketBoardLabel.findUnique.mockResolvedValue({
      id: LABEL,
      ticketBoardId: BOARD,
      ticketBoard: { teams: [{ teamId: VICTIM_TEAM }] },
    });
    db.teamMember.findFirst.mockImplementationOnce(findFirstMemberExcept(OUTSIDER));

    await expect(
      updateLabelHandler(
        { params: { id: LABEL }, body: { name: "Renamed" }, user: session() } as never,
        reply(),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(db.ticketBoardLabel.update).not.toHaveBeenCalled();
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

  // The sibling board module reads request.userId, which the session does set —
  // this module's handlers now do the same (see the fix above).
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

  // Uniqueness used to be pre-checked with a findUnique and then written in a
  // separate statement with no transaction, so two concurrent creates of the same
  // name both passed the check and the loser tripped the real constraint — whose
  // uncaught P2002 became a 500, the opposite of the 409 written above it. The
  // constraint itself is now the check.
  test("refuses a name already used on the board, from the constraint itself", async () => {
    db.ticketBoardLabel.create.mockRejectedValueOnce(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );

    await expect(createLabel(BOARD, { name: "Bug", color: "#f00" })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test("does not read the row before writing it", async () => {
    await createLabel(BOARD, { name: "Bug", color: "#f00" });

    expect(db.ticketBoardLabel.findUnique).not.toHaveBeenCalled();
  });

  test("any other write failure is left alone", async () => {
    db.ticketBoardLabel.create.mockRejectedValueOnce(
      Object.assign(new Error("db down"), { code: "P1001" }),
    );

    await expect(createLabel(BOARD, { name: "Bug", color: "#f00" })).rejects.toMatchObject({
      code: "P1001",
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

  // Renames had the same racing pre-check as create, and the constraint decides now.
  test("a rename onto another label's name is refused as a 409", async () => {
    db.ticketBoardLabel.update.mockRejectedValueOnce(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );

    await expect(updateLabel(LABEL, { name: "Renamed" })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test("renaming a label to its own name is allowed", async () => {
    await expect(updateLabel(LABEL, { name: "Bug" })).resolves.toBeDefined();
  });

  // A label that did not exist used to skip the check silently and then fail at the
  // update with a raw P2025 rather than a 404.
  test("a missing label answers 404", async () => {
    db.ticketBoardLabel.update.mockRejectedValueOnce(
      Object.assign(new Error("Record to update not found"), { code: "P2025" }),
    );

    await expect(updateLabel(LABEL, { name: "Renamed" })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  test("a colour-only update reads nothing first either", async () => {
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
