import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    ticketColumn: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ticketBoard: { findUnique: vi.fn() },
    teamMember: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import {
  createColumn,
  deleteColumn,
  getBoardIdByColumnId,
  getColumnById,
  getColumns,
  reorderColumns,
  updateColumn,
} from "./column.service.js";
import {
  createColumnHandler,
  deleteColumnHandler,
  reorderColumnsHandler,
  updateColumnHandler,
} from "./column.controller.js";
import { verifyColumnAccess } from "./column.auth.js";
import { verifyBoardAccess } from "../ticketBoard/board.auth.js";
import { columnRoutes } from "./column.route.js";
import { boardIdParamsSchema, createColumnRequestSchema } from "./column.schema.js";

const db = prisma as unknown as Record<string, any>;

const USER = "11111111-1111-1111-1111-111111111111";
const COLUMN = "7c6b5a4f-3e2d-4b1a-9c8d-7e6f5a4b3c2d";
const OWN_BOARD = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const VICTIM_BOARD = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

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
  db.ticketColumn.create.mockResolvedValue({ id: COLUMN, title: "To Do", order: 0 });
  db.ticketColumn.findFirst.mockResolvedValue(null);
  db.ticketColumn.findMany.mockResolvedValue([]);
  db.ticketColumn.findUnique.mockResolvedValue(null);
  db.ticketColumn.update.mockResolvedValue({ id: COLUMN });
  db.ticketColumn.delete.mockResolvedValue({ id: COLUMN });
  db.ticketBoard.findUnique.mockResolvedValue(null);
  db.teamMember.findFirst.mockResolvedValue(null);
  db.$transaction.mockImplementation(async (fn: any) => fn(db));
});

// ===========================================================================
// createColumn
// ===========================================================================

describe("createColumn", () => {
  // NOTE: POST /create carries no preHandler (column.route.ts:27-38) and the
  // board comes from the body, so nothing establishes that the caller can
  // reach it.
  test("takes the target board from the body without checking access", async () => {
    await createColumn({ title: "Triage", ticketBoardId: VICTIM_BOARD });

    expect(db.ticketColumn.create.mock.calls[0][0].data.ticketBoardId).toBe(VICTIM_BOARD);
    expect(db.teamMember.findFirst).not.toHaveBeenCalled();
  });

  test("the handler passes the body's board through untouched", async () => {
    const rep = reply();

    await createColumnHandler(
      request({ body: { title: "Triage", ticketBoardId: VICTIM_BOARD } }),
      rep,
    );

    expect(db.ticketColumn.create.mock.calls[0][0].data.ticketBoardId).toBe(VICTIM_BOARD);
    expect(answer(rep).code).toBe(201);
  });

  test("places the column after the board's current last", async () => {
    db.ticketColumn.findFirst.mockResolvedValueOnce({ order: 3 });

    await createColumn({ title: "Triage", ticketBoardId: OWN_BOARD });

    expect(db.ticketColumn.create.mock.calls[0][0].data.order).toBe(4);
  });

  test("starts at zero on an empty board", async () => {
    await createColumn({ title: "Triage", ticketBoardId: OWN_BOARD });

    expect(db.ticketColumn.create.mock.calls[0][0].data.order).toBe(0);
  });

  test("honours an explicit order, including zero", async () => {
    db.ticketColumn.findFirst.mockResolvedValue({ order: 9 });

    await createColumn({ title: "Triage", ticketBoardId: OWN_BOARD, order: 0 });

    expect(db.ticketColumn.create.mock.calls[0][0].data.order).toBe(0);
  });

  test("the create schema requires a uuid board id", () => {
    expect(createColumnRequestSchema.safeParse({ title: "x", ticketBoardId: "nope" }).success).toBe(
      false,
    );
    expect(
      createColumnRequestSchema.safeParse({ title: "x", ticketBoardId: OWN_BOARD }).success,
    ).toBe(true);
  });

  test("the create schema accepts an empty title", () => {
    expect(
      createColumnRequestSchema.safeParse({ title: "", ticketBoardId: OWN_BOARD }).success,
    ).toBe(true);
  });
});

// ===========================================================================
// The readers
// ===========================================================================

