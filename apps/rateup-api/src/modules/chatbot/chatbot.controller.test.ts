import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.CHATBOT_API_URL = "https://ai.test";
});

vi.mock("axios", () => ({ default: { create: vi.fn(() => ({ get: vi.fn(), post: vi.fn() })) } }));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../utils/jwt.js", () => ({ createJWT: vi.fn(async () => "jwt-token") }));

vi.mock("./chatbot.service.js", () => ({
  AI_API_URL: "https://ai.test/api",
  // Stands in for the real class: the handlers branch on `instanceof`, and the
  // instance they see has to come from the module they import.
  AiAllowanceError: class AiAllowanceError extends Error {},
  createChatbot: vi.fn(),
  deleteChatbotFromDatabase: vi.fn(),
  deleteChatHistory: vi.fn(),
  deleteEmbeddedSource: vi.fn(),
  deleteManyEmbeddedSource: vi.fn(),
  deletePublicChatHistory: vi.fn(),
  getAIResponseForQuery: vi.fn(),
  getAllChatbot: vi.fn(),
  getChatbotDetails: vi.fn(),
  getChatbotDetailsByShortUrlId: vi.fn(),
  getChatBotHistory: vi.fn(),
  getPublicAIResponseForQuery: vi.fn(),
  getUploadedSources: vi.fn(),
  updateChatbotDetails: vi.fn(),
  uploadFileForAIEmbed: vi.fn(),
  uploadSourceForEmbed: vi.fn(),
}));

import axios from "axios";
import { createJWT } from "../../utils/jwt.js";
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
  getUploadedSources,
  updateChatbotDetails,
  uploadFileForAIEmbed,
  uploadSourceForEmbed,
} from "./chatbot.service.js";
import { createChatbotSchema } from "./chatbot.schema.js";
import {
  chatbotMessageHandler,
  createChatbotHanlder,
  deleteChatHistoryHandler,
  deleteEmbeddedSourceHandler,
  deleteManyEmbeddedSourcesHandler,
  deletePublicChatHistoryHandler,
  deleteSelectedChatbotHandler,
  getAllChatbotsByOrgHandler,
  getAxiosAIClient,
  getChatbotDetailsHandler,
  getChatbotPublicPageStatusHandler,
  getChatHitoryByOrgHandler,
  getUploadedSourceHandler,
  publicChatbotMessageHandler,
  updateChatbotDetailsHanlder,
  uploadFileForAIEmbedHandler,
  uploadSourceForEmbedHandler,
} from "./chatbot.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const ORG = "11111111-1111-4111-8111-111111111111";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function request(over: Record<string, unknown> = {}): any {
  return { user: { orgId: ORG }, userId: "user-1", params: {}, query: {}, body: {}, ...over };
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

/// A multipart request whose parts() yields the given sequence.
function multipart(parts: any[]) {
  return request({
    parts: () => ({
      async *[Symbol.asyncIterator]() {
        for (const part of parts) yield part;
      },
    }),
  });
}

function filePart(over: Record<string, unknown> = {}) {
  return {
    type: "file",
    mimetype: "application/pdf",
    filename: "doc.pdf",
    toBuffer: vi.fn(async () => Buffer.from("pdf")),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (createJWT as Mock).mockResolvedValue("jwt-token");
  (uploadSourceForEmbed as Mock).mockResolvedValue({ status: 200 });
  (uploadFileForAIEmbed as Mock).mockResolvedValue({ status: 200 });
  (getAIResponseForQuery as Mock).mockResolvedValue("the answer");
  (getPublicAIResponseForQuery as Mock).mockResolvedValue("the public answer");
  (getUploadedSources as Mock).mockResolvedValue([]);
  (deleteEmbeddedSource as Mock).mockResolvedValue({});
  (deleteManyEmbeddedSource as Mock).mockResolvedValue({});
  (deleteChatHistory as Mock).mockResolvedValue({});
  (deletePublicChatHistory as Mock).mockResolvedValue({});
  (getChatbotDetailsByShortUrlId as Mock).mockResolvedValue({
    orgId: ORG,
    publicPageStatus: "ACTIVE",
  });
  (createChatbot as Mock).mockResolvedValue({ id: "bot-1" });
  (getAllChatbot as Mock).mockResolvedValue([]);
  (getChatbotDetails as Mock).mockResolvedValue({ id: "bot-1" });
  (updateChatbotDetails as Mock).mockResolvedValue(undefined);
  (getChatBotHistory as Mock).mockResolvedValue([]);
  (deleteChatbotFromDatabase as Mock).mockResolvedValue({ id: "bot-1" });
});

