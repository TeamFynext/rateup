import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    lifecycle: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    contact: { count: vi.fn() },
    // The writers mirror each lifecycle onto every pipeline's board columns.
    pipeline: { findMany: vi.fn() },
    pipelineStage: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import {
  createLifecycle,
  deleteLifecycleById,
  getLifecycles,
  getLifeCyclesWithContactCount,
  LifecycleInUseError,
  reorderLabels,
  updateLifecycle,
} from "./lifecycle.service.js";
import {
  createLifecycleHandler,
  deleteLifecycleByIdHandler,
  getLifecyclesHandler,
  getLifecyclesWithContatsCountHandler,
  reorderLabelsHandler,
  updateLifecycleHandler,
} from "./lifecycle.controller.js";
import { lifecycleRoutes } from "./lifecycle.route.js";
import { lifecycleBodySchema, lifecycleReorderSchema } from "./lifecycle.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  lifecycle: Record<string, Mock>;
  contact: Record<string, Mock>;
  pipeline: Record<string, Mock>;
  pipelineStage: Record<string, Mock>;
  $transaction: Mock;
};

/**
 * Runs a `$transaction` callback against the same mock, so assertions on
 * `db.lifecycle.update` see the writes the transaction made. Array-form calls
 * are still resolved as-is.
 */
async function runTransaction(arg: unknown) {
  return typeof arg === "function" ? await (arg as (tx: unknown) => unknown)(prisma) : arg;
}

const ORG = "11111111-1111-1111-1111-111111111111";
const VICTIM_ORG = "22222222-2222-2222-2222-222222222222";
const STAGE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const body = (over: Record<string, unknown> = {}) => ({
  name: "Engaged Lead",
  category: "active",
  emoji: "⚡",
  description: "Actively interested",
  color: "#1c518e",
  ...over,
});

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations but drops queued values.
  db.lifecycle.findMany.mockResolvedValue([]);
  db.lifecycle.create.mockResolvedValue({ id: STAGE });
  db.lifecycle.update.mockResolvedValue({ id: STAGE });
  db.lifecycle.delete.mockResolvedValue({ id: STAGE });
  db.contact.count.mockResolvedValue(0);
  db.pipeline.findMany.mockResolvedValue([]);
  db.pipelineStage.findMany.mockResolvedValue([]);
  db.pipelineStage.createMany.mockResolvedValue({ count: 0 });
  db.pipelineStage.updateMany.mockResolvedValue({ count: 0 });
  db.pipelineStage.deleteMany.mockResolvedValue({ count: 0 });
  db.$transaction.mockImplementation(runTransaction);
});

// ===========================================================================
// The readers
// ===========================================================================

describe("the readers", () => {
  test("the listing is scoped to the caller's org and ordered", async () => {
    await getLifecycles(ORG);

    expect(db.lifecycle.findMany).toHaveBeenCalledWith({
      where: { orgId: ORG },
      orderBy: { ordering: "asc" },
    });
  });

  test("the counted listing is scoped and counts contacts per stage", async () => {
    await getLifeCyclesWithContactCount(ORG);

    expect(db.lifecycle.findMany.mock.calls[0][0]).toEqual({
      where: { orgId: ORG },
      orderBy: { ordering: "asc" },
      include: { _count: { select: { contacts: true } } },
    });
  });

  test("both handlers take the org from the session", async () => {
    await getLifecyclesHandler({ user: { orgId: ORG } } as never, reply());
    await getLifecyclesWithContatsCountHandler({ user: { orgId: ORG } } as never, reply());

    expect(db.lifecycle.findMany.mock.calls[0][0].where).toEqual({ orgId: ORG });
    expect(db.lifecycle.findMany.mock.calls[1][0].where).toEqual({ orgId: ORG });
  });

  test("the listing answers 200 with the rows", async () => {
    db.lifecycle.findMany.mockResolvedValueOnce([{ id: STAGE, name: "New Lead" }]);
    const rep = reply();

    await getLifecyclesHandler({ user: { orgId: ORG } } as never, rep);

    expect(answer(rep)).toEqual({ code: 200, body: [{ id: STAGE, name: "New Lead" }] });
  });

  test("a read failure answers 500 with a fixed message", async () => {
    db.lifecycle.findMany.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await getLifecyclesHandler({ user: { orgId: ORG } } as never, rep);

    expect(answer(rep).code).toBe(500);
    expect(answer(rep).body).toEqual({ message: "Error getting lifecycle " });
    expect(log.error).toHaveBeenCalled();
  });
});

