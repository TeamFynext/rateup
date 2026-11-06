import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    pipeline: { findUniqueOrThrow: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

import prisma from "../../utils/prisma.js";
import { getPipelineStats, type PipelineStats } from "./pipeline.stats.js";

const db = prisma as unknown as Record<string, any>;

const PIPELINE = "33333333-3333-4333-8333-333333333333";
const USER = "11111111-1111-1111-1111-111111111111";
const STAGE = "44444444-4444-4444-8444-444444444444";

const TOTALS: PipelineStats["totals"] = {
  leads: 12,
  open: 7,
  won: 3,
  lost: 2,
  mine: 4,
  rotting: 1,
  noactivity: 2,
  avgDaysInStage: 5,
  avgAgeDays: 30,
  avgCycleDays: 11,
};

/**
 * The service fires its four queries through one `Promise.all`, so the mock
 * answers in the order they are written rather than by matching on SQL.
 */
function respond({
  totals = [TOTALS],
  stages = [] as unknown[],
  sources = [] as unknown[],
  assignees = [] as unknown[],
} = {}) {
  db.pipeline.findUniqueOrThrow.mockResolvedValue({ rottingEnabled: true });
  db.$queryRaw
    .mockResolvedValueOnce(totals)
    .mockResolvedValueOnce(stages)
    .mockResolvedValueOnce(sources)
    .mockResolvedValueOnce(assignees);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPipelineStats", () => {
  test("returns the four sections the board reads", async () => {
    const stage = { stageId: STAGE, total: 9, open: 6, avgDaysInStage: 4, rotting: 1 };
    respond({
      stages: [stage],
      sources: [{ source: "WHATSAPP", open: 5, total: 8 }],
      assignees: [
        {
          assigneeId: USER,
          name: "Ada",
          profilePhoto: null,
          open: 3,
          won: 2,
          closed: 3,
          stalled: 0,
        },
      ],
    });

    const stats = await getPipelineStats(PIPELINE, USER);

    expect(stats.totals).toEqual(TOTALS);
    expect(stats.stages).toEqual([stage]);
    expect(stats.sources[0].source).toBe("WHATSAPP");
    expect(stats.assignees[0].assigneeId).toBe(USER);
  });

  test("keeps an unassigned bucket that holds leads", async () => {
    respond({
      assignees: [
        {
          assigneeId: null,
          name: null,
          profilePhoto: null,
          open: 2,
          won: 0,
          closed: 0,
          stalled: 1,
        },
      ],
    });

    const stats = await getPipelineStats(PIPELINE, USER);

    expect(stats.assignees).toHaveLength(1);
    expect(stats.assignees[0].assigneeId).toBeNull();
  });

  test("drops an empty unassigned bucket", async () => {
    // The UNION always selects the row, so a board where everything is assigned
    // would otherwise grow a permanent row of zeroes.
    respond({
      assignees: [
        {
          assigneeId: USER,
          name: "Ada",
          profilePhoto: null,
          open: 1,
          won: 0,
          closed: 0,
          stalled: 0,
        },
        {
          assigneeId: null,
          name: null,
          profilePhoto: null,
          open: 0,
          won: 0,
          closed: 0,
          stalled: 0,
        },
      ],
    });

    const stats = await getPipelineStats(PIPELINE, USER);

    expect(stats.assignees).toHaveLength(1);
    expect(stats.assignees[0].assigneeId).toBe(USER);
  });

  test("reports no cycle time when nothing has been won", async () => {
    // Null rather than 0: there is no cycle yet, which is not a cycle of zero.
    respond({ totals: [{ ...TOTALS, won: 0, avgCycleDays: null }] });

    const stats = await getPipelineStats(PIPELINE, USER);

    expect(stats.totals.avgCycleDays).toBeNull();
  });

  test("falls back to zeroes when the totals query returns no row", async () => {
    respond({ totals: [] });

    const stats = await getPipelineStats(PIPELINE, USER);

    expect(stats.totals.leads).toBe(0);
    expect(stats.totals.avgCycleDays).toBeNull();
  });
});
