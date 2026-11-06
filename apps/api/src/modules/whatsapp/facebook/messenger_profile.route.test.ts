import { describe, expect, test, vi } from "vitest";

vi.mock("./messenger_profile.controller.js", () => ({
  deleteMessengerGetStartedHandler: vi.fn(),
  deleteMessengerGreetingHandler: vi.fn(),
  deleteMessengerIceBreakersHandler: vi.fn(),
  deleteMessengerPersistentMenuHandler: vi.fn(),
  getMessengerProfileHandler: vi.fn(),
  setMessengerGetStartedHandler: vi.fn(),
  setMessengerGreetingHandler: vi.fn(),
  setMessengerIceBreakersHandler: vi.fn(),
  setMessengerPersistentMenuHandler: vi.fn(),
}));

import { messengerProfileRoutes } from "./messenger_profile.route.js";

interface RouteConfig {
  access?: string;
  permission?: string;
}

/** Runs the real declareAccess onRoute hook over each route the plugin registers. */
function fakeServer() {
  const hooks: Array<(route: { method: string; url: string; config?: RouteConfig }) => void> = [];
  const routes: Array<{ route: string; config: RouteConfig }> = [];
  const record = (method: string) => (url: string, opts: { config?: RouteConfig }) => {
    const route = { method, url, config: { ...opts?.config } };
    for (const hook of hooks) hook(route);
    routes.push({ route: `${method} ${url}`, config: route.config });
  };
  const server = {
    routes,
    addHook: vi.fn((name: string, hook: (typeof hooks)[number]) => {
      if (name === "onRoute") hooks.push(hook);
    }),
    get: vi.fn(record("GET")),
    put: vi.fn(record("PUT")),
    delete: vi.fn(record("DELETE")),
  };
  return server;
}

describe("messengerProfileRoutes", () => {
  test("reading the profile needs channels.read", async () => {
    const server = fakeServer();
    await messengerProfileRoutes(server as never);
    const reads = server.routes.filter(({ route }) => route.startsWith("GET "));
    expect(reads.map(({ route }) => route)).toEqual(["GET /:channelId"]);
    expect(reads[0]!.config.permission).toBe("channels.read");
  });

  test("every change needs channels.manage, so a viewer cannot rewrite the Page", async () => {
    const server = fakeServer();
    await messengerProfileRoutes(server as never);
    const writes = server.routes.filter(({ route }) => !route.startsWith("GET "));
    expect(writes).toHaveLength(8);
    for (const { route, config } of writes) {
      expect(config.permission, route).toBe("channels.manage");
    }
  });
});
