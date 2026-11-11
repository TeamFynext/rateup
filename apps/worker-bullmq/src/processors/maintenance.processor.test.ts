import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("@rateup/api/workers/shared/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@rateup/api/utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
// The run record lives in Redis; a Map stands in for it.
const store = vi.hoisted(() => new Map<string, string>());
vi.mock("@rateup/api/utils/redisConnection.js", () => ({
  default: {
    duplicate: () => ({}),
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: string) => void store.set(key, value),
    publish: async () => 1,
  },
}));
vi.mock("bullmq", () => ({
  Worker: class {
    on() {}
  },
  UnrecoverableError: class extends Error {},
}));
const auditUpdate = vi.hoisted(() => vi.fn(async (_args: unknown) => ({})));
vi.mock("@rateup/api/utils/prisma.js", () => ({
  default: { staffAuditLog: { update: auditUpdate } },
}));
const findTask = vi.hoisted(() => vi.fn());
vi.mock("@rateup/api/modules/platform/maintenance/maintenance.tasks.js", () => ({ findTask }));

const { processMaintenanceRun } = await import("./maintenance.processor.js");
const { newBackgroundRun, readBackgroundRun, updateBackgroundRun } =
  await import("@rateup/api/modules/platform/maintenance/backgroundRun.js");

const job = (taskId: string) =>
  ({ data: { taskId, auditId: "audit-1" }, attemptsMade: 0, updateProgress: vi.fn() }) as never;

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

describe("processMaintenanceRun", () => {
  test("runs the task round after round until it reports finished", async () => {
    let round = 0;
    const run = vi.fn(async ({ apply, log, timeLimitMs }) => {
      round++;
      log(`round ${round} at ${timeLimitMs}ms, apply=${apply}`);
      return {
        summary: `${round * 10} done`,
        details: { scanned: 10, matched: 4, finished: round === 3 },
      };
    });
    findTask.mockReturnValue({ id: "t", background: {}, run });
    await newBackgroundRun("t", "maintenance-t", "audit-1", "a@rateup.app");

    await processMaintenanceRun(job("t"));

    expect(run).toHaveBeenCalledTimes(3);
    expect(run.mock.calls[0][0]).toMatchObject({ apply: true, timeLimitMs: 60_000 });
    const state = await readBackgroundRun("t");
    expect(state).toMatchObject({
      state: "finished",
      rounds: 3,
      totals: { scanned: 30, matched: 12 },
    });
    expect(state?.finishedAt).toBeTruthy();
    expect(state?.lines).toContain("[apply] round 2 at 60000ms, apply=true");
    expect(auditUpdate.mock.calls[0][0]).toMatchObject({
      where: { id: "audit-1" },
      data: { after: { status: "finished", rounds: 3 } },
    });
  });

  test("a Stop press ends the run before the next round", async () => {
    const run = vi.fn(async () => {
      await updateBackgroundRun("t", (r) => void (r.stopRequested = true));
      return { summary: "partial", details: { finished: false } };
    });
    findTask.mockReturnValue({ id: "t", background: {}, run });
    await newBackgroundRun("t", "maintenance-t", "audit-1", null);

    await processMaintenanceRun(job("t"));

    expect(run).toHaveBeenCalledTimes(1);
    expect(await readBackgroundRun("t")).toMatchObject({ state: "stopped", rounds: 1 });
    expect(auditUpdate.mock.calls[0][0]).toMatchObject({ data: { after: { status: "stopped" } } });
  });

  test("a task's own round length is passed through", async () => {
    const run = vi.fn(async (_ctx: unknown) => ({ summary: "ok", details: {} }));
    findTask.mockReturnValue({ id: "t", background: { roundMs: Infinity }, run });
    await newBackgroundRun("t", "maintenance-t", "audit-1", null);

    await processMaintenanceRun(job("t"));

    expect(run.mock.calls[0][0]).toMatchObject({ timeLimitMs: Infinity });
    expect(await readBackgroundRun("t")).toMatchObject({ state: "finished", rounds: 1 });
  });

  test("refuses a task that does not run in the background", async () => {
    findTask.mockReturnValue({ id: "t", run: vi.fn() });
    await expect(processMaintenanceRun(job("t"))).rejects.toThrow("not a task");
  });
});