// ===========================================================================
// updateLifecycle — the tenant boundary
// ===========================================================================

describe("updateLifecycle", () => {
  test("selects the row by id and org together", async () => {
    await updateLifecycle(STAGE, ORG, body() as never);

    expect(db.lifecycle.update.mock.calls[0][0].where).toEqual({ id: STAGE, orgId: ORG });
  });

  test("writes the request body through unchanged", async () => {
    const data = body({ isWon: true, isDefault: true, ordering: 9 });

    await updateLifecycle(STAGE, ORG, data as never);

    expect(db.lifecycle.update.mock.calls[0][0].data).toEqual(data);
  });

  test("the handler takes the org from the session", async () => {
    await updateLifecycleHandler(
      {
        params: { lifecycleId: STAGE },
        body: body({ name: "Renamed" }),
        user: { orgId: ORG },
      } as never,
      reply(),
    );

    expect(db.lifecycle.update.mock.calls[0][0].where).toEqual({ id: STAGE, orgId: ORG });
  });

  // NOTE: isWon is what conversions.service.ts:38 reads to decide whether a
  // contact reaching this stage fires a Meta Conversions event.
  test("a cross-tenant update can flip the flag that drives conversion reporting", async () => {
    await updateLifecycleHandler(
      {
        params: { lifecycleId: STAGE },
        body: body({ isWon: true, category: "won" }),
        user: { orgId: ORG },
      } as never,
      reply(),
    );

    expect(db.lifecycle.update.mock.calls[0][0].data).toMatchObject({
      isWon: true,
      category: "won",
    });
  });

  // NOTE: Lifecycle has no unique constraint of any kind (prisma/schema.prisma
  // :267-285) — not even on (orgId, name). Prisma cannot raise P2002 here, so
  // this branch is unreachable and duplicate names are in fact allowed.
  test("the 409 branch keys on a constraint the model does not have", async () => {
    db.lifecycle.update.mockRejectedValueOnce(Object.assign(new Error("dup"), { code: "P2002" }));
    const rep = reply();

    await updateLifecycleHandler(
      { params: { lifecycleId: STAGE }, body: body(), user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 409, body: { message: "Lifecycle already exists" } });
  });

  test("a missing or foreign stage answers 404", async () => {
    db.lifecycle.update.mockRejectedValueOnce(
      Object.assign(new Error("Record to update not found"), { code: "P2025" }),
    );
    const rep = reply();

    await updateLifecycleHandler(
      { params: { lifecycleId: STAGE }, body: body(), user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 404, body: { message: "Lifecycle not found" } });
  });

  test("answers 200 with the updated row", async () => {
    db.lifecycle.update.mockResolvedValueOnce({ id: STAGE, name: "Engaged Lead" });
    const rep = reply();

    await updateLifecycleHandler(
      { params: { lifecycleId: STAGE }, body: body(), user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 200, body: { id: STAGE, name: "Engaged Lead" } });
  });
});

// ===========================================================================
// deleteLifecycleById — the tenant boundary, and what it takes with it
// ===========================================================================