describe("the column readers", () => {
  test("columns are listed per board", async () => {
    await getColumns(OWN_BOARD);

    expect(db.ticketColumn.findMany.mock.calls[0][0].where).toEqual({ ticketBoardId: OWN_BOARD });
  });

  // NOTE: the listing pulls in every card on the board with its labels, but no
  // contact — less than the board module's own by-id read exposes.
  test("includes the cards and their labels but no contact", async () => {
    await getColumns(OWN_BOARD);

    const include = db.ticketColumn.findMany.mock.calls[0][0].include;
    expect(include.ticketCards.include).toEqual({ labels: { include: { label: true } } });
    expect(JSON.stringify(include)).not.toContain("contact");
  });

  test("flattens the label join rows", async () => {
    db.ticketColumn.findMany.mockResolvedValueOnce([
      { id: COLUMN, ticketCards: [{ id: "c-1", labels: [{ label: { id: "l-1", name: "Bug" } }] }] },
    ]);

    const columns = await getColumns(OWN_BOARD);

    expect(columns[0].ticketCards[0].labels).toEqual([{ id: "l-1", name: "Bug" }]);
  });

  test("gives a card with no labels an empty array", async () => {
    // The query always runs with `include: { labels: ... }`, so a card with no labels
    // comes back with an empty join list rather than the key missing.
    db.ticketColumn.findMany.mockResolvedValueOnce([
      { id: COLUMN, ticketCards: [{ id: "c-1", labels: [] }] },
    ]);

    const columns = await getColumns(OWN_BOARD);

    expect(columns[0].ticketCards[0].labels).toEqual([]);
  });

  // NOTE: the by-board listing orders nothing — neither the columns by their
  // order column nor the cards within them, unlike getBoardById which orders
  // both.
  test("orders neither the columns nor the cards it returns", async () => {
    await getColumns(OWN_BOARD);

    const arg = db.ticketColumn.findMany.mock.calls[0][0];
    expect(arg.orderBy).toBeUndefined();
    expect(arg.include.ticketCards.orderBy).toEqual({ createdAt: "asc" });
  });

  test("the single read selects by id", async () => {
    db.ticketColumn.findUnique.mockResolvedValueOnce({ id: COLUMN, ticketCards: [] });

    await getColumnById(COLUMN);

    expect(db.ticketColumn.findUnique.mock.calls[0][0].where).toEqual({ id: COLUMN });
  });

  test("the single read returns null untouched for a missing column", async () => {
    await expect(getColumnById(COLUMN)).resolves.toBeNull();
  });

  test("getBoardIdByColumnId returns just the board id", async () => {
    db.ticketColumn.findUnique.mockResolvedValueOnce({ ticketBoardId: OWN_BOARD });

    await expect(getBoardIdByColumnId(COLUMN)).resolves.toBe(OWN_BOARD);
    expect(db.ticketColumn.findUnique.mock.calls[0][0].select).toEqual({ ticketBoardId: true });
  });

  test("getBoardIdByColumnId returns undefined for a missing column", async () => {
    await expect(getBoardIdByColumnId(COLUMN)).resolves.toBeUndefined();
  });

  test("the by-board route's params schema matches its path", () => {
    expect(boardIdParamsSchema.safeParse({ ticketBoardId: OWN_BOARD }).success).toBe(true);
  });
});

// ===========================================================================
// updateColumn / deleteColumn
// ===========================================================================