// ===========================================================================
// The public endpoints
// ===========================================================================

describe("publicChatbotMessageHandler", () => {
  const body = { query: "hi", chatbotId: "SHORT123", userId: "anon-1" };

  test("resolves the org from the public short url id and answers", async () => {
    const rep = reply();

    await publicChatbotMessageHandler(request({ body }), rep);

    expect(getChatbotDetailsByShortUrlId).toHaveBeenCalledWith("SHORT123");
    expect(getPublicAIResponseForQuery).toHaveBeenCalledWith({
      query: "hi",
      orgId: ORG,
      userId: "anon-1",
    });
    expect(answer(rep)).toEqual({ code: 200, body: { message: "the public answer" } });
  });

  test("refuses when the chatbot's public page is switched off", async () => {
    (getChatbotDetailsByShortUrlId as Mock).mockResolvedValue({
      orgId: ORG,
      publicPageStatus: "INACTIVE",
    });
    const rep = reply();

    await publicChatbotMessageHandler(request({ body }), rep);

    expect(getPublicAIResponseForQuery).not.toHaveBeenCalled();
    expect(answer(rep)).toEqual({
      code: 403,
      body: { message: "This chatbot's public page is not active" },
    });
  });

  test("refuses a chatbot whose public page status was never set", async () => {
    (getChatbotDetailsByShortUrlId as Mock).mockResolvedValue({ orgId: ORG });
    const rep = reply();

    await publicChatbotMessageHandler(request({ body }), rep);

    expect(answer(rep).code).toBe(403);
  });

  test("hides an exhausted allowance behind an availability message", async () => {
    (getPublicAIResponseForQuery as Mock).mockRejectedValue(
      new AiAllowanceError("The AI token allowance for org X is exhausted"),
    );
    const rep = reply();

    await publicChatbotMessageHandler(request({ body }), rep);

    expect(answer(rep)).toEqual({ code: 403, body: { message: "This chatbot is unavailable" } });
  });

  test("takes the conversation's user id from the request body", async () => {
    await publicChatbotMessageHandler(
      request({ body: { ...body, userId: "somebody-elses-id" } }),
      reply(),
    );

    expect((getPublicAIResponseForQuery as Mock).mock.calls[0][0].userId).toBe("somebody-elses-id");
  });

  // Previously an unknown short url id made getChatbotDetailsByShortUrlId return null, and
  // an unguarded destructure on the next line threw — so a bad link was a 500 rather than
  // a 404. Fixed to guard and answer a proper 404 while getting typed for the strict-mode
  // migration.
  test("answers a 404 for a short url id that matches no chatbot", async () => {
    (getChatbotDetailsByShortUrlId as Mock).mockResolvedValue(null);
    const rep = reply();

    await publicChatbotMessageHandler(request({ body }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { message: "Chatbot not found" } });
  });

  test("hides the underlying failure behind a generic message", async () => {
    (getPublicAIResponseForQuery as Mock).mockRejectedValue(new Error("openai refused"));
    const rep = reply();

    await publicChatbotMessageHandler(request({ body }), rep);

    expect(answer(rep).body).toEqual({ message: "Something went wrong!" });
  });
});

