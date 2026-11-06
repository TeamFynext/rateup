import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../utils/prisma.js", () => ({
  default: { apiRequestLog: { findMany: vi.fn() } },
}));
vi.mock("../../utils/logger.js", () => ({ log: { warn: vi.fn() } }));

import prisma from "../../utils/prisma.js";
import { listApiRequests } from "./apiUsage.js";

const findMany = prisma.apiRequestLog.findMany as unknown as ReturnType<typeof vi.fn>;

const row = (id: number) => ({
  id: BigInt(id),
  keyId: "k1",
  method: "GET",
  route: "/contacts",
  status: 200,
  latencyMs: 4,
  createdAt: new Date("2026-10-16T07:00:00.000Z"),
});

beforeEach(() => findMany.mockReset());

describe("listApiRequests", () => {
  test("a first page asks for one row more than it returns, newest first, for the org only", async () => {
    findMany.mockResolvedValue([row(30), row(29), row(28)]);

    const page = await listApiRequests("org-1", { limit: 2 });

    const args = findMany.mock.calls[0][0];
    expect(args.where).toEqual({ orgId: "org-1" });
    expect(args.orderBy).toEqual({ id: "desc" });
    expect(args.take).toBe(3);
    expect(page.data.map((r) => r.id)).toEqual(["30", "29"]);
    expect(page.nextCursor).toBe("29");
    expect(page.data[0].createdAt).toBe("2026-10-16T07:00:00.000Z");
  });

  test("the cursor continues below the last id, and the key filter applies", async () => {
    findMany.mockResolvedValue([row(28)]);

    const page = await listApiRequests("org-1", { limit: 2, cursor: "29", keyId: "k1" });

    expect(findMany.mock.calls[0][0].where).toEqual({
      orgId: "org-1",
      keyId: "k1",
      id: { lt: 29n },
    });
    expect(page.nextCursor).toBeNull();
  });
});
