import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("./journeys.service.js", () => ({
  channelLock: vi.fn(),
  cloneChatbot: vi.fn(),
  createChatbot: vi.fn(),
  deleteChatbot: vi.fn(),
  getChatbot: vi.fn(),
  listChatbots: vi.fn(),
  updateChatbot: vi.fn(),
}));
vi.mock("./journeyStart.js", async (original) => ({
  ...(await original<typeof import("./journeyStart.js")>()),
  createStartRule: vi.fn(),
  chatbotRules: vi.fn(),
}));
// The real formatter's module pulls in the survey and Meta agent stack; plain strings are enough here.
vi.mock("../../meta/whatsapp/webhook/whatsapp.utils.js", () => ({
  parseToWhatsAppFormat: (value: unknown) => (typeof value === "string" ? value : ""),
}));
vi.mock("../rules/rules.service.js", () => ({
  verifyAutomationTriggerLimit: vi.fn(),
}));
vi.mock("../rules/metaFlow.service.js", () => ({
  startMetaFlow: vi.fn(),
}));
vi.mock("../../meta/whatsapp/webhook/whatsapp.controller.js", () => ({
  handleAutomatedReply: vi.fn(),
}));
vi.mock("../../../utils/redisConnection.js", () => ({
  default: { keys: vi.fn(), del: vi.fn() },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import connection from "../../../utils/redisConnection.js";
import { verifyAutomationTriggerLimit } from "../rules/rules.service.js";
import { startMetaFlow } from "../rules/metaFlow.service.js";
import { handleAutomatedReply } from "../../meta/whatsapp/webhook/whatsapp.controller.js";
import * as service from "./journeys.service.js";
import * as start from "./journeyStart.js";
import {
  cloneChatbotHandler,
  createChatbotHandler,
  deleteChatbotHandler,
  getChatbotHandler,
  initiateChatbotHandler,
  listChatbotRulesHandler,
  listChatbotsHandler,
  updateChatbotHandler,
} from "./journeys.controller.js";

type Mock = ReturnType<typeof vi.fn>;
const s = service as unknown as Record<keyof typeof service, Mock>;
const redis = connection as unknown as { keys: Mock; del: Mock };
const st = start as unknown as Record<"createStartRule" | "chatbotRules", Mock>;

const user = { orgId: "org-1" };
const IG_BOT = { id: "bot-1", orgId: "org-1", name: "Welcome", platform: "INSTAGRAM" };
const WA_BOT = { ...IG_BOT, platform: "WHATSAPP" };

function makeReply() {
  const reply: any = { statusCode: 200, payload: undefined };
  reply.code = vi.fn((c: number) => {
    reply.statusCode = c;
    return reply;
  });
  reply.send = vi.fn((p?: unknown) => {
    reply.payload = p;
    return reply;
  });
  return reply;
}
const req = (extra: Record<string, unknown>) => ({ user, ...extra }) as any;
const graph = (...types: string[]) => ({ json: { nodes: types.map((type) => ({ type })) } });

beforeEach(() => {
  vi.clearAllMocks();
  s.channelLock.mockResolvedValue(null);
  redis.keys.mockResolvedValue([]);
});

describe("list", () => {
  test("passes the channel filter through", async () => {
    s.listChatbots.mockResolvedValue({ data: [], locked: {} });
    const reply = makeReply();
    await listChatbotsHandler(req({ query: { platform: "FACEBOOK" } }), reply);
    expect(s.listChatbots).toHaveBeenCalledWith("org-1", "FACEBOOK", {
      withGraph: undefined,
      search: undefined,
    });
    expect(reply.payload).toEqual({ data: [], locked: {} });
  });

  test("a failure is a 500 with a message", async () => {
    s.listChatbots.mockRejectedValue(new Error("db down"));
    const reply = makeReply();
    await listChatbotsHandler(req({ query: {} }), reply);
    expect(reply.statusCode).toBe(500);
  });
});

describe("get", () => {
  test("another org's or a missing id is a 404", async () => {
    s.getChatbot.mockResolvedValue(null);
    const reply = makeReply();
    await getChatbotHandler(req({ params: { id: "bot-1" } }), reply);
    expect(reply.statusCode).toBe(404);
  });

  test("a WhatsApp chatbot is refused when WhatsApp isn't in the plan", async () => {
    s.getChatbot.mockResolvedValue(WA_BOT);
    s.channelLock.mockResolvedValue("not_in_plan");
    const reply = makeReply();
    await getChatbotHandler(req({ params: { id: "bot-1" } }), reply);
    expect(s.channelLock).toHaveBeenCalledWith("org-1", "WHATSAPP", { write: false });
    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toMatchObject({ reason: "subscription", missingFeatures: ["whatsapp"] });
  });

  test("returns the chatbot wrapped in data", async () => {
    s.getChatbot.mockResolvedValue(IG_BOT);
    const reply = makeReply();
    await getChatbotHandler(req({ params: { id: "bot-1" } }), reply);
    expect(reply.payload).toEqual({ data: IG_BOT });
  });
});

describe("create", () => {
  test("creates on the channel given", async () => {
    s.createChatbot.mockResolvedValue(IG_BOT);
    const reply = makeReply();
    const body = { name: "Welcome", platform: "INSTAGRAM", matchData: graph("textNode") };
    await createChatbotHandler(req({ body }), reply);
    expect(s.createChatbot).toHaveBeenCalledWith("org-1", body);
    expect(reply.statusCode).toBe(201);
    expect(reply.payload).toEqual({ data: IG_BOT });
  });

  test("makes the start rule when asked, and answers with it", async () => {
    s.createChatbot.mockResolvedValue(IG_BOT);
    const startRule = { rule: { id: "rule-1", name: "Welcome · start", isActive: false } };
    st.createStartRule.mockResolvedValue(startRule);
    const reply = makeReply();
    const body = {
      name: "Welcome",
      platform: "INSTAGRAM",
      matchData: graph("textNode"),
      start: { kind: "comment", accountId: "ig-1" },
    };
    await createChatbotHandler(req({ body }), reply);
    const { start: _start, ...fields } = body;
    expect(s.createChatbot).toHaveBeenCalledWith("org-1", fields);
    expect(st.createStartRule).toHaveBeenCalledWith(
      "org-1",
      { id: "bot-1", name: "Welcome", platform: "INSTAGRAM" },
      { kind: "comment", accountId: "ig-1" },
    );
    expect(reply.statusCode).toBe(201);
    expect(reply.payload).toEqual({ data: IG_BOT, startRule });
  });

  test("refuses a start the channel doesn't have, before creating anything", async () => {
    const reply = makeReply();
    const body = {
      name: "x",
      platform: "WHATSAPP",
      matchData: graph(),
      start: { kind: "story" },
    };
    await createChatbotHandler(req({ body }), reply);
    expect(reply.statusCode).toBe(400);
    expect(s.createChatbot).not.toHaveBeenCalled();
    expect(st.createStartRule).not.toHaveBeenCalled();
  });

  test("refuses blocks the channel can't send", async () => {
    const reply = makeReply();
    const body = { name: "x", platform: "FACEBOOK", matchData: graph("textNode", "listNode") };
    await createChatbotHandler(req({ body }), reply);
    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toMatchObject({ unsupportedBlocks: ["listNode"] });
    expect(s.createChatbot).not.toHaveBeenCalled();
  });

  test("refuses a text over the channel's limit, naming the block", async () => {
    const reply = makeReply();
    const matchData = {
      json: {
        nodes: [{ id: "n1", type: "textNode", data: { label: "Hi", body: "a".repeat(1001) } }],
      },
    };
    await createChatbotHandler(
      req({ body: { name: "x", platform: "INSTAGRAM", matchData } }),
      reply,
    );
    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toMatchObject({
      message: "Hi: Message text is over 1000 characters for Instagram",
      limitProblems: [{ nodeId: "n1" }],
    });
    expect(s.createChatbot).not.toHaveBeenCalled();
  });

  test("an expired subscription can't create WhatsApp chatbots", async () => {
    s.channelLock.mockResolvedValue("subscription_expired");
    const reply = makeReply();
    const body = { name: "x", platform: "WHATSAPP", matchData: graph() };
    await createChatbotHandler(req({ body }), reply);
    expect(s.channelLock).toHaveBeenCalledWith("org-1", "WHATSAPP", { write: true });
    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toMatchObject({ reason: "subscription_expired" });
  });
});

describe("update", () => {
  test("saves name and graph and returns the row", async () => {
    s.getChatbot.mockResolvedValue(IG_BOT);
    s.updateChatbot.mockResolvedValue({ ...IG_BOT, name: "Hello" });
    const reply = makeReply();
    const body = {
      name: "Hello",
      platform: "INSTAGRAM",
      matchData: graph("instagramQuickReplyNode"),
    };
    await updateChatbotHandler(req({ params: { id: "bot-1" }, body }), reply);
    expect(s.updateChatbot).toHaveBeenCalledWith("bot-1", "org-1", {
      name: "Hello",
      matchData: body.matchData,
    });
    expect(reply.payload).toEqual({ data: { ...IG_BOT, name: "Hello" } });
  });

  test("refuses a channel change", async () => {
    s.getChatbot.mockResolvedValue(IG_BOT);
    const reply = makeReply();
    await updateChatbotHandler(
      req({ params: { id: "bot-1" }, body: { platform: "WHATSAPP" } }),
      reply,
    );
    expect(reply.statusCode).toBe(409);
    expect(s.updateChatbot).not.toHaveBeenCalled();
  });

  test("refuses blocks from another channel", async () => {
    s.getChatbot.mockResolvedValue(WA_BOT);
    const reply = makeReply();
    const body = { matchData: graph("instagramGenericTemplateNode") };
    await updateChatbotHandler(req({ params: { id: "bot-1" }, body }), reply);
    expect(reply.statusCode).toBe(400);
  });

  test("a missing chatbot is a 404", async () => {
    s.getChatbot.mockResolvedValue(null);
    const reply = makeReply();
    await updateChatbotHandler(req({ params: { id: "bot-1" }, body: { name: "x" } }), reply);
    expect(reply.statusCode).toBe(404);
  });
});

describe("clone and delete", () => {
  test("clone copies the loaded chatbot under the new name", async () => {
    s.getChatbot.mockResolvedValue(IG_BOT);
    s.cloneChatbot.mockResolvedValue({ ...IG_BOT, id: "bot-2" });
    const reply = makeReply();
    await cloneChatbotHandler(req({ params: { id: "bot-1" }, body: { name: "Copy" } }), reply);
    expect(s.cloneChatbot).toHaveBeenCalledWith(IG_BOT, "org-1", "Copy");
    expect(reply.statusCode).toBe(201);
  });

  test("delete removes the chatbot and its round-robin keys", async () => {
    s.getChatbot.mockResolvedValue(WA_BOT);
    redis.keys.mockResolvedValue(["round_robin_index:t:bot-1:n"]);
    const reply = makeReply();
    await deleteChatbotHandler(req({ params: { id: "bot-1" } }), reply);
    expect(s.deleteChatbot).toHaveBeenCalledWith("bot-1", "org-1");
    expect(redis.keys).toHaveBeenCalledWith("round_robin_index:*:bot-1:*");
    expect(redis.del).toHaveBeenCalledWith("round_robin_index:t:bot-1:n");
    expect(reply.statusCode).toBe(204);
  });

  test("delete of a missing chatbot is a 404 and touches nothing", async () => {
    s.getChatbot.mockResolvedValue(null);
    const reply = makeReply();
    await deleteChatbotHandler(req({ params: { id: "bot-1" } }), reply);
    expect(reply.statusCode).toBe(404);
    expect(s.deleteChatbot).not.toHaveBeenCalled();
  });
});

describe("rules", () => {
  test("lists the rules that start an open chatbot", async () => {
    s.getChatbot.mockResolvedValue(IG_BOT);
    const rules = [{ id: "rule-1", isActive: false, keywords: [""] }];
    st.chatbotRules.mockResolvedValue(rules);
    const reply = makeReply();
    await listChatbotRulesHandler(req({ params: { id: "bot-1" } }), reply);
    expect(st.chatbotRules).toHaveBeenCalledWith("bot-1", "org-1");
    expect(reply.payload).toEqual({ data: rules });
  });

  test("404s another org's chatbot", async () => {
    s.getChatbot.mockResolvedValue(null);
    const reply = makeReply();
    await listChatbotRulesHandler(req({ params: { id: "bot-1" } }), reply);
    expect(reply.statusCode).toBe(404);
    expect(st.chatbotRules).not.toHaveBeenCalled();
  });
});

describe("initiate", () => {
  const limit = verifyAutomationTriggerLimit as unknown as Mock;
  const waStart = handleAutomatedReply as unknown as Mock;
  const metaStart = startMetaFlow as unknown as Mock;

  test("starts a WhatsApp chatbot for the phone number", async () => {
    s.getChatbot.mockResolvedValue(WA_BOT);
    limit.mockResolvedValue(true);
    const reply = makeReply();
    await initiateChatbotHandler(
      req({ params: { id: "bot-1" }, body: { recipientId: "919000000001" } }),
      reply,
    );
    expect(waStart).toHaveBeenCalledWith("org-1", null, null, "919000000001", null, "bot-1");
    expect(reply.payload).toEqual({ success: true });
  });

  test("refuses WhatsApp when the plan's limit is reached", async () => {
    s.getChatbot.mockResolvedValue(WA_BOT);
    limit.mockResolvedValue(false);
    const reply = makeReply();
    await initiateChatbotHandler(
      req({ params: { id: "bot-1" }, body: { recipientId: "9" } }),
      reply,
    );
    expect(reply.statusCode).toBe(403);
    expect(waStart).not.toHaveBeenCalled();
  });

  test("starts an Instagram chatbot on the given account", async () => {
    s.getChatbot.mockResolvedValue(IG_BOT);
    const reply = makeReply();
    await initiateChatbotHandler(
      req({ params: { id: "bot-1" }, body: { recipientId: "igsid-1", accountId: "iba-1" } }),
      reply,
    );
    expect(metaStart).toHaveBeenCalledWith("igsid-1", IG_BOT, "org-1", {
      platform: "INSTAGRAM",
      accountId: "iba-1",
    });
    expect(reply.payload).toEqual({ success: true });
  });

  test("needs the account on Instagram and Messenger", async () => {
    s.getChatbot.mockResolvedValue({ ...IG_BOT, platform: "FACEBOOK" });
    const reply = makeReply();
    await initiateChatbotHandler(
      req({ params: { id: "bot-1" }, body: { recipientId: "psid" } }),
      reply,
    );
    expect(reply.statusCode).toBe(400);
    expect(metaStart).not.toHaveBeenCalled();
  });

  test("won't start a chatbot that is switched off", async () => {
    s.getChatbot.mockResolvedValue({ ...WA_BOT, isActive: false });
    limit.mockResolvedValue(true);
    const reply = makeReply();
    await initiateChatbotHandler(
      req({ params: { id: "bot-1" }, body: { recipientId: "9" } }),
      reply,
    );
    expect(reply.statusCode).toBe(409);
    expect(waStart).not.toHaveBeenCalled();
  });

  test("404s another org's chatbot", async () => {
    s.getChatbot.mockResolvedValue(null);
    const reply = makeReply();
    await initiateChatbotHandler(req({ params: { id: "x" }, body: { recipientId: "1" } }), reply);
    expect(reply.statusCode).toBe(404);
  });
});
