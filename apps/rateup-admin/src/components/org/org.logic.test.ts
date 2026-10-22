import { describe, expect, test } from "vitest";

import type { OrgMember, OrgUsage } from "@/api/orgs.api";

import { orgDirectorySearchSchema, ORG_SORT_OPTIONS, ORG_VIEWS } from "./org-list-options";
import { orgTabSchema } from "./org-tabs";
import { packAllowance, PACK_KINDS } from "./packs";
import { groupByRole, ROLE_ORDER } from "./roles";

type Pack = OrgUsage["packs"][number];
const pack = (over: Partial<Pack>): Pack => ({
  id: "p",
  kind: "ACTIVE_CONTACTS",
  name: "Pack",
  quantity: 1,
  creditsGranted: null,
  creditsUsed: 0,
  expiresAt: "2026-11-17T00:00:00Z",
  boughtAt: "2026-10-17T00:00:00Z",
  paymentRef: null,
  ...over,
});

describe("packs", () => {
  test("a contact pack adds its contacts", () => {
    expect(packAllowance(pack({ quantity: 2 }))).toBe("+2,000 active contacts");
  });

  test("a credit pack shows credits spent of granted", () => {
    expect(
      packAllowance(pack({ kind: "CAMPAIGN_CREDITS", creditsGranted: 10_000, creditsUsed: 2500 })),
    ).toBe("2,500 of 10,000 credits used");
  });

  test("an older credit pack without a granted figure works it out from the quantity", () => {
    expect(packAllowance(pack({ kind: "CAMPAIGN_CREDITS", quantity: 2, creditsUsed: 0 }))).toBe(
      `0 of 20,000 credits used`,
    );
    expect(PACK_KINDS.CAMPAIGN_CREDITS.unitsPerPack).toBe(10_000);
  });
});

describe("roles", () => {
  const member = (roleKey: string, id: string): OrgMember =>
    ({ id, roleKey, role: roleKey.toLowerCase(), isOwner: roleKey === "OWNER" }) as OrgMember;

  test("groups members by role, most access first, keeping order inside a group", () => {
    const groups = groupByRole([
      member("AGENT", "a1"),
      member("OWNER", "o1"),
      member("AGENT", "a2"),
      member("ADMIN", "d1"),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["OWNER", "ADMIN", "AGENT"]);
    expect(groups[2].members.map((m) => m.id)).toEqual(["a1", "a2"]);
  });

  test("an unknown role sorts last", () => {
    const groups = groupByRole([member("CUSTOM", "c"), member("VIEWER", "v")]);
    expect(groups.map((g) => g.key)).toEqual(["VIEWER", "CUSTOM"]);
  });

  test("mirrors the API's six roles", () => {
    expect(ROLE_ORDER).toEqual(["OWNER", "ADMIN", "MANAGER", "STAFF", "AGENT", "VIEWER"]);
  });
});

describe("directory search params", () => {
  test("keeps valid filters and drops bad ones instead of failing the page", () => {
    expect(orgDirectorySearchSchema.parse({ q: "acme", view: "paid", sort: "usage" })).toEqual({
      q: "acme",
      view: "paid",
      sort: "usage",
    });
    expect(orgDirectorySearchSchema.parse({ view: "nope", sort: 3 })).toEqual({});
  });

  test("sorting by usage sorts by active contacts", () => {
    expect(ORG_SORT_OPTIONS.usage.sort).toBe("activeContacts");
    expect(ORG_VIEWS.expiring.params).toMatchObject({ expiringInDays: 14 });
  });
});

describe("org tabs", () => {
  test("old tab links land where their content moved", () => {
    expect(orgTabSchema.parse("messages")).toBe("usage");
    expect(orgTabSchema.parse("channels")).toBe("overview");
  });

  test("known tabs pass and anything else is dropped", () => {
    expect(orgTabSchema.parse("billing")).toBe("billing");
    expect(orgTabSchema.parse("nope")).toBeUndefined();
  });
});
