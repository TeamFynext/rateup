import { describe, expect, test } from "vitest";

import {
  parseRecent,
  RECENT_CAP,
  servedInLastHour,
  upsertRecent,
  type RecentCustomer,
} from "./recentCustomers";

const customer = (id: string, servedAt = "2026-09-07T10:00:00Z"): RecentCustomer => ({
  id,
  contactId: `c-${id}`,
  name: `Customer ${id}`,
  phone: "919000000001",
  tierName: null,
  points: 10,
  servedAt,
  pendingCount: 0,
});

describe("recentCustomers", () => {
  test("a served customer goes to the front, once", () => {
    const list = upsertRecent([customer("a"), customer("b")], customer("b"));
    expect(list.map((c) => c.id)).toEqual(["b", "a"]);
  });

  test("the list is capped", () => {
    let list: RecentCustomer[] = [];
    for (let i = 0; i < RECENT_CAP + 3; i++) list = upsertRecent(list, customer(String(i)));
    expect(list).toHaveLength(RECENT_CAP);
    expect(list[0].id).toBe(String(RECENT_CAP + 2));
  });

  test("counts only the customers served in the last hour", () => {
    const now = Date.parse("2026-09-07T12:00:00Z");
    const list = [
      customer("a", "2026-09-07T11:30:00Z"),
      customer("b", "2026-09-07T10:30:00Z"),
      customer("c", "2026-09-07T11:59:00Z"),
    ];
    expect(servedInLastHour(list, now)).toBe(2);
  });

  test("parses stored JSON defensively", () => {
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent("{}")).toEqual([]);
    expect(parseRecent("not json")).toEqual([]);
    expect(parseRecent(JSON.stringify([customer("a"), { junk: true }]))).toHaveLength(1);
  });
});
