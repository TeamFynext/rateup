import Fastify from "fastify";
import { describe, expect, test } from "vitest";

import { trustProxyFromEnv } from "./trustProxy.js";

describe("trusted proxy hops", () => {
  test("default to one: only the address Railway's edge appended is believed", () => {
    const trust = trustProxyFromEnv(undefined);
    expect(typeof trust).toBe("function");
    if (typeof trust !== "function") return;
    expect(trust("10.0.0.1", 0)).toBe(true);
    expect(trust("203.0.113.9", 1)).toBe(false);
  });

  test("follow a whole number", () => {
    const trust = trustProxyFromEnv("2");
    if (typeof trust !== "function") throw new Error("expected a function");
    expect(trust("x", 1)).toBe(true);
    expect(trust("x", 2)).toBe(false);
  });

  test("accept a list of proxy ranges", () => {
    expect(trustProxyFromEnv("10.0.0.0/8, 100.64.0.0/10")).toEqual(["10.0.0.0/8", "100.64.0.0/10"]);
  });
});

describe("Fastify with the default", () => {
  test("ignores what the caller wrote in front of the edge's entry", async () => {
    const app = Fastify({ trustProxy: trustProxyFromEnv(undefined) });
    app.get("/", (request) => ({ ip: request.ip }));
    const res = await app.inject({
      url: "/",
      remoteAddress: "10.0.0.1",
      headers: { "x-forwarded-for": "6.6.6.6, 203.0.113.9" },
    });
    expect(res.json()).toEqual({ ip: "203.0.113.9" });
    await app.close();
  });
});
