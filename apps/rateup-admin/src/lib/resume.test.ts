import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { rememberIntent, RESUME_MAX_AGE_MS, takeIntent } from "./resume";

const store = new Map<string, string>();
const PAGE = "/orgs/org_1";

beforeEach(() => {
  store.clear();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("takeIntent", () => {
  it("gives back what was remembered, once", () => {
    rememberIntent(
      { path: PAGE, kind: "org-action:plan", id: "org_1", reason: "upgrade", draft: { a: 1 } },
      1_000,
    );
    expect(takeIntent(PAGE, ["org-action:plan"], 2_000)).toEqual({
      path: PAGE,
      kind: "org-action:plan",
      id: "org_1",
      reason: "upgrade",
      draft: { a: 1 },
    });
    expect(takeIntent(PAGE, "org-action:plan", 2_000)).toBeNull();
  });

  it("leaves another kind on the same page for the component that handles it", () => {
    rememberIntent({ path: PAGE, kind: "delete-org", id: "org_1" }, 1_000);
    expect(takeIntent(PAGE, ["org-action:plan", "org-action:suspend"], 2_000)).toBeNull();
    expect(takeIntent(PAGE, "delete-org", 2_000)?.kind).toBe("delete-org");
  });

  it("drops an intent for another page", () => {
    rememberIntent({ path: "/orgs/other", kind: "delete-org", id: "other" }, 1_000);
    expect(takeIntent(PAGE, "delete-org", 2_000)).toBeNull();
    expect(store.size).toBe(0);
  });

  it("drops an abandoned one", () => {
    rememberIntent({ path: PAGE, kind: "delete-org", id: "org_1" }, 1_000);
    expect(takeIntent(PAGE, "delete-org", 1_000 + RESUME_MAX_AGE_MS + 1)).toBeNull();
    expect(store.size).toBe(0);
  });

  it("ignores garbage", () => {
    store.set("rateup-admin:resume", "{not json");
    expect(takeIntent(PAGE, "delete-org")).toBeNull();
    store.set("rateup-admin:resume", JSON.stringify({ path: PAGE, kind: "delete-org" }));
    expect(takeIntent(PAGE, "delete-org")).toBeNull();
  });
});
