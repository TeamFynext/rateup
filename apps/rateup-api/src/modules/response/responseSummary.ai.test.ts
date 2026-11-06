import { beforeEach, describe, expect, test, vi } from "vitest";

// AI_API_URL is built at import time, so the env var has to exist before the
// module graph loads.
vi.hoisted(() => {
  process.env.CHATBOT_API_URL = "https://ai.test";
});

vi.mock("axios", () => ({ default: { create: vi.fn() } }));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../utils/jwt.js", () => ({ createJWT: vi.fn() }));

import axios from "axios";
import { createJWT } from "../../utils/jwt.js";
import { getAxiosAIClient, getTextSummaryByAI } from "./responseSummary.ai.js";

type Mock = ReturnType<typeof vi.fn>;

const create = (axios as unknown as { create: Mock }).create;
const request = () => ({ user: { userId: "u-1", orgId: "org-1" } }) as any;

beforeEach(() => {
  vi.clearAllMocks();
  (createJWT as Mock).mockResolvedValue("jwt-token");
});

describe("getAxiosAIClient", () => {
  test("builds a client against the AI base url with the caller's token", async () => {
    await getAxiosAIClient(request());

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://ai.test/api",
        timeout: 60000,
        headers: expect.objectContaining({ Authorization: "Bearer jwt-token" }),
      }),
    );
  });

  test("fails when the token cannot be minted", async () => {
    (createJWT as Mock).mockRejectedValue(new Error("no signing key"));

    await expect(getAxiosAIClient(request())).rejects.toThrow("no signing key");
  });
});

describe("getTextSummaryByAI", () => {
  const allowedTokens = { completionTokens: 100, promptTokens: 50 };
  const usedTokens = { aiCompletionTokensCount: 5, aiPromptTokensCount: 2 };

  test("posts the texts and the allowance to the summarize endpoint", async () => {
    const client = { post: vi.fn().mockResolvedValue({ data: { summary: "s" } }) };
    create.mockReturnValue(client);

    const res = await getTextSummaryByAI(["a", "b"], request(), allowedTokens, usedTokens);

    expect(client.post).toHaveBeenCalledWith("/chatbot/summarize", {
      texts: ["a", "b"],
      allowedTokens,
      usedTokens,
    });
    expect(res).toEqual({ summary: "s" });
  });

  test("throws an Error with a clear message when the AI service fails", async () => {
    const client = {
      post: vi.fn().mockRejectedValue({ response: { data: "quota exceeded" } }),
    };
    create.mockReturnValue(client);

    await expect(getTextSummaryByAI(["a"], request(), allowedTokens, usedTokens)).rejects.toThrow(
      "Error in getting text summary, quota exceeded",
    );
  });

  test("reports the client-construction failure rather than a property read", async () => {
    (createJWT as Mock).mockRejectedValue(new Error("no signing key"));

    await expect(getTextSummaryByAI(["a"], request(), allowedTokens, usedTokens)).rejects.toThrow(
      /no signing key/,
    );
  });
});