describe("deleteLifecycleById", () => {
  test("deletes by id and org together", async () => {
    await deleteLifecycleById(STAGE, ORG);

    expect(db.lifecycle.delete.mock.calls[0][0]).toEqual({ where: { id: STAGE, orgId: ORG } });
  });

  test("the handler takes the org from the session", async () => {
    await deleteLifecycleByIdHandler(
      { params: { lifecycleId: STAGE }, user: { orgId: ORG } } as never,
      reply(),
    );

    expect(db.lifecycle.delete).toHaveBeenCalledWith({ where: { id: STAGE, orgId: ORG } });
  });

  test("refuses while contacts still reference the stage", async () => {
    db.contact.count.mockResolvedValueOnce(4);

    await expect(deleteLifecycleById(STAGE, ORG)).rejects.toThrow(/still holds 4 contact/);
    expect(db.lifecycle.delete).not.toHaveBeenCalled();
  });

  test("counts only the caller's own org's contacts in that stage", async () => {
    await deleteLifecycleById(STAGE, ORG);

    expect(db.contact.count).toHaveBeenCalledWith({ where: { lifecycleId: STAGE, orgId: ORG } });
  });

  test("the handler answers 409 for a stage that still holds contacts", async () => {
    db.contact.count.mockResolvedValueOnce(2);
    const rep = reply();

    await deleteLifecycleByIdHandler(
      { params: { lifecycleId: STAGE }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep).code).toBe(409);
  });

  test("a missing or foreign stage answers 404", async () => {
    db.lifecycle.delete.mockRejectedValueOnce(
      Object.assign(new Error("Record to delete does not exist"), { code: "P2025" }),
    );
    const rep = reply();

    await deleteLifecycleByIdHandler(
      { params: { lifecycleId: STAGE }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 404, body: { message: "Lifecycle not found" } });
  });

  test("answers 200 with the deleted row", async () => {
    db.lifecycle.delete.mockResolvedValueOnce({ id: STAGE });
    const rep = reply();

    await deleteLifecycleByIdHandler(
      { params: { lifecycleId: STAGE }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 200, body: { id: STAGE } });
  });
});

// ===========================================================================
// createLifecycle
// ===========================================================================

