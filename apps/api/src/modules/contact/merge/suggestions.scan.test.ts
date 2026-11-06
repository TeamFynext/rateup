import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const db = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  contactMergeSuggestion: { upsert: vi.fn(async () => ({})) },
}));
vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn() } }));

const { scanForDuplicates } = await import("./suggestions.service.js");

beforeEach(() => vi.clearAllMocks());

describe("scanForDuplicates", () => {
  test("pairs every contact sharing an email, and each webchat visitor with its match", async () => {
    db.$queryRaw
      .mockResolvedValueOnce([{ orgId: "o", email: "a@x.com", ids: ["c1", "c2", "c3"] }])
      .mockResolvedValueOnce([
        { orgId: "o", webchatId: "w1", otherId: "c9", detail: "919188346187" },
      ]);

    const { pairs } = await scanForDuplicates("o");

    expect(pairs).toBe(4);
    const created = db.contactMergeSuggestion.upsert.mock.calls.map(
      (call) => (call as unknown as [{ create: { reason: string; contactAId: string } }])[0].create,
    );
    expect(created.filter((row) => row.reason === "SAME_EMAIL")).toHaveLength(3);
    expect(created.find((row) => row.reason === "CUSTOMER_PROVIDED")).toMatchObject({
      contactAId: "c9",
    });
  });

  test("never overwrites a suggestion already dismissed", async () => {
    db.$queryRaw
      .mockResolvedValueOnce([{ orgId: "o", email: "a@x.com", ids: ["c1", "c2"] }])
      .mockResolvedValueOnce([]);
    await scanForDuplicates("o");
    const call = db.contactMergeSuggestion.upsert.mock.calls[0] as unknown as [
      { update: Record<string, unknown> },
    ];
    expect(call[0].update).toEqual({});
  });
});
