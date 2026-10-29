import { describe, expect, test, vi } from "vitest";

vi.mock("../../authz/registry.js", () => ({ declareAccess: vi.fn() }));
vi.mock("./chatbots.controller.js", () => ({
  listChatbotsHandler: vi.fn(),
  getChatbotHandler: vi.fn(),
  listChatbotRulesHandler: vi.fn(),
  createChatbotHandler: vi.fn(),
  updateChatbotHandler: vi.fn(),
  deleteChatbotHandler: vi.fn(),
  cloneChatbotHandler: vi.fn(),
}));

import { declareAccess } from "../../authz/registry.js";
import { chatbotRoutes } from "./chatbots.route.js";

function fakeServer() {
  const routes: string[] = [];
  const record = (method: string) => (url: string) => routes.push(`${method} ${url}`);
  return {
    routes,
    get: vi.fn(record("GET")),
    post: vi.fn(record("POST")),
    put: vi.fn(record("PUT")),
    delete: vi.fn(record("DELETE")),
  } as any;
}

describe("chatbotRoutes", () => {
  test("uses the same permissions as the per-channel chatbot routes", async () => {
    const server = fakeServer();
    await chatbotRoutes(server);
    expect(declareAccess).toHaveBeenCalledWith(server, {
      read: "automation.read",
      write: "automation.manage",
    });
  });

  test("serves list, get, rules, create, update, delete and clone", async () => {
    const server = fakeServer();
    await chatbotRoutes(server);
    expect(server.routes).toEqual([
      "GET /",
      "GET /:id",
      "GET /:id/rules",
      "POST /",
      "PUT /:id",
      "DELETE /:id",
      "POST /:id/clone",
    ]);
  });
});
