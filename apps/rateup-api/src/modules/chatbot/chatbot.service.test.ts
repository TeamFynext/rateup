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
      update: vi.fn(),
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

vi.mock("../../../generated/prisma/client.js", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      meta: any;
      constructor(code: string, meta?: any) {
        super(code);
        this.code = code;
        this.meta = meta;
      }
    },
  },
}));

// The real retry helper, so createChatbot's collision handling is exercised rather
// than stubbed; only the id minting is replaced, to make the ids predictable.
vi.mock("../../utils/commonUtils.js", async () => {
  const actual = await vi.importActual<typeof import("../../utils/commonUtils.js")>(
    "../../utils/commonUtils.js",
  );
  return { ...actual, getShortUrlId: vi.fn(() => "SHORT123") };
});
vi.mock("../subscription/subscription.service.js", () => ({ getSubscription: vi.fn() }));
vi.mock("./chatbot.controller.js", () => ({ getAxiosAIClient: vi.fn() }));

import axios, { AxiosInstance } from "axios";
import { Prisma } from "../../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";
import { getSubscription } from "../subscription/subscription.service.js";
import { getAxiosAIClient } from "./chatbot.controller.js";
import {
  AiAllowanceError,
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

const FakePrismaKnownError = (Prisma as any).PrismaClientKnownRequestError as new (
  code: string,
  meta?: any,
) => Error & { code: string; meta: any };

/** The plan's AI allowance is an object of two counts, not a single number. */
function subscription(count: unknown = { promptTokens: 100000, completionTokens: 50000 }) {
  return { features: { ai: { active: true, count } } };
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
  db.chatbot.update.mockResolvedValue({ id: "bot-1", orgId: ORG });
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
      allowedTokens: { promptTokens: 100000, completionTokens: 50000 },
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

  // The allowance was read as `subscription.features.ai.count` with no guard, so an
  // org with no subscription row threw a bare TypeError before the query was sent.
  // It is a named AiAllowanceError now, which the handlers answer 403 to rather than
  // a blanket 500. See issues.txt 21.1.
  test("refuses an org with no subscription", async () => {
    (getSubscription as Mock).mockResolvedValue(null);

    await expect(getAIResponseForQuery(input, JWT)).rejects.toThrow(AiAllowanceError);
    expect(http.post).not.toHaveBeenCalled();
  });

  test("refuses a plan that describes no AI feature", async () => {
    (getSubscription as Mock).mockResolvedValue({ features: {} });

    await expect(getAIResponseForQuery(input, JWT)).rejects.toThrow(
      /does not include the AI feature/,
    );
    expect(http.post).not.toHaveBeenCalled();
  });

  test("refuses a plan whose AI feature is switched off", async () => {
    (getSubscription as Mock).mockResolvedValue({
      features: { ai: { active: false, count: { promptTokens: 10, completionTokens: 10 } } },
    });

    await expect(getAIResponseForQuery(input, JWT)).rejects.toThrow(/not active/);
  });

  // The allowance and the usage used to be passed to the AI service as ADVICE —
  // nothing here compared them, so a bug or an outage in the remote service's
  // enforcement meant unlimited billable usage. They are compared here now.
  // See issues.txt 21.1.
  test("refuses locally once the allowance is spent, before the query is sent", async () => {
    db.usageStats.findUnique.mockResolvedValue({
      aiPromptTokensCount: 9_000_000,
      aiCompletionTokensCount: 0,
    });

    await expect(getAIResponseForQuery(input, JWT)).rejects.toThrow(
      /allowance for org .* exhausted/,
    );
    expect(http.post).not.toHaveBeenCalled();
  });

  test("refuses on the completion allowance as well as the prompt one", async () => {
    db.usageStats.findUnique.mockResolvedValue({
      aiPromptTokensCount: 0,
      aiCompletionTokensCount: 9_000_000,
    });

    await expect(getAIResponseForQuery(input, JWT)).rejects.toThrow(AiAllowanceError);
  });

  // A plan storing something other than a number is left to the remote service —
  // refusing on a shape this module does not own would take working chatbots down.
  test("sends the query when the plan's allowance is not a number", async () => {
    (getSubscription as Mock).mockResolvedValue(subscription({ promptTokens: null }));

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

    expect(http.post.mock.calls[0][1]).toMatchObject({
      allowedTokens: { promptTokens: 100000, completionTokens: 50000 },
    });
  });

  test("refuses once the org's allowance is spent, like the authenticated variant", async () => {
    db.usageStats.findUnique.mockResolvedValue({
      aiPromptTokensCount: 9_000_000,
      aiCompletionTokensCount: 0,
    });

    await expect(getPublicAIResponseForQuery(input)).rejects.toThrow(AiAllowanceError);
    expect(http.post).not.toHaveBeenCalled();
  });

  // The usage write used to be unguarded here while the authenticated variant
  // guarded it: `increment: tokenUsage.promptTokens` was evaluated SYNCHRONOUSLY
  // while building the update argument, so an answer without a usage block threw a
  // TypeError and the answer the org had already paid for was discarded.
  // See issues.txt 21.2.
  test("keeps an answer that arrives without a token-usage block", async () => {
    http.post.mockResolvedValue({ data: { message: "the answer" } });

    expect(await getPublicAIResponseForQuery(input)).toBe("the answer");
    expect(db.usageStats.update).not.toHaveBeenCalled();
  });

  test("the authenticated variant survives the same answer", async () => {
    http.post.mockResolvedValue({ data: { message: "the answer" } });

    await expect(
      getAIResponseForQuery({ query: "hi", userId: "u", orgId: ORG, chatbotId: "b" }, JWT),
    ).resolves.toBe("the answer");
  });

  // The write used to be fired and not awaited, so the answer was returned before
  // the tokens were recorded and a failed write lost the billing record with its
  // rejection unhandled. See issues.txt 21.2.
  test("does not return until the usage write has settled", async () => {
    let settle: (() => void) | undefined;
    db.usageStats.update.mockReturnValue(
      new Promise<void>((resolve) => {
        settle = resolve;
      }),
    );

    let returned = false;
    const pending = getPublicAIResponseForQuery(input).then((message) => {
      returned = true;
      return message;
    });
    await Promise.resolve();

    expect(returned).toBe(false);
    settle!();
    expect(await pending).toBe("hi");
  });

  test("propagates a failed usage write rather than dropping it", async () => {
    db.usageStats.update.mockRejectedValue(new Error("db down"));

    await expect(getPublicAIResponseForQuery(input)).rejects.toThrow("db down");
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

  // This used to be the only call that parsed the base URL rather than passing it
  // to axios as a string: with CHATBOT_API_URL unset the base became the literal
  // "undefined/api/chatbot", and `new URL` rejected it with a bare "Invalid URL"
  // while every sibling failed later, at the network layer, with a different
  // message — one misconfiguration presenting as two unrelated symptoms. Every
  // call now fails the same way, naming the variable. See issues.txt 21.9.
  test("every call fails the same way, naming the variable, when the base url is unset", async () => {
    const original = process.env.CHATBOT_API_URL;
    process.env.CHATBOT_API_URL = "";

    await expect(getUploadedSources(JWT, "bot-1")).rejects.toThrow(
      "CHATBOT_API_URL is not configured",
    );
    await expect(deleteChatHistory(JWT)).rejects.toThrow("CHATBOT_API_URL is not configured");
    await expect(deletePublicChatHistory("anon-1")).rejects.toThrow(
      "CHATBOT_API_URL is not configured",
    );
    expect(http.get).not.toHaveBeenCalled();
    expect(http.delete).not.toHaveBeenCalled();

    process.env.CHATBOT_API_URL = original;
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

  // getAxiosAIClient used to swallow its own failure and resolve `undefined`, which
  // fell through to a bare `.post` property read several frames from the cause. It
  // throws now, and the failure arrives here with its own message. issues.txt 21.6.
  test("reports the client-construction failure rather than a property read", async () => {
    (getAxiosAIClient as Mock).mockRejectedValue(new Error("no signing key"));

    await expect(getTextSummaryByAI(["a"], {} as any, allowedTokens, usedTokens)).rejects.toThrow(
      /no signing key/,
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

  // shortUrlId is @unique and the id used to be minted once, so a collision
  // surfaced as a raw P2002 and the create failed. It retries now, minting a fresh
  // id — the helper every other short-id writer uses. See issues.txt 21.7.
  test("retries with a fresh id when the short url id collides", async () => {
    const { getShortUrlId } = await import("../../utils/commonUtils.js");
    db.chatbot.create.mockRejectedValueOnce(
      new FakePrismaKnownError("P2002", { target: ["shortUrlId"] }),
    );

    await createChatbot(ORG, "Support bot");

    expect(db.chatbot.create).toHaveBeenCalledTimes(2);
    expect((getShortUrlId as Mock).mock.calls).toHaveLength(2);
  });

  test("does not retry any other failure", async () => {
    db.chatbot.create.mockRejectedValue(new FakePrismaKnownError("P2003", { target: ["orgId"] }));

    await expect(createChatbot(ORG, "Support bot")).rejects.toMatchObject({ code: "P2003" });
    expect(db.chatbot.create).toHaveBeenCalledTimes(1);
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

  // strictUndefinedChecks is not enabled in prisma/schema.prisma, so `id: undefined`
  // is dropped from the where clause rather than matching nothing — callers that
  // pass only an org (createContact, the WhatsApp inbox) match the whole org. That
  // is still true; what changed is that the row they get is no longer arbitrary.
  // See issues.txt 21.4.
  test("drops the id filter when no chatbot is named, but orders the fallback", async () => {
    await getChatbotDetails(ORG);

    expect(db.chatbot.findFirst.mock.calls[0][0].where).toEqual({ id: undefined, orgId: ORG });
    expect(db.chatbot.findFirst.mock.calls[0][0].orderBy).toEqual({ id: "asc" });
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
  beforeEach(() => {
    db.chatbot.update.mockResolvedValue({ id: "bot-1", orgId: ORG });
    db.chatbot.findFirst.mockResolvedValue({ enableAllWaChat: false });
  });

  test("updates the chatbot id within the org", async () => {
    await updateChatbotDetails({ waPrompt: "be brief" }, ORG, "bot-1");

    expect(db.chatbot.update.mock.calls[0][0].where).toEqual({ orgId: ORG, id: "bot-1" });
    expect(db.chatbot.update.mock.calls[0][0].data).toEqual({ waPrompt: "be brief" });
  });

  // This was an upsert whose create branch wrote only `{ shortUrlId, orgId }`, so a
  // PUT against an id that did not exist created an empty "Default Chatbot" and
  // threw away every setting submitted with it. It is an update now, and a missing
  // row raises P2025 for the handler to answer 404 to. See issues.txt 21.5.
  test("never creates a chatbot on the update path", async () => {
    await updateChatbotDetails({ waPrompt: "be brief", enableWaChat: true }, ORG, "bot-new");

    expect(db.chatbot.upsert).not.toHaveBeenCalled();
    expect(db.chatbot.create).not.toHaveBeenCalled();
  });

  test("lets a missing row's P2025 reach the handler", async () => {
    db.chatbot.update.mockRejectedValue(new FakePrismaKnownError("P2025"));

    await expect(updateChatbotDetails({ waPrompt: "x" }, ORG, "gone")).rejects.toMatchObject({
      code: "P2025",
    });
  });

  // It used to return nothing, so the handler's reply carried an empty body and the
  // client could not read back what had been saved. See issues.txt 21.5.
  test("returns the updated row", async () => {
    expect(await updateChatbotDetails({ waPrompt: "x" }, ORG, "bot-1")).toEqual({
      id: "bot-1",
      orgId: ORG,
    });
  });

  test("toggling all-WhatsApp-chat sweeps the org's contacts", async () => {
    await updateChatbotDetails({ enableAllWaChat: true }, ORG, "bot-1");

    expect(db.contact.updateMany).toHaveBeenCalledWith({
      where: { orgId: ORG, chatbotId: { in: ["", "bot-1"] } },
      data: { aiWaChat: true },
    });
  });

  // The sweep used to cover every contact in the org, so one chatbot's toggle
  // overwrote the AI flag for contacts talking to a different chatbot. Contacts
  // bound to another chatbot are left alone now. See issues.txt 21.5.
  test("leaves contacts bound to another chatbot alone", async () => {
    await updateChatbotDetails({ enableAllWaChat: true }, ORG, "bot-1");

    expect(db.contact.updateMany.mock.calls[0][0].where.chatbotId).toEqual({ in: ["", "bot-1"] });
  });

  test("sweeps on a switch-off too", async () => {
    db.chatbot.findFirst.mockResolvedValue({ enableAllWaChat: true });

    await updateChatbotDetails({ enableAllWaChat: false }, ORG, "bot-1");

    expect(db.contact.updateMany.mock.calls[0][0].data).toEqual({ aiWaChat: false });
  });

  // It used to fire whenever the key was present, even when the value had not
  // changed — an org-wide write on a no-op save. See issues.txt 21.5.
  test("does not sweep when the flag is submitted unchanged", async () => {
    db.chatbot.findFirst.mockResolvedValue({ enableAllWaChat: true });

    await updateChatbotDetails({ enableAllWaChat: true }, ORG, "bot-1");

    expect(db.contact.updateMany).not.toHaveBeenCalled();
  });

  test("leaves the contacts alone when the flag is not part of the update", async () => {
    await updateChatbotDetails({ waPrompt: "be brief" }, ORG, "bot-1");

    expect(db.contact.updateMany).not.toHaveBeenCalled();
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

    await getChatBotHistory(c, ORG, "bot-1");

    expect(c.get).toHaveBeenCalledWith("/chatbot/chathistory", { params: { chatbotId: "bot-1" } });
  });

  test("asks for everything when no chatbot is named", async () => {
    const c = client([]);

    await getChatBotHistory(c, ORG);

    expect((c.get as Mock).mock.calls[0][1]).toEqual({ params: {} });
  });

  test("attaches a staff user when the id matches one", async () => {
    db.user.findMany.mockResolvedValue([{ id: "u1", name: "Ann", email: "a@b.c" }]);

    const res = await getChatBotHistory(client([{ userId: "u1", messages: [] }]), ORG);

    expect(res[0].user).toEqual({ id: "u1", name: "Ann", email: "a@b.c" });
  });

  test("falls back to a contact when the id is not a staff user", async () => {
    db.contact.findMany.mockResolvedValue([{ id: "c1", name: "Bob", phone: "919000000001" }]);

    const res = await getChatBotHistory(client([{ userId: "c1", messages: [] }]), ORG);

    expect(res[0].user).toEqual({ id: "c1", name: "Bob", phone: "919000000001" });
  });

  test("labels an unknown id with the last four characters of its id", async () => {
    const res = await getChatBotHistory(client([{ userId: "anon-abcd1234", messages: [] }]), ORG);

    expect(res[0].user).toEqual({ name: "Anonymous_1234" });
  });

  test("keeps every other field of the history entry", async () => {
    const res = await getChatBotHistory(
      client([{ userId: "x", messages: [1, 2], at: "now" }]),
      ORG,
    );

    expect(res[0]).toMatchObject({ userId: "x", messages: [1, 2], at: "now" });
  });

  // Both lookups used to resolve the ids the AI service returned against the WHOLE
  // User and Contact tables while selecting email and phone, so an id from outside
  // the caller's org would have come back with that person's contact details. The
  // module does not control what the remote service returns; it scopes what it
  // resolves. See issues.txt 21.8.
  test("resolves the ids only within the caller's org", async () => {
    await getChatBotHistory(client([{ userId: "u1", messages: [] }]), ORG);

    expect(db.user.findMany.mock.calls[0][0].where).toEqual({
      id: { in: ["u1"] },
      orgMember: { some: { orgId: ORG } },
    });
    expect(db.contact.findMany.mock.calls[0][0].where).toEqual({ id: { in: ["u1"] }, orgId: ORG });
  });

  test("a foreign id resolves to Anonymous rather than to a name", async () => {
    db.user.findMany.mockResolvedValue([]);
    db.contact.findMany.mockResolvedValue([]);

    const res = await getChatBotHistory(client([{ userId: "other-org-9876", messages: [] }]), ORG);

    expect(res[0].user).toEqual({ name: "Anonymous_9876" });
  });

  // The anonymous fallback read `hist.userId.slice(-4)` unguarded, so one entry
  // with no user id took the whole listing down. See issues.txt 21.8.
  test("degrades to Anonymous for an entry that carries no user id", async () => {
    const res = await getChatBotHistory(client([{ messages: [] }]), ORG);

    expect(res[0].user).toEqual({ name: "Anonymous_unknown" });
    expect(db.user.findMany.mock.calls[0][0].where.id).toEqual({ in: [] });
  });
});