describe("updateColumn", () => {
  test("writes only the title", async () => {
    await updateColumn(COLUMN, { title: "Renamed" });

    expect(db.ticketColumn.update.mock.calls[0][0]).toEqual({
      where: { id: COLUMN },
      data: { title: "Renamed" },
    });
  });

  // NOTE: title is assigned unconditionally, so an empty body sends
  // `title: undefined`, which Prisma drops — the update is a no-op that still
  // answers 200.
  test("an empty body is a no-op that reports success", async () => {
    const rep = reply();

    await updateColumnHandler(request({ params: { id: COLUMN }, body: {} }), rep);

    expect(db.ticketColumn.update.mock.calls[0][0].data).toEqual({ title: undefined });
    expect(answer(rep).code).toBe(200);
  });

  // NOTE: prisma.update resolves a row or throws — it never resolves null, so
  // this 404 cannot be reached and a missing column 500s.
  test("the 404 branch cannot be reached", async () => {
    db.ticketColumn.update.mockRejectedValueOnce(
      Object.assign(new Error("Record to update not found"), { code: "P2025" }),
    );
    const rep = reply();

    await updateColumnHandler(request({ params: { id: COLUMN }, body: { title: "x" } }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Error updating column" } });
  });
});

describe("deleteColumn", () => {
  test("deletes by id", async () => {
    await deleteColumn(COLUMN);

    expect(db.ticketColumn.delete).toHaveBeenCalledWith({ where: { id: COLUMN } });
  });

  // NOTE: TicketCard cascades from TicketColumn, so this takes every card in
  // the column with it — and the only gate is verifyColumnAccess, which asks
  // about membership and not about role.
  test("nothing checks whether the column still holds cards", async () => {
    await deleteColumn(COLUMN);

    expect(db.ticketColumn.findUnique).not.toHaveBeenCalled();
    expect(db.ticketColumn.delete).toHaveBeenCalledOnce();
  });

  test("answers 204 with no body", async () => {
    const rep = reply();

    await deleteColumnHandler(request({ params: { id: COLUMN } }), rep);

    expect(answer(rep)).toEqual({ code: 204, body: undefined });
  });
});

// ===========================================================================
// reorderColumns — the unguarded bulk write
// ===========================================================================

describe("reorderColumns", () => {
  // NOTE: PUT /reorder carries no preHandler, and the service updates by bare
  // id — nothing establishes which board these columns belong to.
  test("updates columns by id alone, with no board condition", async () => {
    await reorderColumns([{ id: COLUMN, order: 3 }]);

    expect(db.ticketColumn.update.mock.calls[0][0]).toEqual({
      where: { id: COLUMN },
      data: { order: 3 },
    });
  });

  test("updates every entry it is given, in order", async () => {
    await reorderColumns([
      { id: "a", order: 0 },
      { id: "b", order: 1 },
    ]);

    expect(db.ticketColumn.update.mock.calls.map((c: any) => c[0].where.id)).toEqual(["a", "b"]);
  });

  // NOTE: unlike the card reorder, this one does not check the current value
  // first, so every entry is written even when nothing changed.
  test("writes without reading the current order", async () => {
    await reorderColumns([{ id: COLUMN, order: 3 }]);

    expect(db.ticketColumn.findUnique).not.toHaveBeenCalled();
  });

  test("runs the batch in one transaction", async () => {
    await reorderColumns([{ id: COLUMN, order: 3 }]);

    expect(db.$transaction).toHaveBeenCalledOnce();
  });

  // NOTE: a column id that does not exist raises P2025 inside the transaction,
  // so one bad id rolls the whole reorder back.
  test("one missing column aborts the whole reorder", async () => {
    db.ticketColumn.update.mockRejectedValueOnce(
      Object.assign(new Error("Record to update not found"), { code: "P2025" }),
    );

    await expect(reorderColumns([{ id: COLUMN, order: 3 }])).rejects.toMatchObject({
      code: "P2025",
    });
  });

  test("the handler passes the body's column list straight through", async () => {
    const rep = reply();

    await reorderColumnsHandler(request({ body: { columns: [{ id: COLUMN, order: 7 }] } }), rep);

    expect(db.ticketColumn.update.mock.calls[0][0].where).toEqual({ id: COLUMN });
    expect(answer(rep).code).toBe(200);
  });
});

// ===========================================================================
// verifyColumnAccess
// ===========================================================================

describe("verifyColumnAccess", () => {
  test("resolves the column's board and checks membership", async () => {
    db.ticketColumn.findUnique.mockResolvedValueOnce({ ticketBoardId: OWN_BOARD });
    db.ticketBoard.findUnique.mockResolvedValueOnce({ teams: [{ teamId: "t-1" }] });
    db.teamMember.findFirst.mockResolvedValueOnce({ id: "tm-1" });
    const rep = reply();

    await verifyColumnAccess(request({ params: { id: COLUMN } }), rep);

    expect(db.teamMember.findFirst.mock.calls[0][0].where.userId).toBe(USER);
    expect(rep.code).not.toHaveBeenCalled();
  });

  test("404s a column that does not exist", async () => {
    const rep = reply();

    await verifyColumnAccess(request({ params: { id: COLUMN } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { message: "Column not found" } });
  });

  test("403s a caller who is not on the board", async () => {
    db.ticketColumn.findUnique.mockResolvedValueOnce({ ticketBoardId: OWN_BOARD });
    db.ticketBoard.findUnique.mockResolvedValueOnce({ teams: [{ teamId: "t-1" }] });
    const rep = reply();

    await verifyColumnAccess(request({ params: { id: COLUMN } }), rep);

    expect(answer(rep)).toEqual({
      code: 403,
      body: { message: "You don't have access to this column" },
    });
  });

  test("400s when no column id is present", async () => {
    const rep = reply();

    await verifyColumnAccess(request({ params: {} }), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { message: "Column ID is required" } });
  });

  // NOTE: it accepts either param name — but the card module's by-column route
  // binds :columnId, which is neither, so this would 400 there even if the
  // schema let the request through (see the card tests).
  test("accepts the id under either name it looks for", async () => {
    db.ticketColumn.findUnique.mockResolvedValue({ ticketBoardId: OWN_BOARD });
    db.ticketBoard.findUnique.mockResolvedValue({ teams: [{ teamId: "t-1" }] });
    db.teamMember.findFirst.mockResolvedValue({ id: "tm-1" });

    await verifyColumnAccess(request({ params: { ticketColumnId: COLUMN } }), reply());

    expect(db.ticketColumn.findUnique.mock.calls[0][0].where).toEqual({ id: COLUMN });
  });

  test("does not recognise the columnId the card route binds", async () => {
    const rep = reply();

    await verifyColumnAccess(request({ params: { columnId: COLUMN } }), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { message: "Column ID is required" } });
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

describe("columnRoutes", () => {
  function fakeServer() {
    const routes: any[] = [];
    const hooks: any[] = [];
    const srv: any = {
      addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
      get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
      post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
      put: vi.fn((url, opts, handler) => routes.push({ method: "PUT", url, opts, handler })),
      delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
    };
    return { srv, routes, hooks };
  }

  test("adds a second checkSession on top of the parent's", async () => {
    const { srv, hooks } = fakeServer();

    await columnRoutes(srv);

    expect(hooks).toHaveLength(1);
    expect(hooks[0].name).toBe("preHandler");
  });

  test("guards the by-id routes with verifyColumnAccess", async () => {
    const { srv, routes } = fakeServer();

    await columnRoutes(srv);

    const guarded = routes.filter((r) => r.opts?.preHandler?.includes(verifyColumnAccess));
    expect(guarded.map((r) => `${r.method} ${r.url}`)).toEqual([
      "GET /:id",
      "PUT /:id",
      "DELETE /:id",
    ]);
  });

  test("guards the by-board listing with the board check", async () => {
    const { srv, routes } = fakeServer();

    await columnRoutes(srv);

    const byBoard = routes.find((r) => r.url === "/board/:ticketBoardId");
    expect(byBoard.opts.preHandler).toEqual([verifyBoardAccess]);
  });

  // Same two shapes as the card subfolder: the routes that take their target from
  // the body used to be the routes with no access check.
  test("guards create and reorder from the body instead", async () => {
    const { srv, routes } = fakeServer();

    await columnRoutes(srv);

    const open = routes.filter((r) => !r.opts?.preHandler);
    expect(open).toEqual([]);
  });

  test("registers the parameterised put before the literal reorder", async () => {
    const { srv, routes } = fakeServer();

    await columnRoutes(srv);

    const puts = routes.filter((r) => r.method === "PUT").map((r) => r.url);
    // Fastify prefers a static segment over a parametric one regardless of
    // registration order, so /reorder still wins.
    expect(puts).toEqual(["/:id", "/reorder"]);
  });

  test("no route declares a role requirement", async () => {
    const { srv, routes } = fakeServer();

    await columnRoutes(srv);

    for (const r of routes) {
      expect(JSON.stringify(r.opts?.preHandler ?? [])).not.toContain("role");
    }
  });
});
