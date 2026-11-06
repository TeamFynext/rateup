import { describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({ default: { $queryRaw: vi.fn() } }));

import prisma from "../../utils/prisma.js";
import { auditLogWhere, listAuditLogFeatures } from "./auditLog.filters.js";

describe("auditLogWhere", () => {
  test("is only the org when nothing is filtered", () => {
    expect(auditLogWhere("org-1", {})).toEqual({ orgId: "org-1" });
  });

  test("bounds the time on either or both ends", () => {
    const from = new Date("2026-09-01T00:00:00Z");
    const to = new Date("2026-09-07T23:59:59Z");
    expect(auditLogWhere("org-1", { from, to }).createdAt).toEqual({ gte: from, lte: to });
    expect(auditLogWhere("org-1", { from }).createdAt).toEqual({ gte: from });
  });

  test("narrows to one person", () => {
    expect(auditLogWhere("org-1", { userId: "u1" }).userId).toBe("u1");
  });

  test("matches a feature on a path-segment boundary, so contact does not take contact-group", () => {
    expect(auditLogWhere("org-1", { feature: "contact" }).OR).toEqual([
      { route: "/api/contact" },
      { route: { startsWith: "/api/contact/" } },
      { route: { startsWith: "/api/contact?" } },
    ]);
  });

  test("keeps the wa/ prefix of a WhatsApp feature", () => {
    expect(auditLogWhere("org-1", { feature: "wa/inbox" }).OR?.[1]).toEqual({
      route: { startsWith: "/api/wa/inbox/" },
    });
  });
});

describe("listAuditLogFeatures", () => {
  test("drops routes with no feature and turns counts into numbers", async () => {
    (prisma.$queryRaw as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { key: "contact", count: 12n },
      { key: null, count: 3n },
      { key: "wa/inbox", count: 5n },
    ]);

    expect(await listAuditLogFeatures("org-1")).toEqual([
      { key: "contact", count: 12 },
      { key: "wa/inbox", count: 5 },
    ]);
  });
});