describe("createLifecycle", () => {
  test("stamps the caller's org onto the new stage", async () => {
    await createLifecycle(ORG, body() as never);

    expect(db.lifecycle.create.mock.calls[0][0].data).toMatchObject({ orgId: ORG });
  });

  // NOTE: orgId is written first and the body spread over it, so a body key
  // named orgId would win. The Zod object strips unknown keys, so this is not
  // reachable today — but the ordering is the fragile one.
  test("the body is spread over the org, not under it", async () => {
    await createLifecycle(ORG, { ...body(), orgId: VICTIM_ORG } as never);

    expect(db.lifecycle.create.mock.calls[0][0].data.orgId).toBe(VICTIM_ORG);
  });

  test("the body schema does not accept an orgId", () => {
    const parsed = lifecycleBodySchema.safeParse({ ...body(), orgId: VICTIM_ORG });

    expect(parsed.success).toBe(true);
    expect((parsed as any).data).not.toHaveProperty("orgId");
  });

  test("the handler takes the org from the session", async () => {
    await createLifecycleHandler({ user: { orgId: ORG }, body: body() } as never, reply());

    expect(db.lifecycle.create.mock.calls[0][0].data.orgId).toBe(ORG);
  });

  test("answers 201 with the created row", async () => {
    db.lifecycle.create.mockResolvedValueOnce({ id: STAGE, name: "Engaged Lead" });
    const rep = reply();

    await createLifecycleHandler({ user: { orgId: ORG }, body: body() } as never, rep);

    expect(answer(rep)).toEqual({ code: 201, body: { id: STAGE, name: "Engaged Lead" } });
  });

  test("the unreachable 409 branch is duplicated here too", async () => {
    db.lifecycle.create.mockRejectedValueOnce(Object.assign(new Error("dup"), { code: "P2002" }));
    const rep = reply();

    await createLifecycleHandler({ user: { orgId: ORG }, body: body() } as never, rep);

    expect(answer(rep)).toEqual({ code: 409, body: { message: "Lifecycle already exists" } });
  });

  test("any other failure answers 500", async () => {
    db.lifecycle.create.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await createLifecycleHandler({ user: { orgId: ORG }, body: body() } as never, rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Error creating lifecycle" } });
  });
});

// ===========================================================================
// Pipeline board columns mirror the lifecycle stages
// ===========================================================================

describe("lifecycleBodySchema", () => {
  test("rejects a body with no emoji and no description", () => {
    const parsed = lifecycleBodySchema.safeParse({
      name: "Engaged Lead",
      category: "active",
      color: null,
    });

    expect(parsed.success).toBe(false);
  });

  test("accepts one that carries both", () => {
    const parsed = lifecycleBodySchema.safeParse({
      name: "Engaged Lead",
      category: "active",
      color: null,
      emoji: "🔥",
      description: "Warm",
    });

    expect(parsed.success).toBe(true);
  });

  // color is nullable in the database, and used to be the one field a caller had to
  // send — the inverse of the two the database actually requires.
  test("no longer requires color, which the database does not", () => {
    expect(
      lifecycleBodySchema.safeParse({
        name: "x",
        category: "active",
        emoji: "🔥",
        description: "d",
      }).success,
    ).toBe(true);
  });

  test("rejects an empty name and an unknown category", () => {
    expect(lifecycleBodySchema.safeParse(body({ name: "" })).success).toBe(false);
    expect(lifecycleBodySchema.safeParse(body({ category: "archived" })).success).toBe(false);
  });

  test("accepts each of the three real categories", () => {
    for (const category of ["active", "won", "lost"]) {
      expect(lifecycleBodySchema.safeParse(body({ category })).success).toBe(true);
    }
  });

  test("rejects a fractional ordering", () => {
    expect(lifecycleBodySchema.safeParse(body({ ordering: 1.5 })).success).toBe(false);
  });
});

// ===========================================================================
// reorderLabels
// ===========================================================================

describe("reorderLabels", () => {
  const item = (over: Record<string, unknown> = {}) => ({
    id: STAGE,
    ordering: 0,
    category: "active",
    isWon: false,
    ...over,
  });

  // NOTE: the one writer in the module that scopes to the org — the where
  // carries orgId alongside the id, with a comment saying why.
  test("constrains every update to the caller's org", async () => {
    await reorderLabels(ORG, { lifecycles: [item(), item({ id: "b", ordering: 1 })] } as never);

    for (const call of db.lifecycle.update.mock.calls) {
      expect(call[0].where.orgId).toBe(ORG);
    }
  });

  test("runs the whole reorder in one transaction", async () => {
    await reorderLabels(ORG, { lifecycles: [item(), item({ id: "b", ordering: 1 })] } as never);

    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(db.lifecycle.update).toHaveBeenCalledTimes(2);
  });

  test("writes the ordering each entry carries", async () => {
    await reorderLabels(ORG, {
      lifecycles: [item({ id: "a", ordering: 2 }), item({ id: "b", ordering: 5 })],
    } as never);

    expect(db.lifecycle.update.mock.calls.map((c) => c[0].data.ordering)).toEqual([2, 5]);
  });

  test("marks the first entry default whatever numbering the client uses", async () => {
    await reorderLabels(ORG, {
      lifecycles: [
        item({ id: "a", ordering: 1 }),
        item({ id: "b", ordering: 2 }),
        item({ id: "c", ordering: 3 }),
      ],
    } as never);

    expect(db.lifecycle.update.mock.calls.map((c) => c[0].data.isDefault)).toEqual([
      true,
      false,
      false,
    ]);
  });

  test("zero-based orderings behave the same way", async () => {
    await reorderLabels(ORG, {
      lifecycles: [item({ id: "a", ordering: 0 }), item({ id: "b", ordering: 1 })],
    } as never);

    expect(db.lifecycle.update.mock.calls.map((c) => c[0].data.isDefault)).toEqual([true, false]);
  });

  // Duplicate orderings used to make two stages default at once.
  test("exactly one stage is default even when orderings are duplicated", async () => {
    await reorderLabels(ORG, {
      lifecycles: [item({ id: "a", ordering: 0 }), item({ id: "b", ordering: 0 })],
    } as never);

    expect(db.lifecycle.update.mock.calls.map((c) => c[0].data.isDefault)).toEqual([true, false]);
  });

  test("a lost stage is never made default, even first in the list", async () => {
    await reorderLabels(ORG, {
      lifecycles: [item({ id: "a", ordering: 0, category: "lost" }), item({ id: "b" })],
    } as never);

    expect(db.lifecycle.update.mock.calls.map((c) => c[0].data.isDefault)).toEqual([false, true]);
  });

  // NOTE: the client's category is honoured only when it is "lost"; otherwise
  // it is recomputed from isWon, so a stage sent as "won" with isWon false is
  // written back as "active".
  test("recomputes the category from isWon, overriding what was sent", async () => {
    await reorderLabels(ORG, {
      lifecycles: [
        item({ id: "a", category: "won", isWon: false }),
        item({ id: "b", category: "active", isWon: true }),
      ],
    } as never);

    expect(db.lifecycle.update.mock.calls.map((c) => c[0].data.category)).toEqual([
      "active",
      "won",
    ]);
  });

  test("a lost stage keeps its category whatever isWon says", async () => {
    await reorderLabels(ORG, {
      lifecycles: [item({ id: "a", category: "lost", isWon: true })],
    } as never);

    expect(db.lifecycle.update.mock.calls[0][0].data).toMatchObject({
      category: "lost",
      isWon: true,
    });
  });

  // NOTE: the body is any array of stage ids, including a single one, so a
  // partial reorder can rewrite one stage's flags while leaving the rest of
  // the pipeline as it was.
  test("accepts a partial list and touches only what it was given", async () => {
    await reorderLabels(ORG, { lifecycles: [item({ id: "a", ordering: 0 })] } as never);

    expect(db.lifecycle.update).toHaveBeenCalledOnce();
  });

  test("an empty list is a valid no-op transaction", async () => {
    await reorderLabels(ORG, { lifecycles: [] } as never);

    expect(db.lifecycle.update).not.toHaveBeenCalled();
  });

  test("the reorder schema requires every field of every entry", () => {
    expect(
      lifecycleReorderSchema.safeParse({ lifecycles: [{ id: "a", ordering: 0 }] }).success,
    ).toBe(false);
    expect(
      lifecycleReorderSchema.safeParse({
        lifecycles: [{ id: "a", ordering: 0, category: "active", isWon: false }],
      }).success,
    ).toBe(true);
  });

  test("the handler takes the org from the session and answers 200", async () => {
    const rep = reply();

    await reorderLabelsHandler(
      { user: { orgId: ORG }, body: { lifecycles: [item()] } } as never,
      rep,
    );

    expect(db.lifecycle.update.mock.calls[0][0].where.orgId).toBe(ORG);
    expect(answer(rep).code).toBe(200);
  });

  // NOTE: a transaction covering a stage from another org fails as a whole, so
  // the org filter here is enforced rather than merely narrowing.
  test("a rejected transaction answers 500 and writes nothing", async () => {
    db.$transaction.mockRejectedValueOnce(
      Object.assign(new Error("Record to update not found"), { code: "P2025" }),
    );
    const rep = reply();

    await reorderLabelsHandler(
      { user: { orgId: ORG }, body: { lifecycles: [item()] } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Error reordering labels" } });
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

describe("lifecycleRoutes", () => {
  function server() {
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

  test("declares session access for the whole tree", async () => {
    const { srv, hooks } = server();

    await lifecycleRoutes(srv);

    expect(hooks).toEqual([{ name: "onRoute", fn: expect.any(Function) }]);
    const probe: any = { method: "GET", url: "/x", config: {} };
    hooks[0].fn(probe);
    expect(probe.config).toEqual({ access: "session" });
  });

  // NOTE: the session declaration establishes who the caller is. Nothing in this tree
  // establishes that a :lifecycleId belongs to them.
  test("adds no role check anywhere", async () => {
    const { srv, routes } = server();

    await lifecycleRoutes(srv);

    for (const r of routes) {
      expect(r.opts?.preHandler).toBeUndefined();
    }
  });

  test("registers six routes", async () => {
    const { srv, routes } = server();

    await lifecycleRoutes(srv);

    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual([
      "GET /",
      "GET /contacts",
      "POST /",
      "PUT /reorder",
      "PUT /:lifecycleId",
      "DELETE /:lifecycleId",
    ]);
  });

  // NOTE: /reorder is registered before /:lifecycleId, so the literal wins and
  // a stage can never be shadowed by it.
  test("registers the literal reorder path ahead of the parameterised one", async () => {
    const { srv, routes } = server();

    await lifecycleRoutes(srv);

    const puts = routes.filter((r) => r.method === "PUT").map((r) => r.url);
    expect(puts.indexOf("/reorder")).toBeLessThan(puts.indexOf("/:lifecycleId"));
  });

  test("validates the body of every writer", async () => {
    const { srv, routes } = server();

    await lifecycleRoutes(srv);

    expect(routes.find((r) => r.url === "/" && r.method === "POST").opts.schema.body).toBe(
      lifecycleBodySchema,
    );
    expect(routes.find((r) => r.url === "/reorder").opts.schema.body).toBe(lifecycleReorderSchema);
  });

  test("declares no response schema anywhere", async () => {
    const { srv, routes } = server();

    await lifecycleRoutes(srv);

    for (const r of routes) {
      expect(r.opts?.schema?.response).toBeUndefined();
    }
  });
});
