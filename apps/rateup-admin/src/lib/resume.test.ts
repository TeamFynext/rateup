import { beforeEach, describe, expect, test, vi } from "vitest";

import { rememberIntent, takeIntent } from "./resume";

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
}

describe("resume after step-up", () => {
  beforeEach(() => vi.stubGlobal("sessionStorage", memoryStorage()));

  test("hands the intent back once, to the page that stored it", () => {
    rememberIntent({ path: "/orgs/1", kind: "refund", id: "p1" });
    expect(takeIntent("/orgs/1", "refund")).toEqual({ path: "/orgs/1", kind: "refund", id: "p1" });
    expect(takeIntent("/orgs/1", "refund")).toBeNull();
  });

  test("another page or action does not get it, and it is cleared", () => {
    rememberIntent({ path: "/orgs/1", kind: "refund", id: "p1" });
    expect(takeIntent("/orgs/2", "refund")).toBeNull();
    expect(takeIntent("/orgs/1", "refund")).toBeNull();
  });

  test("blocked storage is not an error", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {},
    });
    expect(() => rememberIntent({ path: "/", kind: "x", id: "1" })).not.toThrow();
    expect(takeIntent("/", "x")).toBeNull();
  });
});
