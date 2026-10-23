import { describe, expect, test, vi } from "vitest";

vi.mock("./instagram_automatedReply.controller.js", () => ({
  metaAutomationHandlers: vi.fn((platform: string) => ({
    platform,
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    clone: vi.fn(),
    initiate: vi.fn(),
  })),
}));
vi.mock("../../../authz/registry.js", () => ({ declareAccess: vi.fn() }));

// wa_routes pulls in every WhatsApp module; only the Meta automation routes matter here.
vi.mock("../messageTemplates/wa_templates.route.js", () => ({ waTemplatesRoutes: vi.fn() }));
vi.mock("../settings/wa_settings.route.js", () => ({ waSettingsRoutes: vi.fn() }));
vi.mock("../whatsappSurvey/wasurvey.route.js", () => ({ waWebhookRoutes: vi.fn() }));
vi.mock("../redirect/wa_redirect.route.js", () => ({ waRedirectRoutes: vi.fn() }));
vi.mock("../flows/flow.route.js", () => ({ flowRoutes: vi.fn() }));
vi.mock("../flows/flow.endpoint-routes.js", () => ({ flowEnpointRoutes: vi.fn() }));
vi.mock("./wa_automatedReply.route.js", () => ({ waAutomatedReplyRoutes: vi.fn() }));
vi.mock("../instagram/instagram_profile.route.js", () => ({ instagramProfileRoutes: vi.fn() }));
vi.mock("../facebook/messenger_profile.route.js", () => ({ messengerProfileRoutes: vi.fn() }));
vi.mock("../inbox/wainbox.routes.js", () => ({ waInboxRoutes: vi.fn() }));
vi.mock("../auth/wa_auth.route.js", () => ({ waAuthRoutes: vi.fn() }));
vi.mock("../wa_error_handler.js", () => ({ handleWhatsappError: vi.fn() }));
vi.mock("../catalog/catalog.route.js", () => ({ waCatalogRoutes: vi.fn() }));
vi.mock("../calling/calling.route.js", () => ({ waCallingRoutes: vi.fn() }));

import { declareAccess } from "../../../authz/registry.js";
import { metaAutomationHandlers } from "./instagram_automatedReply.controller.js";
import { metaAutomationRoutes } from "./instagram_automatedReply.route.js";
import { whatsappRoutes } from "../wa_routes.js";

interface Registered {
  method: string;
  url: string;
  handler: any;
}

function fakeServer() {
  const routes: Registered[] = [];
  const record = (method: string) => (url: string, opts: any) =>
    routes.push({ method, url, handler: opts.handler });
  const server: any = {
    routes,
    get: vi.fn(record("GET")),
    post: vi.fn(record("POST")),
    put: vi.fn(record("PUT")),
    delete: vi.fn(record("DELETE")),
    register: vi.fn(),
    setErrorHandler: vi.fn(),
  };
  return server;
}

describe("whatsappRoutes", () => {
  test("mounts the Meta automation routes once per channel, each with its own platform", async () => {
    const server = fakeServer();
    await whatsappRoutes(server);
    const mounts = server.register.mock.calls
      .filter(([plugin]: [unknown]) => plugin === metaAutomationRoutes)
      .map(([, opts]: [unknown, any]) => opts);
    expect(mounts).toEqual([
      { prefix: "/instagram-automation", platform: "INSTAGRAM" },
      { prefix: "/messenger-automation", platform: "FACEBOOK" },
    ]);
  });
});

describe("metaAutomationRoutes", () => {
  test.each(["INSTAGRAM", "FACEBOOK"] as const)(
    "%s needs the same permissions as the WhatsApp flowbots",
    async (platform) => {
      const server = fakeServer();
      await metaAutomationRoutes(server, { platform });
      expect(declareAccess).toHaveBeenCalledWith(server, {
        read: "automation.read",
        write: "automation.manage",
      });
    },
  );

  test("serves the full set of routes, clone included, from that platform's handlers", async () => {
    const server = fakeServer();
    await metaAutomationRoutes(server, { platform: "FACEBOOK" });
    expect(metaAutomationHandlers).toHaveBeenCalledWith("FACEBOOK");
    expect(server.routes.map((r: Registered) => `${r.method} ${r.url}`)).toEqual([
      "GET /",
      "GET /:id",
      "POST /",
      "PUT /:id",
      "DELETE /:id",
      "POST /:id/clone",
      "POST /:id/initiate",
    ]);
    const handlers = vi.mocked(metaAutomationHandlers).mock.results.at(-1)!.value;
    for (const route of server.routes) {
      expect(Object.values(handlers), `${route.method} ${route.url}`).toContain(route.handler);
    }
  });
});
