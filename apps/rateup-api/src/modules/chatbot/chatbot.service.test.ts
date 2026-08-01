import { beforeEach, describe, expect, test, vi } from "vitest";

// chatbot.service.ts builds its base URLs into module-level consts at import
// time, so the env var has to exist before the module graph loads.
vi.hoisted(() => {
  process.env.CHATBOT_API_URL = "https://ai.test";
});

vi.mock("axios", () => ({
  default: { post: vi.fn(), get: vi.fn(), delete: vi.fn(), create: vi.fn() },
}));

vi.mock("../../utils/prisma.js", () => ({
  default: {
    chatbot: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    contact: { updateMany: vi.fn(), findMany: vi.fn() },
    user: { findMany: vi.fn() },
    usageStats: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../utils/commonUtils.js", () => ({ getShortUrlId: vi.fn(() => "SHORT123") }));
vi.mock("../subscription/subscription.service.js", () => ({ getSubscription: vi.fn() }));
vi.mock("./chatbot.controller.js", () => ({ getAxiosAIClient: vi.fn() }));

import axios, { AxiosInstance } from "axios";
import prisma from "../../utils/prisma.js";
import { getSubscription } from "../subscription/subscription.service.js";
import { getAxiosAIClient } from "./chatbot.controller.js";
import {
  createChatbot,
  deleteChatbotFromDatabase,
  deleteChatHistory,
  deleteEmbeddedSource,
  deleteManyEmbeddedSource,
  deletePublicChatHistory,
  getAIResponseForQuery,
  getAllChatbot,
  getChatbotDetails,
  getChatbotDetailsByShortUrlId,
  getChatBotHistory,
  getPublicAIResponseForQuery,
  getTextSummaryByAI,
  getUploadedSources,
  updateChatbotDetails,
  uploadFileForAIEmbed,
  uploadSourceForEmbed,
} from "./chatbot.service.js";

type Mock = ReturnType<typeof vi.fn>;

const http = axios as unknown as Record<string, Mock>;
const db = prisma as unknown as {
  chatbot: Record<string, Mock>;
  contact: Record<string, Mock>;
  user: Record<string, Mock>;
  usageStats: Record<string, Mock>;
};

const ORG = "11111111-1111-4111-8111-111111111111";
const JWT = "jwt-token";

function subscription(count: unknown = 100000) {
  return { features: { ai: { count } } };
}

beforeEach(() => {
  vi.clearAllMocks();
  http.post.mockResolvedValue({ data: { message: "hi", tokenUsage: null } });
  http.get.mockResolvedValue({ data: [] });
  http.delete.mockResolvedValue({ data: {} });
  db.chatbot.create.mockResolvedValue({ id: "bot-1" });
  db.chatbot.findFirst.mockResolvedValue(null);
  db.chatbot.findMany.mockResolvedValue([]);
  db.chatbot.findUnique.mockResolvedValue(null);
  db.chatbot.upsert.mockResolvedValue({ id: "bot-1", orgId: ORG });
  db.chatbot.delete.mockResolvedValue({ id: "bot-1" });
  db.contact.updateMany.mockResolvedValue({ count: 0 });
  db.contact.findMany.mockResolvedValue([]);
  db.user.findMany.mockResolvedValue([]);
  db.usageStats.findUnique.mockResolvedValue({
    aiPromptTokensCount: 10,
    aiCompletionTokensCount: 20,
  });
  db.usageStats.update.mockResolvedValue({});
  (getSubscription as Mock).mockResolvedValue(subscription());
});

// ===========================================================================
// The AI query paths
// ===========================================================================

describe("getAIResponseForQuery", () => {
  const input = { query: "hi", userId: "user-1", orgId: ORG, chatbotId: "bot-1" };

  test("sends the query with the org's allowance and current usage", async () => {
    await getAIResponseForQuery(input, JWT);

    const [, body, config] = http.post.mock.calls[0];
    expect(body).toMatchObject({
      query: "hi",
      orgId: ORG,
      allowedTokens: 100000,
      usedTokens: { aiPromptTokensCount: 10, aiCompletionTokensCount: 20 },
    });
    expect(config.headers.Authorization).toBe(`Bearer ${JWT}`);
  });

  test("returns only the message from the AI service", async () => {
    http.post.mockResolvedValue({ data: { message: "the answer", tokenUsage: null } });

    expect(await getAIResponseForQuery(input, JWT)).toBe("the answer");
  });

  test("records the tokens the answer consumed", async () => {
    http.post.mockResolvedValue({
      data: { message: "hi", tokenUsage: { promptTokens: 40, completionTokens: 60 } },
    });

    await getAIResponseForQuery(input, JWT);

    expect(db.usageStats.update).toHaveBeenCalledWith({
      where: { orgId: ORG },
      data: {
        aiPromptTokensCount: { increment: 40 },
        aiCompletionTokensCount: { increment: 60 },
      },
    });
  });

  test("records nothing when the AI service reports no usage", async () => {
    await getAIResponseForQuery(input, JWT);

    expect(db.usageStats.update).not.toHaveBeenCalled();
  });

  // Previously the allowance was read as `subscription.features.ai.count` with no guard,
  // so an org with no subscription row threw a bare TypeError before the query was sent.
  // Fixed to throw a clear, descriptive error while getting typed for the strict-mode
  // migration; the handler still turns it into a generic 500 either way.
  test("throws for an org with no subscription", async () => {
    (getSubscription as Mock).mockResolvedValue(null);

    await expect(getAIResponseForQuery(input, JWT)).rejects.toThrow(
      /No subscription found for org/,
    );
  });

  test("throws for a plan that describes no AI feature", async () => {
    (getSubscription as Mock).mockResolvedValue({ features: {} });

    await expect(getAIResponseForQuery(input, JWT)).rejects.toThrow(TypeError);
  });

  // NOTE: the allowance and the usage are read here and passed to the AI service
  // as ADVICE — nothing in this function compares them or refuses. Whether the
  // org is over its allowance is entirely the remote service's decision.
  // See issues.txt 21.1.
  test("sends the query even when usage already exceeds the allowance", async () => {
    (getSubscription as Mock).mockResolvedValue(subscription(10));
    db.usageStats.findUnique.mockResolvedValue({
      aiPromptTokensCount: 9_000_000,
      aiCompletionTokensCount: 9_000_000,
    });

    await getAIResponseForQuery(input, JWT);

    expect(http.post).toHaveBeenCalled();
  });

  test("sends undefined usage for an org with no usage row yet", async () => {
    db.usageStats.findUnique.mockResolvedValue(null);

    await getAIResponseForQuery(input, JWT);

    expect(http.post.mock.calls[0][1].usedTokens).toBeNull();
  });
});

describe("getPublicAIResponseForQuery", () => {
  const input = { query: "hi", orgId: ORG, userId: "anon-1" };

  beforeEach(() => {
    // The suite-wide default answers with `tokenUsage: null`, which this function
    // cannot survive (see the test below), so give it a usable answer by default.
    http.post.mockResolvedValue({
      data: { message: "hi", tokenUsage: { promptTokens: 1, completionTokens: 2 } },
    });
  });

  test("posts to the public endpoint with no authorization header", async () => {
    await getPublicAIResponseForQuery(input);

    const [url, , config] = http.post.mock.calls[0];
    expect(url).toContain("/api/public/chatbot");
    expect(config.headers).not.toHaveProperty("Authorization");
  });

  test("carries the org's allowance and usage the same way", async () => {
    http.post.mockResolvedValue({
      data: { message: "hi", tokenUsage: { promptTokens: 1, completionTokens: 2 } },
    });

    await getPublicAIResponseForQuery(input);

    expect(http.post.mock.calls[0][1]).toMatchObject({ allowedTokens: 100000 });
  });

  // NOTE: pins current behaviour. The authenticated variant guards the usage
  // write with `if (tokenUsage)`; this one does not. The `tokenUsage.promptTokens`
  // read happens while BUILDING the update argument — synchronously — so an
  // answer that arrives without a tokenUsage block throws a TypeError and the
  // whole call rejects. The AI service has already produced (and charged for)
  // the answer at that point; the customer gets a 500 and never sees it.
  // See issues.txt 21.2.
  test("throws away an answer that arrives without a token-usage block", async () => {
    http.post.mockResolvedValue({ data: { message: "the answer" } });

    await expect(getPublicAIResponseForQuery(input)).rejects.toThrow(TypeError);
  });

  test("the authenticated variant guards the same read and survives it", async () => {
    http.post.mockResolvedValue({ data: { message: "the answer" } });

    await expect(
      getAIResponseForQuery({ query: "hi", userId: "u", orgId: ORG, chatbotId: "b" }, JWT),
    ).resolves.toBe("the answer");
  });

  // NOTE: the usage write is not awaited, so the response is returned before the
  // tokens are recorded. A process that exits — or a failed write — loses the
  // billing record for that answer entirely. See issues.txt 21.2.
  test("returns before the usage write has settled", async () => {
    http.post.mockResolvedValue({
      data: { message: "hi", tokenUsage: { promptTokens: 1, completionTokens: 2 } },
    });
    let settle: () => void;
    db.usageStats.update.mockReturnValue(
      new Promise<void>((resolve) => {
        settle = resolve;
      }),
    );

    expect(await getPublicAIResponseForQuery(input)).toBe("hi");
    expect(db.usageStats.update).toHaveBeenCalled();

    settle!();
  });
});

// ===========================================================================
// The proxied AI-service calls
// ===========================================================================

describe("the proxied chatbot-service calls", () => {
  test("an embed upload carries the caller's token", async () => {
    await uploadSourceForEmbed({ source: "s", type: "TEXT", chatbotId: "bot-1" } as any, JWT);

    const [url, body, config] = http.post.mock.calls[0];
    expect(url).toContain("/embed-doc");
    expect(body).toEqual({ source: "s", type: "TEXT", chatbotId: "bot-1" });
    expect(config.headers.Authorization).toBe(`Bearer ${JWT}`);
  });

  test("a file upload is sent as multipart", async () => {
    await uploadFileForAIEmbed(new FormData(), JWT);

    expect(http.post.mock.calls[0][0]).toContain("/embed-doc/file");
    expect(http.post.mock.calls[0][2].headers["Content-Type"]).toBe("multipart/form-data");
  });

  test("listing sources appends the chatbot id as a query parameter", async () => {
    http.get.mockResolvedValue({ data: [{ id: "src-1" }] });

    const res = await getUploadedSources(JWT, "bot-1");

    expect(http.get.mock.calls[0][0]).toContain("chatbotId=bot-1");
    expect(res).toEqual([{ id: "src-1" }]);
  });

  test("listing without a chatbot id asks for everything the token can see", async () => {
    await getUploadedSources(JWT, undefined as any);

    expect(http.get.mock.calls[0][0]).not.toContain("chatbotId");
  });

  // NOTE: this is the only call that parses the base URL rather than passing it
  // to axios as a string. With CHATBOT_API_URL unset the base becomes
  // "undefined/api/chatbot", and `new URL` rejects it with a bare "Invalid URL"
  // before any request is attempted — while every sibling call fails later, at
  // the network layer, with a different message. See issues.txt 21.9.
  test("fails on an unparseable base url before any request is made", async () => {
    const original = process.env.CHATBOT_API_URL;
    process.env.CHATBOT_API_URL = "";
    vi.resetModules();
    const fresh = await import("./chatbot.service.js");

    await expect(fresh.getUploadedSources(JWT, "bot-1")).rejects.toThrow("Invalid URL");

    process.env.CHATBOT_API_URL = original;
    vi.resetModules();
  });

  test("a delete sends its payload in the request body", async () => {
    await deleteEmbeddedSource({ contentSource: "s", contentType: "TEXT" }, JWT);

    expect(http.delete.mock.calls[0][0]).toContain("/delete-source");
    expect(http.delete.mock.calls[0][1].data).toEqual({ contentSource: "s", contentType: "TEXT" });
  });

  test("a bulk delete uses its own endpoint", async () => {
    await deleteManyEmbeddedSource([{ contentSource: "s", contentType: "TEXT" }], JWT);

    expect(http.delete.mock.calls[0][0]).toContain("/delete-many-sources");
  });

  test("clearing chat history is scoped by the token alone", async () => {
    await deleteChatHistory(JWT);

    expect(http.delete.mock.calls[0][0]).toContain("/delete-chat-history");
    expect(http.delete.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${JWT}`);
  });

  // NOTE: the public variant identifies the history to delete by a bare userId
  // in the path and sends no credential at all. See issues.txt 21.3.
  test("clearing public chat history sends no credential", async () => {
    await deletePublicChatHistory("anon-1");

    expect(http.delete.mock.calls[0][0]).toContain("/api/public/chatbot/anon-1");
    expect(http.delete.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
  });
});

describe("getTextSummaryByAI", () => {
  const allowedTokens = { completionTokens: 100, promptTokens: 50 };
  const usedTokens = { aiCompletionTokensCount: 5, aiPromptTokensCount: 2 };

  test("posts the texts and the allowance to the summarize endpoint", async () => {
    const client = { post: vi.fn().mockResolvedValue({ data: { summary: "s" } }) };
    (getAxiosAIClient as Mock).mockResolvedValue(client);

    const res = await getTextSummaryByAI(["a", "b"], {} as any, allowedTokens, usedTokens);

    expect(client.post).toHaveBeenCalledWith("/chatbot/summarize", {
      texts: ["a", "b"],
      allowedTokens,
      usedTokens,
    });
    expect(res).toEqual({ summary: "s" });
  });

  // Previously this threw a template STRING rather than an Error, so the stack was lost
  // and any caller doing `err.message` or `instanceof Error` got nothing. Fixed to throw
  // a real Error while getting typed for the strict-mode migration.
  test("throws an Error with a clear message when the AI service fails", async () => {
    const client = {
      post: vi.fn().mockRejectedValue({ response: { data: "quota exceeded" } }),
    };
    (getAxiosAIClient as Mock).mockResolvedValue(client);

    await expect(getTextSummaryByAI(["a"], {} as any, allowedTokens, usedTokens)).rejects.toThrow(
      "Error in getting text summary, quota exceeded",
    );
  });

  // Previously getAxiosAIClient's swallowed failure (resolves undefined) fell through to
  // a bare `.post` property read, crashing with a cryptic TypeError. Fixed to guard and
  // throw a clear error while getting typed for the strict-mode migration.
  test("throws a clear error when the AI client could not be built", async () => {
    (getAxiosAIClient as Mock).mockResolvedValue(undefined);

    await expect(getTextSummaryByAI(["a"], {} as any, allowedTokens, usedTokens)).rejects.toThrow(
      /Unable to initialize AI client/,
    );
  });
});

// ===========================================================================
// The chatbot rows
// ===========================================================================

describe("createChatbot", () => {
  test("stamps the org and mints a short url id", async () => {
    await createChatbot(ORG, "Support bot");

    expect(db.chatbot.create).toHaveBeenCalledWith({
      data: { orgId: ORG, name: "Support bot", shortUrlId: "SHORT123" },
    });
  });

  // NOTE: shortUrlId is @unique and the id is minted with no retry. commonUtils
  // exports shortIdUniqueConstraintErrHandler for exactly this, and neither
  // chatbot writer uses it — a collision surfaces as a raw P2002.
  // See issues.txt 21.7.
  test("mints the id without any collision retry", async () => {
    const { getShortUrlId } = await import("../../utils/commonUtils.js");

    await createChatbot(ORG, "Support bot");

    expect((getShortUrlId as Mock).mock.calls).toHaveLength(1);
    expect(db.chatbot.findUnique).not.toHaveBeenCalled();
  });
});

describe("getChatbotDetails", () => {
  test("matches the chatbot and the org together", async () => {
    await getChatbotDetails(ORG, "bot-1");

    expect(db.chatbot.findFirst.mock.calls[0][0].where).toEqual({ id: "bot-1", orgId: ORG });
  });

  test("narrows to WhatsApp-enabled chatbots when asked", async () => {
    await getChatbotDetails(ORG, "bot-1", true);

    expect(db.chatbot.findFirst.mock.calls[0][0].where).toEqual({
      id: "bot-1",
      orgId: ORG,
      enableAllWaChat: true,
      enableWaChat: true,
    });
  });

  // NOTE: pins current behaviour. strictUndefinedChecks is not enabled in
  // prisma/schema.prisma, so `id: undefined` is dropped from the where clause
  // rather than matching nothing. Callers that pass only an org — createContact
  // and the WhatsApp inbox both do — get whichever chatbot the database returns
  // first, and an org with several chatbots gets an arbitrary one.
  // See issues.txt 21.4.
  test("drops the id filter entirely when no chatbot is named", async () => {
    await getChatbotDetails(ORG);

    expect(db.chatbot.findFirst.mock.calls[0][0].where).toEqual({ id: undefined, orgId: ORG });
  });
});

describe("getAllChatbot / getChatbotDetailsByShortUrlId", () => {
  test("lists only the caller's org", async () => {
    await getAllChatbot(ORG);

    expect(db.chatbot.findMany).toHaveBeenCalledWith({ where: { orgId: ORG } });
  });

  // The short url id is the public handle, so this one is deliberately unscoped.
  test("resolves a public short url id with no org", async () => {
    await getChatbotDetailsByShortUrlId("SHORT123");

    expect(db.chatbot.findUnique).toHaveBeenCalledWith({ where: { shortUrlId: "SHORT123" } });
  });
});

describe("updateChatbotDetails", () => {
  test("upserts on the chatbot id within the org", async () => {
    await updateChatbotDetails({ waPrompt: "be brief" }, ORG, "bot-1");

    expect(db.chatbot.upsert.mock.calls[0][0].where).toEqual({ orgId: ORG, id: "bot-1" });
    expect(db.chatbot.upsert.mock.calls[0][0].update).toEqual({ waPrompt: "be brief" });
  });

  // NOTE: pins current behaviour. The create branch writes only an org and a
  // fresh shortUrlId — the caller's `data` is discarded entirely. A PUT against a
  // chatbot id that does not exist therefore silently creates an empty "Default
  // Chatbot" and throws away every setting the user just submitted, answering
  // 201 as though it had saved them. See issues.txt 21.5.
  test("the create branch discards everything the caller submitted", async () => {
    await updateChatbotDetails({ waPrompt: "be brief", enableWaChat: true }, ORG, "bot-new");

    expect(db.chatbot.upsert.mock.calls[0][0].create).toEqual({
      shortUrlId: "SHORT123",
      orgId: ORG,
    });
  });

  test("returns nothing at all", async () => {
    expect(await updateChatbotDetails({ waPrompt: "x" }, ORG, "bot-1")).toBeUndefined();
  });

  // NOTE: toggling this one flag rewrites aiWaChat on EVERY contact in the org in
  // a single updateMany — and it fires whenever the key is present, even if the
  // value did not change. See issues.txt 21.5.
  test("toggling all-WhatsApp-chat rewrites every contact in the org", async () => {
    await updateChatbotDetails({ enableAllWaChat: true }, ORG, "bot-1");

    expect(db.contact.updateMany).toHaveBeenCalledWith({
      where: { orgId: ORG },
      data: { aiWaChat: true },
    });
  });

  test("fires the contact sweep even when the flag is set to false", async () => {
    await updateChatbotDetails({ enableAllWaChat: false }, ORG, "bot-1");

    expect(db.contact.updateMany.mock.calls[0][0].data).toEqual({ aiWaChat: false });
  });

  test("leaves the contacts alone when the flag is not part of the update", async () => {
    await updateChatbotDetails({ waPrompt: "be brief" }, ORG, "bot-1");

    expect(db.contact.updateMany).not.toHaveBeenCalled();
  });

  // NOTE: the sweep is scoped to the ORG, not to the chatbot — so an org running
  // several chatbots has one chatbot's toggle overwrite the AI flag for every
  // contact, including those talking to the others. See issues.txt 21.5.
  test("the sweep is scoped to the org, not to the chatbot that was toggled", async () => {
    await updateChatbotDetails({ enableAllWaChat: true }, ORG, "bot-1");

    expect(db.contact.updateMany.mock.calls[0][0].where).toEqual({ orgId: ORG });
  });
});

describe("deleteChatbotFromDatabase", () => {
  test("deletes only within the caller's org", async () => {
    await deleteChatbotFromDatabase({ chatbotId: "bot-1", orgId: ORG });

    expect(db.chatbot.delete).toHaveBeenCalledWith({ where: { id: "bot-1", orgId: ORG } });
  });

  test("lets a missing-row error escape to the caller", async () => {
    db.chatbot.delete.mockRejectedValue(Object.assign(new Error("not found"), { code: "P2025" }));

    await expect(
      deleteChatbotFromDatabase({ chatbotId: "nope", orgId: ORG }),
    ).rejects.toMatchObject({ code: "P2025" });
  });
});

// ===========================================================================
// getChatBotHistory
// ===========================================================================

describe("getChatBotHistory", () => {
  function client(history: unknown[]) {
    return { get: vi.fn().mockResolvedValue({ data: history }) } as unknown as AxiosInstance;
  }

  test("asks the AI service for one chatbot's history", async () => {
    const c = client([]);

    await getChatBotHistory(c, "bot-1");

    expect(c.get).toHaveBeenCalledWith("/chatbot/chathistory", { params: { chatbotId: "bot-1" } });
  });

  test("asks for everything when no chatbot is named", async () => {
    const c = client([]);

    await getChatBotHistory(c);

    expect((c.get as Mock).mock.calls[0][1]).toEqual({ params: {} });
  });

  test("attaches a staff user when the id matches one", async () => {
    db.user.findMany.mockResolvedValue([{ id: "u1", name: "Ann", email: "a@b.c" }]);

    const res = await getChatBotHistory(client([{ userId: "u1", messages: [] }]));

    expect(res[0].user).toEqual({ id: "u1", name: "Ann", email: "a@b.c" });
  });

  test("falls back to a contact when the id is not a staff user", async () => {
    db.contact.findMany.mockResolvedValue([{ id: "c1", name: "Bob", phone: "919000000001" }]);

    const res = await getChatBotHistory(client([{ userId: "c1", messages: [] }]));

    expect(res[0].user).toEqual({ id: "c1", name: "Bob", phone: "919000000001" });
  });

  test("labels an unknown id with the last four characters of its id", async () => {
    const res = await getChatBotHistory(client([{ userId: "anon-abcd1234", messages: [] }]));

    expect(res[0].user).toEqual({ name: "Anonymous_1234" });
  });

  test("keeps every other field of the history entry", async () => {
    const res = await getChatBotHistory(client([{ userId: "x", messages: [1, 2], at: "now" }]));

    expect(res[0]).toMatchObject({ userId: "x", messages: [1, 2], at: "now" });
  });

  // NOTE: pins current behaviour. Both lookups take the ids the AI service
  // returned and resolve them against the WHOLE User and Contact tables — no org
  // filter — and the reply carries the resolved email and phone. Whether a
  // foreign id can appear here depends on the remote service's own scoping,
  // which this module does not enforce. See issues.txt 21.8.
  test("resolves the ids against every org's users and contacts", async () => {
    await getChatBotHistory(client([{ userId: "u1", messages: [] }]));

    expect(db.user.findMany.mock.calls[0][0].where).toEqual({ id: { in: ["u1"] } });
    expect(db.contact.findMany.mock.calls[0][0].where).toEqual({ id: { in: ["u1"] } });
    expect(db.user.findMany.mock.calls[0][0].select).toHaveProperty("email");
    expect(db.contact.findMany.mock.calls[0][0].select).toHaveProperty("phone");
  });

  // NOTE: the anonymous fallback reads `hist.userId.slice(-4)` unguarded, so a
  // history entry with no user id takes the whole listing down.
  // See issues.txt 21.8.
  test("throws when a history entry carries no user id", async () => {
    await expect(getChatBotHistory(client([{ messages: [] }]))).rejects.toThrow(TypeError);
  });
});
