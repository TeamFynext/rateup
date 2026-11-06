import { beforeEach, describe, expect, test, vi } from "vitest";

const findFirst = vi.fn();
const updateMany = vi.fn();
vi.mock("../../utils/prisma.js", () => ({
  default: { waMessage: { findFirst }, usageStats: { updateMany } },
}));

const { estimateTokens, messageText, recordMetaAiTokenUsage } =
  await import("./metaAgent.usage.js");

beforeEach(() => vi.clearAllMocks());

describe("estimateTokens", () => {
  test("is about four characters to a token, rounded up", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens(undefined)).toBe(0);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
  });
});

describe("messageText", () => {
  test("reads text, captions, and serialises anything structured", () => {
    expect(messageText({ type: "text", text: { body: "hi" } })).toBe("hi");
    expect(messageText({ type: "image", image: { caption: "menu" } })).toBe("menu");
    expect(messageText({ type: "interactive", interactive: { a: 1 } })).toBe('{"a":1}');
    expect(messageText(null)).toBe("");
  });
});

describe("recordMetaAiTokenUsage", () => {
  test("counts the reply as completion and the customer's last message as prompt", async () => {
    findFirst.mockResolvedValue({
      messageBody: {
        exchangeProcess: "receive",
        receive: { messages: [{ type: "text", text: { body: "What about pricing" } }] },
      },
    });

    await recordMetaAiTokenUsage({
      orgId: "org-1",
      contactId: "contact-1",
      replyBody: { type: "text", text: { body: "We offer a Conversation pack." } },
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: { orgId: "org-1" },
      data: {
        aiPromptTokensCount: { increment: 5 }, // 18 characters
        aiCompletionTokensCount: { increment: 8 }, // 29 characters
      },
    });
  });

  test("never throws — the reply is already stored", async () => {
    findFirst.mockRejectedValue(new Error("db down"));
    await expect(
      recordMetaAiTokenUsage({ orgId: "org-1", contactId: "c", replyBody: {} }),
    ).resolves.toBeUndefined();
    expect(updateMany).not.toHaveBeenCalled();
  });
});