describe("deletePublicChatHistoryHandler", () => {
  test("deletes a history by a path id, with no session and no org", async () => {
    const rep = reply();

    await deletePublicChatHistoryHandler({ params: { userId: "somebody-elses-id" } } as any, rep);

    expect(deletePublicChatHistory).toHaveBeenCalledWith("somebody-elses-id");
    expect(answer(rep).code).toBe(200);
  });

  test("reports a failure as a 500", async () => {
    (deletePublicChatHistory as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await deletePublicChatHistoryHandler({ params: { userId: "anon-1" } } as any, rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "something went wrong" } });
  });
});

describe("getChatbotPublicPageStatusHandler", () => {
  test("reports the public page status for a short url id", async () => {
    const rep = reply();

    await getChatbotPublicPageStatusHandler(request({ params: { chatbotId: "SHORT123" } }), rep);

    expect(answer(rep)).toEqual({ code: 200, body: { publicPageStatus: "ACTIVE" } });
  });

  // Previously this destructured off a possibly-null lookup and crashed into the generic
  // 500 handler. Fixed to guard and answer a proper 404 while getting typed for the
  // strict-mode migration.
  test("answers a 404 for an unknown short url id", async () => {
    (getChatbotDetailsByShortUrlId as Mock).mockResolvedValue(null);
    const rep = reply();

    await getChatbotPublicPageStatusHandler(request({ params: { chatbotId: "nope" } }), rep);

    expect(answer(rep).code).toBe(404);
  });
});

// ===========================================================================
// The authenticated message and source endpoints
// ===========================================================================

