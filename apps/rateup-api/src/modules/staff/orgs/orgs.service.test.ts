import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({
  org: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
  $queryRaw: vi.fn(),
}));
vi.mock("../../../utils/prisma.js", () => ({ default: db }));

import { asPhoneDigits, asUuid } from "../staff.schema.js";
import { orgListQuerySchema } from "./orgs.schema.js";
import { listOrgs, orgListWhere, subscriptionStatus } from "./orgs.service.js";

const NOW = new Date("2026-09-22T10:00:00Z");
const ORG_ID = "0a5b8a7e-2f7c-4d2e-9a51-3c1f0e6b9d24";

beforeEach(() => {
  vi.clearAllMocks();
  db.$queryRaw.mockResolvedValue([]);
});

describe("search text", () => {
  test("a pasted id is recognised, anything else is not", () => {
    expect(asUuid(ORG_ID.toUpperCase())).toBe(ORG_ID);
    expect(asUuid("acme")).toBeUndefined();
  });

  test("phone numbers in any format become digits; words and short numbers do not", () => {
    expect(asPhoneDigits("+91 98765-43210")).toBe("919876543210");
    expect(asPhoneDigits("(555) 132 3034")).toBe("5551323034");
    expect(asPhoneDigits("1234")).toBeUndefined();
    expect(asPhoneDigits("acme 98765")).toBeUndefined();
  });
});

describe("orgListWhere", () => {
  test("no filters match every org", async () => {
    expect(await orgListWhere({}, NOW)).toEqual({});
  });

  test("a pasted org id is an exact match, not a substring search", async () => {
    expect(await orgListWhere({ q: ORG_ID }, NOW)).toEqual({ AND: [{ id: ORG_ID }] });
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  test("a phone number also matches the orgs whose channel has it", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "ch-1", orgId: "org-9" }]);
    const where = await orgListWhere({ q: "+1 555 132" }, NOW);
    const or = (where.AND as { OR: unknown[] }[])[0].OR;
    expect(or).toContainEqual({ id: { in: ["org-9"] } });
    expect(or).toContainEqual({ name: { contains: "+1 555 132", mode: "insensitive" } });
  });

  test("status and expiry filters are relative to now", async () => {
    const where = await orgListWhere({ status: "expired", expiringInDays: 14 }, NOW);
    expect(where).toEqual({
      AND: [
        { Subscription: { is: { expiresAt: { lte: NOW } } } },
        {
          Subscription: {
            is: { expiresAt: { gt: NOW, lte: new Date("2026-10-06T10:00:00Z") } },
          },
        },
      ],
    });
  });

  test("paid means an active subscription on a priced tier", async () => {
    expect(await orgListWhere({ status: "paid" }, NOW)).toEqual({
      AND: [
        {
          Subscription: {
            is: { expiresAt: { gt: NOW }, basePlan: { is: { price: { gt: 0 } } } },
          },
        },
      ],
    });
  });
});

describe("query schema", () => {
  test("defaults, and an empty search box is no search", () => {
    expect(orgListQuerySchema.parse({ q: "  " })).toEqual({
      q: undefined,
      page: 1,
      pageSize: 25,
      sort: "created",
      order: "desc",
    });
  });

  test("a page size cannot pull the whole table", () => {
    expect(orgListQuerySchema.safeParse({ pageSize: "5000" }).success).toBe(false);
  });
});

test("subscriptionStatus", () => {
  expect(subscriptionStatus(null, NOW)).toBe("no_plan");
  expect(subscriptionStatus({ expiresAt: new Date("2026-09-23") }, NOW)).toBe("active");
  expect(subscriptionStatus({ expiresAt: new Date("2026-09-01") }, NOW)).toBe("expired");
});

describe("listOrgs", () => {
  const record = {
    id: ORG_ID,
    name: "Acme",
    logo: null,
    createdAt: new Date("2026-01-01"),
    isPaused: null,
    owner: { id: "u1", name: "Ann", email: "ann@acme.test" },
    Subscription: {
      expiresAt: new Date("2026-12-01"),
      features: { whatsapp: { conversation: { count: { max: 1000 } } } },
      isAnnualMessageLimit: true,
      basePlan: { id: "p1", name: "GROWTH", displayName: "Growth", price: 2999 },
    },
    UsageStats: { monthlyMeteredConversationsCount: 40, annualMeteredConversationsCount: 900 },
    _count: { members: 3 },
  };

  test("pages, and reads usage in the plan's own period", async () => {
    db.org.findMany.mockResolvedValue([record]);
    db.org.count.mockResolvedValue(31);
    db.$queryRaw.mockResolvedValue([{ orgId: ORG_ID, last: new Date("2026-09-20") }]);

    const page = await listOrgs(orgListQuerySchema.parse({ page: "2", pageSize: "10" }), NOW);

    expect(db.org.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
    expect(page.total).toBe(31);
    expect(page.data[0]).toMatchObject({
      name: "Acme",
      pausedByCustomer: false,
      plan: { id: "p1", name: "Growth", paid: true },
      status: "active",
      members: 3,
      // Annual allowance: a year of usage against twelve months of the monthly cap.
      conversations: { used: 900, max: 12_000 },
      lastActiveAt: new Date("2026-09-20"),
    });
  });

  test("an unmetered plan has no ceiling rather than a zero one", async () => {
    db.org.findMany.mockResolvedValue([
      {
        ...record,
        Subscription: { ...record.Subscription, features: {}, isAnnualMessageLimit: false },
      },
    ]);
    db.org.count.mockResolvedValue(1);
    const page = await listOrgs(orgListQuerySchema.parse({}), NOW);
    expect(page.data[0].conversations).toEqual({ used: 40, max: null });
  });
});
