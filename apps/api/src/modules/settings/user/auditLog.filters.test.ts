import { describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/prisma.js", () => ({ default: { $queryRaw: vi.fn() } }));

import prisma from "../../../utils/prisma.js";
import { auditFeatureKey, auditLogWhere, listAuditLogFeatures } from "./auditLog.filters.js";

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

  test("matches a feature on a path-segment boundary, old prefixes included", () => {
    const or = auditLogWhere("org-1", { feature: "campaigns" }).OR;
    expect(or).toEqual([
      { route: "/api/campaigns" },
      { route: { startsWith: "/api/campaigns/" } },
      { route: { startsWith: "/api/campaigns?" } },
      { route: "/api/campaign" },
      { route: { startsWith: "/api/campaign/" } },
      { route: { startsWith: "/api/campaign?" } },
    ]);
  });

  test("an old prefix leaves out the longer old prefixes that moved to another feature", () => {
    const or = auditLogWhere("org-1", { feature: "contacts" }).OR ?? [];
    const legacy = or.find((c) => "AND" in c) as { AND: unknown[] };
    expect(legacy.AND[0]).toEqual({
      OR: [
        { route: "/api/contact" },
        { route: { startsWith: "/api/contact/" } },
        { route: { startsWith: "/api/contact?" } },
      ],
    });
    // Conversations and tags are inbox now; audiences (`/contact/group`) stay in contacts.
    expect(JSON.stringify(legacy.AND.slice(1))).toContain("/api/contact/conversations");
    expect(JSON.stringify(legacy.AND.slice(1))).toContain("/api/contact/conversation-tags");
    expect(JSON.stringify(legacy.AND.slice(1))).not.toContain("/api/contact/group");
  });

  test("a group feature takes two segments and its old prefixes", () => {
    const or = JSON.stringify(auditLogWhere("org-1", { feature: "automation/rules" }).OR);
    expect(or).toContain('"/api/automation/rules/"');
    expect(or).toContain('"/api/wa/automated-reply/rule/"');
  });
});

describe("auditFeatureKey", () => {
  test.each([
    ["/api/contacts/abc", "contacts"],
    ["/api/contact/abc?x=1", "contacts"],
    ["/api/contact/group/g1", "contacts"],
    ["/api/contact/conversations/c1", "inbox"],
    ["/api/wa/inbox/message/1", "inbox"],
    ["/api/wa/automated-reply/rule/r1", "automation/rules"],
    ["/api/chatbots/j1", "automation/journeys"],
    ["/api/wa/settings/s1", "whatsapp/settings"],
    ["/api/question/s1/q1", "surveys"],
    ["/api/org/update-logo", "org"],
  ])("%s → %s", (route, key) => {
    expect(auditFeatureKey(route)).toBe(key);
  });
});

describe("listAuditLogFeatures", () => {
  test("drops routes with no feature and turns counts into numbers", async () => {
    (prisma.$queryRaw as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { key: "contacts", count: 12n },
      { key: null, count: 3n },
      { key: "inbox", count: 5n },
    ]);

    expect(await listAuditLogFeatures("org-1")).toEqual([
      { key: "contacts", count: 12 },
      { key: "inbox", count: 5 },
    ]);
  });
});