describe("chatbotMessageHandler", () => {
  test("passes the session user and org alongside the body's chatbot id", async () => {
    const rep = reply();

    await chatbotMessageHandler(request({ body: { query: "hi", chatbotId: "bot-1" } }), rep);

    expect(getAIResponseForQuery).toHaveBeenCalledWith(
      { query: "hi", userId: "user-1", orgId: ORG, chatbotId: "bot-1" },
      "jwt-token",
    );
    expect(answer(rep)).toEqual({ code: 200, body: { message: "the answer" } });
  });

  test("refuses a chatbot id the caller's org does not own", async () => {
    (getChatbotDetails as Mock).mockResolvedValue(null);
    const rep = reply();

    await chatbotMessageHandler(
      request({ body: { query: "hi", chatbotId: "bot-from-another-org" } }),
      rep,
    );

    expect(getChatbotDetails).toHaveBeenCalledWith(ORG, "bot-from-another-org");
    expect(getAIResponseForQuery).not.toHaveBeenCalled();
    expect(answer(rep)).toEqual({ code: 404, body: { message: "Chatbot not found" } });
  });

  test("answers 403 when the org's AI allowance is spent", async () => {
    (getAIResponseForQuery as Mock).mockRejectedValue(
      new AiAllowanceError("The AI token allowance for org X is exhausted"),
    );
    const rep = reply();

    await chatbotMessageHandler(request({ body: { query: "hi", chatbotId: "bot-1" } }), rep);

    expect(answer(rep)).toEqual({
      code: 403,
      body: { message: "The AI token allowance for org X is exhausted" },
    });
  });

  test("reports a failure with a generic message", async () => {
    (getAIResponseForQuery as Mock).mockRejectedValue(new Error("quota"));
    const rep = reply();

    await chatbotMessageHandler(request({ body: { query: "hi", chatbotId: "bot-1" } }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Something went wrong!" } });
  });
});

describe("uploadSourceForEmbedHandler", () => {
  test("forwards the body with a freshly minted token", async () => {
    const rep = reply();

    await uploadSourceForEmbedHandler(
      request({ body: { source: "https://x", type: "URL", chatbotId: "bot-1" } }),
      rep,
    );

    expect(createJWT).toHaveBeenCalledWith({ orgId: ORG });
    expect(uploadSourceForEmbed).toHaveBeenCalledWith(
      { source: "https://x", type: "URL", chatbotId: "bot-1" },
      "jwt-token",
    );
    expect(answer(rep).code).toBe(200);
  });

  test("sends only the response data, not the axios envelope", async () => {
    (uploadSourceForEmbed as Mock).mockResolvedValue({
      status: 200,
      data: { ok: true },
      config: { headers: { Authorization: "Bearer jwt-token" } },
    });
    const rep = reply();

    await uploadSourceForEmbedHandler(request({ body: {} }), rep);

    expect(answer(rep).body).toEqual({ ok: true });
  });

  test("reports a failure with a generic message", async () => {
    (uploadSourceForEmbed as Mock).mockRejectedValue(new Error("bad source"));
    const rep = reply();

    await uploadSourceForEmbedHandler(request({ body: {} }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Something went wrong" } });
  });
});

describe("uploadFileForAIEmbedHandler", () => {
  test("accepts a pdf and forwards it with the chatbot id", async () => {
    const rep = reply();

    await uploadFileForAIEmbedHandler(
      multipart([{ type: "field", fieldname: "chatbotId", value: "bot-1" }, filePart()]) as any,
      rep,
    );

    expect(uploadFileForAIEmbed).toHaveBeenCalledWith(expect.any(FormData), "jwt-token");
    const form = (uploadFileForAIEmbed as Mock).mock.calls[0][0] as FormData;
    expect(form.get("chatbotId")).toBe("bot-1");
    expect(form.get("file")).toBeInstanceOf(Blob);
    expect(answer(rep).code).toBe(200);
  });

  test("accepts an epub", async () => {
    const rep = reply();

    await uploadFileForAIEmbedHandler(
      multipart([filePart({ mimetype: "application/epub+zip" })]) as any,
      rep,
    );

    expect(answer(rep).code).toBe(200);
  });

  test("refuses any other file type", async () => {
    const rep = reply();

    await uploadFileForAIEmbedHandler(multipart([filePart({ mimetype: "text/html" })]) as any, rep);

    expect(answer(rep)).toEqual({
      code: 400,
      body: { message: "This file type is not permitted." },
    });
    expect(uploadFileForAIEmbed).not.toHaveBeenCalled();
  });

  test("refuses a request that carries no file", async () => {
    const rep = reply();

    await uploadFileForAIEmbedHandler(
      multipart([{ type: "field", fieldname: "chatbotId", value: "bot-1" }]) as any,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 400, body: { message: "File is required." } });
  });

  test("refuses a request carrying more than one file", async () => {
    const first = filePart({ filename: "one.pdf" });
    const second = filePart({ filename: "two.pdf" });
    const rep = reply();

    await uploadFileForAIEmbedHandler(multipart([first, second]) as any, rep);

    expect(second.toBuffer).not.toHaveBeenCalled();
    expect(uploadFileForAIEmbed).not.toHaveBeenCalled();
    expect(answer(rep)).toEqual({
      code: 400,
      body: { message: "Only one file may be uploaded at a time." },
    });
  });

  test("returns as soon as a disallowed type is seen", async () => {
    const good = filePart({ filename: "ok.pdf" });
    const rep = reply();

    await uploadFileForAIEmbedHandler(
      multipart([filePart({ mimetype: "text/html" }), good]) as any,
      rep,
    );

    expect(good.toBuffer).not.toHaveBeenCalled();
    expect(rep.send).toHaveBeenCalledTimes(1);
  });
});

describe("the source and history endpoints", () => {
  test("listing sources forwards the query's chatbot id", async () => {
    const rep = reply();

    await getUploadedSourceHandler(request({ query: { chatbotId: "bot-1" } }), rep);

    expect(getUploadedSources).toHaveBeenCalledWith("jwt-token", "bot-1");
    expect(answer(rep).code).toBe(200);
  });

  test("listing sources with no chatbot id asks for all of them", async () => {
    await getUploadedSourceHandler(request({ query: {} }), reply());

    expect(getChatbotDetails).not.toHaveBeenCalled();
    expect(getUploadedSources).toHaveBeenCalledWith("jwt-token", undefined);
  });

  test("refuses to list the sources of a chatbot the org does not own", async () => {
    (getChatbotDetails as Mock).mockResolvedValue(null);
    const rep = reply();

    await getUploadedSourceHandler(request({ query: { chatbotId: "bot-other-org" } }), rep);

    expect(getUploadedSources).not.toHaveBeenCalled();
    expect(answer(rep)).toEqual({ code: 404, body: { message: "Chatbot not found" } });
  });

  test("deleting a source forwards the body", async () => {
    const rep = reply();

    await deleteEmbeddedSourceHandler(
      request({ body: { contentSource: "s", contentType: "URL" } }),
      rep,
    );

    expect(deleteEmbeddedSource).toHaveBeenCalledWith(
      { contentSource: "s", contentType: "URL" },
      "jwt-token",
    );
    expect(answer(rep).code).toBe(200);
  });

  test("a bulk source delete forwards the array", async () => {
    const rep = reply();

    await deleteManyEmbeddedSourcesHandler(request({ body: [{ contentSource: "s" }] }), rep);

    expect(deleteManyEmbeddedSource).toHaveBeenCalledWith([{ contentSource: "s" }], "jwt-token");
    expect(answer(rep).code).toBe(200);
  });

  test("clearing chat history is scoped by the caller's own token", async () => {
    const rep = reply();

    await deleteChatHistoryHandler(request(), rep);

    expect(deleteChatHistory).toHaveBeenCalledWith("jwt-token");
    expect(answer(rep).code).toBe(200);
  });

  test("each of them reports a failure with a generic message", async () => {
    (deleteEmbeddedSource as Mock).mockRejectedValue(new Error("x"));
    (deleteManyEmbeddedSource as Mock).mockRejectedValue(new Error("x"));
    (deleteChatHistory as Mock).mockRejectedValue(new Error("x"));

    const reps = [reply(), reply(), reply()];
    await deleteEmbeddedSourceHandler(request({ body: {} }), reps[0]);
    await deleteManyEmbeddedSourcesHandler(request({ body: [] }), reps[1]);
    await deleteChatHistoryHandler(request(), reps[2]);

    for (const rep of reps) expect(answer(rep).code).toBe(500);
  });
});

// ===========================================================================
// The chatbot CRUD
// ===========================================================================

describe("the chatbot CRUD handlers", () => {
  test("creates a chatbot against the session org", async () => {
    const rep = reply();

    await createChatbotHanlder(request({ body: { name: "Support" } }), rep);

    expect(createChatbot).toHaveBeenCalledWith(ORG, "Support");
    expect(answer(rep)).toEqual({ code: 201, body: { id: "bot-1" } });
  });

  test("the create route's body schema requires a name", () => {
    expect(createChatbotSchema.safeParse({}).success).toBe(false);
    expect(createChatbotSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(createChatbotSchema.safeParse({ name: "Support" }).success).toBe(true);
  });

  test("lists the caller's own chatbots", async () => {
    (getAllChatbot as Mock).mockResolvedValue([{ id: "bot-1" }]);
    const rep = reply();

    await getAllChatbotsByOrgHandler(request(), rep);

    expect(getAllChatbot).toHaveBeenCalledWith(ORG);
    expect(answer(rep)).toEqual({ code: 200, body: [{ id: "bot-1" }] });
  });

  test("fetches one chatbot within the caller's org", async () => {
    const rep = reply();

    await getChatbotDetailsHandler(request({ params: { chatbotId: "bot-1" } }), rep);

    expect(getChatbotDetails).toHaveBeenCalledWith(ORG, "bot-1");
    expect(answer(rep).code).toBe(200);
  });

  // The org scoping is in the service, so a foreign id resolves to nothing — but
  // the handler answers 200 with null rather than 404.
  test("answers 200 with null for a chatbot the org cannot see", async () => {
    (getChatbotDetails as Mock).mockResolvedValue(null);
    const rep = reply();

    await getChatbotDetailsHandler(request({ params: { chatbotId: "bot-other-org" } }), rep);

    expect(answer(rep)).toEqual({ code: 200, body: null });
  });

  test("answers an update with 200 and the saved row", async () => {
    (updateChatbotDetails as Mock).mockResolvedValue({ id: "bot-1", waPrompt: "be brief" });
    const rep = reply();

    await updateChatbotDetailsHanlder(
      request({ params: { chatbotId: "bot-1" }, body: { waPrompt: "be brief" } }),
      rep,
    );

    expect(updateChatbotDetails).toHaveBeenCalledWith({ waPrompt: "be brief" }, ORG, "bot-1");
    expect(answer(rep)).toEqual({ code: 200, body: { id: "bot-1", waPrompt: "be brief" } });
  });

  test("answers 404 for an update against a missing or foreign chatbot", async () => {
    (updateChatbotDetails as Mock).mockRejectedValue(
      Object.assign(new Error("record not found"), { code: "P2025" }),
    );
    const rep = reply();

    await updateChatbotDetailsHanlder(request({ params: { chatbotId: "gone" }, body: {} }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { message: "Chatbot not found" } });
  });

  test("reports a failed update as a 500", async () => {
    (updateChatbotDetails as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await updateChatbotDetailsHanlder(request({ params: { chatbotId: "bot-1" }, body: {} }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Something went wrong" } });
  });
});

describe("deleteSelectedChatbotHandler", () => {
  test("deletes within the caller's org and confirms", async () => {
    const rep = reply();

    await deleteSelectedChatbotHandler(request({ params: { chatbotId: "bot-1" } }), rep);

    expect(deleteChatbotFromDatabase).toHaveBeenCalledWith({ chatbotId: "bot-1", orgId: ORG });
    expect(rep.send).toHaveBeenCalledWith({ success: true });
  });

  test("answers 404 for a missing or foreign chatbot", async () => {
    (deleteChatbotFromDatabase as Mock).mockRejectedValue(
      Object.assign(new Error("record not found"), { code: "P2025" }),
    );
    const rep = reply();

    await deleteSelectedChatbotHandler(request({ params: { chatbotId: "bot-other-org" } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { message: "Chatbot not found" } });
  });

  test("answers 500 for any other failure rather than escaping", async () => {
    (deleteChatbotFromDatabase as Mock).mockRejectedValue(new Error("db down"));
    const rep = reply();

    await deleteSelectedChatbotHandler(request({ params: { chatbotId: "bot-1" } }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Something went wrong" } });
  });
});

// ===========================================================================
// getAxiosAIClient and the history handler
// ===========================================================================

describe("getAxiosAIClient", () => {
  test("builds a client against the AI base url with the caller's token", async () => {
    await getAxiosAIClient(request());

    expect((axios as any).create).toHaveBeenCalledWith(
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

describe("getChatHitoryByOrgHandler", () => {
  test("passes the built client, the caller's org and the path chatbot id through", async () => {
    (getChatBotHistory as Mock).mockResolvedValue([{ userId: "u1" }]);
    const rep = reply();

    await getChatHitoryByOrgHandler(request({ params: { chatbotId: "bot-1" } }), rep);

    expect((getChatBotHistory as Mock).mock.calls[0][1]).toBe(ORG);
    expect((getChatBotHistory as Mock).mock.calls[0][2]).toBe("bot-1");
    expect(answer(rep)).toEqual({ code: 200, body: [{ userId: "u1" }] });
  });

  test("refuses to read the history of a chatbot the org does not own", async () => {
    (getChatbotDetails as Mock).mockResolvedValue(null);
    const rep = reply();

    await getChatHitoryByOrgHandler(request({ params: { chatbotId: "bot-other-org" } }), rep);

    expect(getChatBotHistory).not.toHaveBeenCalled();
    expect(answer(rep)).toEqual({ code: 404, body: { message: "Chatbot not found" } });
  });

  test("answers a failure with a message, like its siblings", async () => {
    (getChatBotHistory as Mock).mockRejectedValue(new Error("ai service unreachable"));
    const rep = reply();

    await getChatHitoryByOrgHandler(request({ params: { chatbotId: "bot-1" } }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Something went wrong" } });
  });
});
