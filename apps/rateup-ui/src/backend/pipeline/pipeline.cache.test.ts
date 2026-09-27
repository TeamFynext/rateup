import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";

import { hasActiveLeadFilters, normaliseLeadParams } from "./pipeline.keys.ts";
import { shiftStageCounts } from "./pipeline.query.tsx";
import type { Lead, PipelineStats } from "./pipeline.types.ts";

describe("normaliseLeadParams", () => {
  test("drops empty values so one filter is one cache key", () => {
    // React Query hashes the key by walking the object: `{ search: "" }` and
    // `{}` would otherwise be two keys, and two requests, for one filter.
    expect(normaliseLeadParams({ filter: "open", search: "", stageId: undefined })).toEqual({
      filter: "open",
    });
  });

  test("keeps the facets that are actually set", () => {
    expect(
      normaliseLeadParams({
        filter: "mine",
        search: "acme",
        stageId: "s1",
        source: "WHATSAPP",
        assigneeId: "u1",
      }),
    ).toEqual({
      filter: "mine",
      search: "acme",
      stageId: "s1",
      source: "WHATSAPP",
      assigneeId: "u1",
    });
  });

  test("builds the same key whatever order the caller passed", () => {
    const a = normaliseLeadParams({ filter: "open", stageId: "s1", search: "x" });
    const b = normaliseLeadParams({ filter: "open", search: "x", stageId: "s1" });

    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("hasActiveLeadFilters", () => {
  test("the default view is not a filter", () => {
    expect(hasActiveLeadFilters({ filter: "open" })).toBe(false);
  });

  test("a saved view or any facet is", () => {
    expect(hasActiveLeadFilters({ filter: "rotting" })).toBe(true);
    expect(hasActiveLeadFilters({ filter: "open", search: "acme" })).toBe(true);
    expect(hasActiveLeadFilters({ filter: "open", assigneeId: "u1" })).toBe(true);
  });
});

const STATS: PipelineStats = {
  totals: {
    leads: 10,
    open: 6,
    won: 3,
    lost: 1,
    mine: 2,
    rotting: 0,
    noactivity: 0,
    avgDaysInStage: 0,
    avgAgeDays: 0,
    avgCycleDays: null,
  },
  stages: [
    { stageId: "a", total: 4, open: 4, avgDaysInStage: 1, rotting: 0 },
    { stageId: "b", total: 2, open: 2, avgDaysInStage: 1, rotting: 0 },
    { stageId: "won", total: 4, open: 0, avgDaysInStage: 1, rotting: 0 },
  ],
  sources: [],
  assignees: [],
};

function lead(patch: Partial<Lead>): Lead {
  return { id: "l1", stageId: "a", status: "OPEN", ...patch } as Lead;
}

describe("shiftStageCounts", () => {
  test("moves one lead between two open columns", () => {
    const next = shiftStageCounts(STATS, lead({ stageId: "a" }), lead({ stageId: "b" }));

    expect(next.stages).toEqual([
      { stageId: "a", total: 3, open: 3, avgDaysInStage: 1, rotting: 0 },
      { stageId: "b", total: 3, open: 3, avgDaysInStage: 1, rotting: 0 },
      { stageId: "won", total: 4, open: 0, avgDaysInStage: 1, rotting: 0 },
    ]);
    // A move between two open columns is not a win or a loss.
    expect(next.totals.open).toBe(6);
    expect(next.totals.won).toBe(3);
  });

  test("a drop onto a closing column shifts the status totals too", () => {
    const next = shiftStageCounts(
      STATS,
      lead({ stageId: "a", status: "OPEN" }),
      lead({ stageId: "won", status: "WON" }),
    );

    expect(next.totals.open).toBe(5);
    expect(next.totals.won).toBe(4);
    expect(next.stages[2]).toMatchObject({ stageId: "won", total: 5, open: 0 });
  });

  test("never counts below zero when the cache is behind", () => {
    const empty: PipelineStats = {
      ...STATS,
      totals: { ...STATS.totals, open: 0 },
      stages: [{ stageId: "a", total: 0, open: 0, avgDaysInStage: 0, rotting: 0 }],
    };

    const next = shiftStageCounts(empty, lead({ stageId: "a" }), lead({ stageId: "b" }));

    expect(next.stages[0]).toMatchObject({ total: 0, open: 0 });
    expect(next.totals.open).toBe(0);
  });

  test("leaves columns the lead did not touch alone", () => {
    const next = shiftStageCounts(STATS, lead({ stageId: "a" }), lead({ stageId: "b" }));

    expect(next.stages[2]).toEqual(STATS.stages[2]);
  });
});

describe("lead lists opt out of the app-wide placeholder", () => {
  /**
   * `providers.tsx` gives every query `placeholderData: (previous) => previous`.
   * On a lead list the key *is* the filter, so inheriting that makes a filter or
   * search change keep rendering rows from the previous filter — the board shows
   * leads that do not match, under a header already counting the new answer.
   */
  function client() {
    return new QueryClient({
      defaultOptions: { queries: { placeholderData: (previous: unknown) => previous } },
    });
  }

  test("the global default is what a plain query inherits", () => {
    expect(typeof client().defaultQueryOptions({ queryKey: ["x"] }).placeholderData).toBe(
      "function",
    );
  });

  test("passing it explicitly as undefined turns it off", () => {
    const options = client().defaultQueryOptions({ queryKey: ["x"], placeholderData: undefined });

    expect(options.placeholderData).toBeUndefined();
  });
});
