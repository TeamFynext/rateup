import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../metaChannel/metaChannel.service.js", () => ({ getMetaChannelById: vi.fn() }));
vi.mock("./messenger_profile.service.js", () => ({
  deleteMessengerProfileFields: vi.fn(),
  getMessengerProfile: vi.fn(),
  setMessengerProfile: vi.fn(),
}));
vi.mock("../wa_axios.js", () => {
  class GraphApiError extends Error {
    error: unknown;
    constructor(error: unknown) {
      super("Something went wrong");
      this.error = error;
    }
  }
  return { GraphApiError };
});
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { getMetaChannelById } from "../metaChannel/metaChannel.service.js";
import { GraphApiError } from "../wa_axios.js";
import {
  deleteMessengerGetStartedHandler,
  getMessengerProfileHandler,
  setMessengerGreetingHandler,
  setMessengerPersistentMenuHandler,
} from "./messenger_profile.controller.js";
import {
  deleteMessengerProfileFields,
  getMessengerProfile,
  setMessengerProfile,
} from "./messenger_profile.service.js";
import { messengerPersistentMenuSchema } from "./messenger_profile.schema.js";

type Mock = ReturnType<typeof vi.fn>;
const m = {
  channel: getMetaChannelById as unknown as Mock,
  get: getMessengerProfile as unknown as Mock,
  set: setMessengerProfile as unknown as Mock,
  del: deleteMessengerProfileFields as unknown as Mock,
};

const emptyProfile = { getStarted: null, greeting: null, iceBreakers: [], persistentMenu: [] };

function fakeReply() {
  const reply = {
    statusCode: 0,
    body: undefined as unknown,
    code(status: number) {
      reply.statusCode = status;
      return reply;
    },
    send(body: unknown) {
      reply.body = body;
      return reply;
    },
  };
  return reply;
}

function request(body?: unknown) {
  return { params: { channelId: "ch-1" }, user: { orgId: "org-1" }, body } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.channel.mockResolvedValue({ platform: "FACEBOOK", pageAccessToken: "page-token" });
  m.get.mockResolvedValue(emptyProfile);
});

describe("Messenger profile handlers", () => {
  test("read the Page's profile with its token", async () => {
    const reply = fakeReply();
    await getMessengerProfileHandler(request(), reply as never);

    expect(m.channel).toHaveBeenCalledWith("ch-1", "org-1");
    expect(m.get).toHaveBeenCalledWith("page-token");
    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({ success: true, data: emptyProfile });
  });

  test("an Instagram channel is not a Messenger profile", async () => {
    m.channel.mockResolvedValue({ platform: "INSTAGRAM", pageAccessToken: "page-token" });
    const reply = fakeReply();
    await getMessengerProfileHandler(request(), reply as never);

    expect(reply.statusCode).toBe(404);
    expect(m.get).not.toHaveBeenCalled();
  });

  test("a save returns what Meta now holds", async () => {
    m.get.mockResolvedValue({ ...emptyProfile, greeting: "Hello" });
    const reply = fakeReply();
    await setMessengerGreetingHandler(request({ text: "Hello" }), reply as never);

    expect(m.set).toHaveBeenCalledWith("page-token", { greeting: "Hello" });
    expect(reply.body).toEqual({ success: true, data: { ...emptyProfile, greeting: "Hello" } });
  });

  test("removing Get Started removes the menu with it", async () => {
    await deleteMessengerGetStartedHandler(request(), fakeReply() as never);
    expect(m.del).toHaveBeenCalledWith("page-token", ["get_started", "persistent_menu"]);
  });

  test("a menu needs a Get Started button first", async () => {
    const reply = fakeReply();
    await setMessengerPersistentMenuHandler(
      request({ persistentMenu: [{ type: "postback", title: "Agent", payload: "AGENT" }] }),
      reply as never,
    );

    expect(reply.statusCode).toBe(409);
    expect(m.set).not.toHaveBeenCalled();
  });

  test("a menu saves once Get Started is set", async () => {
    m.get.mockResolvedValue({ ...emptyProfile, getStarted: "START" });
    const menu = [{ type: "postback", title: "Agent", payload: "AGENT" }];
    const reply = fakeReply();
    await setMessengerPersistentMenuHandler(request({ persistentMenu: menu }), reply as never);

    expect(m.set).toHaveBeenCalledWith("page-token", { persistentMenu: menu });
    expect(reply.statusCode).toBe(200);
  });

  test("Meta's refusal is passed on in its own words", async () => {
    m.set.mockRejectedValue(
      new (GraphApiError as unknown as new (e: unknown) => Error)({
        message: "(#200) Requires pages_messaging permission",
      }),
    );
    const reply = fakeReply();
    await setMessengerGreetingHandler(request({ text: "Hello" }), reply as never);

    expect(reply.statusCode).toBe(502);
    expect(reply.body).toEqual({
      success: false,
      message: "(#200) Requires pages_messaging permission",
    });
  });
});

describe("the persistent menu schema", () => {
  test("accepts keyword and website items", () => {
    const result = messengerPersistentMenuSchema.safeParse({
      persistentMenu: [
        { type: "postback", title: "Agent", payload: "AGENT" },
        { type: "web_url", title: "Shop", url: "https://shop.example" },
      ],
    });
    expect(result.success).toBe(true);
  });

  test.each([
    ["a non-web link", { type: "web_url", title: "Call", url: "tel:123" }],
    ["a title over 30 characters", { type: "postback", title: "x".repeat(31), payload: "A" }],
    ["a missing keyword", { type: "postback", title: "Agent", payload: " " }],
  ])("refuses %s", (_, item) => {
    expect(messengerPersistentMenuSchema.safeParse({ persistentMenu: [item] }).success).toBe(false);
  });
});
