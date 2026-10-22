import { describe, expect, test, vi } from "vitest";

const limiter = vi.hoisted(() => vi.fn());
vi.mock("../../../utils/rateLimit.js", () => ({ rateLimit: vi.fn(() => limiter) }));
vi.mock("./wa_redirect.controller.js", () => ({
  getWaShareMessageFromSTMIdHandler: vi.fn(),
  tokenizeIpHandler: vi.fn(),
}));

import { waRedirectRoutes } from "./wa_redirect.route.js";

describe("waRedirectRoutes", () => {
  test("the unauthenticated tokenize insert is rate limited per IP (MSG-15)", async () => {
    const routes: { method: string; url: string; opts: any }[] = [];
    const server: any = {
      addHook: vi.fn(),
      get: vi.fn((url, handler) => routes.push({ method: "GET", url, opts: handler })),
      post: vi.fn((url, opts) => routes.push({ method: "POST", url, opts })),
    };

    await waRedirectRoutes(server);

    const post = routes.find((r) => r.method === "POST");
    expect(post?.opts.preHandler).toEqual([limiter]);
  });
});
