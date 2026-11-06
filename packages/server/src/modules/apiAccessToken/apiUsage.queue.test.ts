import { beforeEach, describe, expect, test, vi } from "vitest";

// A Redis list and the insert, in memory.
const list = vi.hoisted(() => [] as string[]);
const createMany = vi.hoisted(() => vi.fn(async () => ({ count: 0 })));
vi.mock("../../utils/redisConnection.js", () => {
  const multi = () => {
    const ops: (() => void)[] = [];
    const chain = {
      rpush: (_key: string, ...values: string[]) => (ops.push(() => list.push(...values)), chain),
      ltrim: () => chain,
      exec: async () => ops.forEach((op) => op()),
    };
    return chain;
  };
  return {
    default: {
      multi,
      lpop: async (_key: string, count: number) => (list.length ? list.splice(0, count) : null),
      rpush: async (_key: string, ...values: string[]) => list.push(...values),
    },
  };
});
vi.mock("../../utils/prisma.js", () => ({ default: { apiRequestLog: { createMany } } }));
vi.mock("../../utils/logger.js", () => ({ log: { warn: vi.fn() } }));

const { drainApiUsage, flushApiUsage, recordApiUsage } = await import("./apiUsage.js");

const row = (route: string) => ({
  orgId: "org",
  keyId: "key",
  method: "GET",
  route,
  status: 200,
  latencyMs: 12,
  createdAt: new Date("2026-11-05T10:00:00Z"),
});

beforeEach(() => {
  list.length = 0;
  createMany.mockReset().mockResolvedValue({ count: 0 });
});

describe("API usage via the worker", () => {
  test("the API only queues rows in Redis; the worker writes them", async () => {
    recordApiUsage(row("/support/contact"));
    recordApiUsage(row("/org/ws/widget"));
    await flushApiUsage();

    expect(createMany).not.toHaveBeenCalled();
    expect(list).toHaveLength(2);

    expect(await drainApiUsage()).toEqual({ written: 2, failed: 0 });
    const written = (createMany.mock.calls[0] as unknown as [{ data: { createdAt: Date }[] }])[0]
      .data;
    expect(written).toHaveLength(2);
    expect(written[0].createdAt).toBeInstanceOf(Date);
    expect(list).toHaveLength(0);
  });

  test("a failed insert puts the rows back for the next tick", async () => {
    recordApiUsage(row("/support"));
    await flushApiUsage();
    createMany.mockRejectedValueOnce(new Error("db down"));

    expect(await drainApiUsage()).toEqual({ written: 0, failed: 1 });
    expect(list).toHaveLength(1);
  });

  test("a latency that is not a number is stored as 0 rather than failing the batch", async () => {
    recordApiUsage({ ...row("/org/ws/widget"), latencyMs: Number.NaN });
    await flushApiUsage();
    expect(JSON.parse(list[0]).latencyMs).toBe(0);
  });
});
