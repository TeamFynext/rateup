import { describe, expect, test } from "vitest";

import type { PipelineStage } from "@/backend/pipeline/pipeline.types.ts";

import {
  buildFunnel,
  buildSourceRows,
  buildStallRows,
  type StageCounts,
} from "./pipeline.utils.ts";

function stage(patch: Partial<PipelineStage> & { id: string }): PipelineStage {
  return {
    name: patch.id,
    short: null,
    order: 0,
    color: null,
    probability: 0,
    rottingDays: 0,
    status: "OPEN",
    pipelineId: "p1",
    openLeadCount: 0,
    ...patch,
  };
}

function counts(rows: Record<string, { total?: number; open?: number; rotting?: number }>) {
  return new Map(
    Object.entries(rows).map(([id, row]) => [
      id,
      { total: row.total ?? 0, open: row.open ?? 0, rotting: row.rotting ?? 0 },
    ]),
  ) satisfies StageCounts;
}

describe("buildFunnel", () => {
  test("drops closing columns — they are the outcome, not a step", () => {
    const stages = [stage({ id: "a" }), stage({ id: "won", status: "WON" })];

    expect(buildFunnel(stages, counts({ a: { total: 4 }, won: { total: 99 } }))).toHaveLength(1);
  });

  test("scales each bar against the widest stage", () => {
    const stages = [stage({ id: "a" }), stage({ id: "b" })];
    const rows = buildFunnel(stages, counts({ a: { total: 10 }, b: { total: 5 } }));

    expect(rows.map((row) => row.width)).toEqual([100, 50]);
  });

  test("carries nothing on the first row, and nothing out of an empty stage", () => {
    const stages = [stage({ id: "a" }), stage({ id: "b" }), stage({ id: "c" })];
    const rows = buildFunnel(stages, counts({ a: { total: 0 }, b: { total: 0 }, c: { total: 3 } }));

    // Nothing feeds the first row; a share of an empty stage is undefined
    // rather than 0%, which would read as a total collapse.
    expect(rows[0].carried).toBeNull();
    expect(rows[1].carried).toBeNull();
    expect(rows[2].carried).toBeNull();
  });

  test("reports what carried forward, not what dropped", () => {
    const stages = [stage({ id: "a" }), stage({ id: "b" })];
    const rows = buildFunnel(stages, counts({ a: { total: 10 }, b: { total: 7 } }));

    expect(rows[1].carried).toBe(70);
  });

  test("a stage the counts have not reached yet reads as zero", () => {
    expect(buildFunnel([stage({ id: "a" })], counts({}))[0].count).toBe(0);
  });
});

describe("buildStallRows", () => {
  test("lists only stages that set a rotting window", () => {
    const stages = [
      stage({ id: "a", rottingDays: 3 }),
      stage({ id: "b" }),
      stage({ id: "won", status: "WON", rottingDays: 5 }),
    ];

    // Nothing in a closing column can be late, and a stage with no window has
    // nothing to be late against.
    expect(
      buildStallRows(stages, counts({ a: { open: 2, rotting: 1 } })).map((r) => r.stage.id),
    ).toEqual(["a"]);
  });

  test("each bar is the stage's own stalled share", () => {
    const stages = [stage({ id: "a", rottingDays: 3 })];
    const [row] = buildStallRows(stages, counts({ a: { open: 4, rotting: 1 } }));

    expect(row).toMatchObject({ inStage: 4, stalled: 1, width: 25 });
  });

  test("an empty stage is 0% rather than a division by zero", () => {
    const [row] = buildStallRows([stage({ id: "a", rottingDays: 3 })], counts({}));

    expect(row.width).toBe(0);
    expect(Number.isNaN(row.width)).toBe(false);
  });
});

describe("buildSourceRows", () => {
  test("widths are relative to the busiest source", () => {
    const rows = buildSourceRows([
      { source: "WHATSAPP", total: 8 },
      { source: "SURVEY", total: 2 },
    ]);

    expect(rows).toEqual([
      { source: "WHATSAPP", count: 8, width: 100 },
      { source: "SURVEY", count: 2, width: 25 },
    ]);
  });

  test("survives an empty board without dividing by zero", () => {
    expect(buildSourceRows([])).toEqual([]);
  });
});
