import { describe, expect, test, vi } from "vitest";

vi.mock("./user.controller.js", () => ({
  auditLogFeaturesHandler: vi.fn(),
  auditLogHandler: vi.fn(),
  changeUserPasswordHandler: vi.fn(),
  createAppleUserHandler: vi.fn(),
  createGoogleUserHandler: vi.fn(),
  getAllUsersHandler: vi.fn(),
  getLoggedUserInfoHandler: vi.fn(),
  getLoggedUserProfileHandler: vi.fn(),
  pauseUserHandler: vi.fn(),
  updateProfileByIdHandler: vi.fn(),
  updateProfileHandler: vi.fn(),
  updateProfilePhotoHandler: vi.fn(),
  updateRecipeNameHandler: vi.fn(),
  updateUserActiveStatusHandler: vi.fn(),
  updateUserAvailabilityStatusHandler: vi.fn(),
  updateUserPrefLanguageHandler: vi.fn(),
}));
vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../../utils/auth.js", () => ({ assertRootOrg: vi.fn() }));
vi.mock("supertokens-node/recipe/session/framework/fastify/index.js", () => ({
  verifySession: vi.fn(() => vi.fn()),
}));

import { assertRootOrg } from "../../utils/auth.js";
import { checkSession } from "../../utils/checkSession.js";
import { userRoutes } from "./user.route.js";

interface Registered {
  method: string;
  url: string;
  opts: any;
}

async function collectRoutes(): Promise<Registered[]> {
  const routes: Registered[] = [];
  const record = (method: string) => (url: string, opts: any, handler?: unknown) =>
    routes.push({ method, url, opts: handler ? opts : {} });
  const server: any = {
    get: vi.fn(record("GET")),
    post: vi.fn(record("POST")),
    put: vi.fn(record("PUT")),
    delete: vi.fn(record("DELETE")),
    patch: vi.fn(record("PATCH")),
    addHook: vi.fn(),
    register: vi.fn(),
  };
  await userRoutes(server);
  return routes;
}

describe("platform-wide user routes", () => {
  // getAllUsers() and updateRecipeName() reach every user on the platform, so an owner of
  // any org used to be able to call them. They belong to the root org alone.
  test("GET /all and POST /update-recipe require the root org", async () => {
    const routes = await collectRoutes();
    for (const [method, url] of [
      ["GET", "/all"],
      ["POST", "/update-recipe"],
    ] as const) {
      const route = routes.find((r) => r.method === method && r.url === url);
      expect(route, `${method} ${url}`).toBeDefined();
      expect(route!.opts.config.permission).toBe("members.manage");
      const pre = route!.opts.preHandler as unknown[];
      expect(pre[0]).toBe(checkSession);
      expect(pre[pre.length - 1]).toBe(assertRootOrg);
    }
  });

  test("the sibling owner-only routes stay org-scoped, not root-gated", async () => {
    const routes = await collectRoutes();
    const pause = routes.find((r) => r.method === "PUT" && r.url === "/pause/:id");
    expect(pause!.opts.preHandler).not.toContain(assertRootOrg);
  });
});
