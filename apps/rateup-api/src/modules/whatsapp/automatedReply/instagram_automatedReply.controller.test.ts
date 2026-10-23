import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./instagram_automatedReply.service.js", () => ({
  cloneMetaAutomation: vi.fn(),
  createMetaAutomation: vi.fn(),
  deleteMetaAutomation: vi.fn(),
  getMetaAutomationsByOrgId: vi.fn(),
  getMetaAutomationById: vi.fn(),
  updateMetaAutomation: vi.fn(),
}));

vi.mock("./metaFlow.service.js", () => ({
  startMetaFlow: vi.fn(),
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import {
  cloneMetaAutomation,
  createMetaAutomation,
  deleteMetaAutomation,
  getMetaAutomationsByOrgId,
  getMetaAutomationById,
  updateMetaAutomation,
} from "./instagram_automatedReply.service.js";
import { startMetaFlow } from "./metaFlow.service.js";
import { log } from "../../../utils/logger.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import { metaAutomationHandlers } from "./instagram_automatedReply.controller.js";
import { initiateMetaAutomationBodySchema } from "./instagram_automatedReply.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const m = {
  list: getMetaAutomationsByOrgId as unknown as Mock,
  getById: getMetaAutomationById as unknown as Mock,
  create: createMetaAutomation as unknown as Mock,
  update: updateMetaAutomation as unknown as Mock,
  remove: deleteMetaAutomation as unknown as Mock,
  startFlow: startMetaFlow as unknown as Mock,
  clone: cloneMetaAutomation as unknown as Mock,
};

const IG = PlatformType.INSTAGRAM;
const FB = PlatformType.FACEBOOK;
const instagram = metaAutomationHandlers(IG);
const messenger = metaAutomationHandlers(FB);

const AUTOMATION = { id: "ig-auto-1", orgId: "org-1", name: "Comment reply" };

function makeReply() {
  const reply: any = {
    statusCode: undefined,
    payload: undefined,
    code: vi.fn((c: number) => {
      reply.statusCode = c;
      return reply;
    }),
    send: vi.fn((p?: unknown) => {
      reply.payload = p;
      return reply;
    }),
  };
  return reply;
}

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    params: {},
    body: {},
    query: {},
    user: { orgId: "org-1", userId: "user-1" },
    ...overrides,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.list.mockResolvedValue([AUTOMATION]);
  m.getById.mockResolvedValue(AUTOMATION);
  m.create.mockResolvedValue(AUTOMATION);
  m.update.mockResolvedValue(AUTOMATION);
  m.remove.mockResolvedValue({ success: true });
  m.startFlow.mockResolvedValue(undefined);
});

describe("list", () => {
  test("lists the caller's org's automations on the handler's platform", async () => {
    const reply = makeReply();

    await instagram.list(makeRequest(), reply);

    expect(m.list).toHaveBeenCalledWith("org-1", IG);
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual({ success: true, data: [AUTOMATION] });
  });

  test("lists Messenger automations from the Messenger handlers", async () => {
    await messenger.list(makeRequest(), makeReply());

    expect(m.list).toHaveBeenCalledWith("org-1", FB);
  });

  test("returns 500 when listing fails", async () => {
    m.list.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await instagram.list(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({
      success: false,
      error: "Failed to fetch Instagram automations",
    });
    expect(log.error).toHaveBeenCalled();
  });
});

describe("getById", () => {
  test("looks the automation up within the caller's org", async () => {
    const reply = makeReply();

    await instagram.getById(makeRequest({ params: { id: "ig-auto-1" } }), reply);

    expect(m.getById).toHaveBeenCalledWith("ig-auto-1", "org-1", IG);
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual({ success: true, data: AUTOMATION });
  });

  // The lookup is org-scoped, so another org's id comes back empty.
  test("returns 404 when there is no such automation in the org", async () => {
    m.getById.mockResolvedValue(null);
    const reply = makeReply();

    await instagram.getById(makeRequest({ params: { id: "ig-auto-9" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.payload).toMatchObject({ error: "Instagram automation not found" });
  });

  test("names Messenger in a Messenger 404", async () => {
    m.getById.mockResolvedValue(null);
    const reply = makeReply();

    await messenger.getById(makeRequest({ params: { id: "missing" } }), reply);

    expect(reply.payload).toMatchObject({ error: "Messenger automation not found" });
  });

  test("returns 500 when the lookup throws", async () => {
    m.getById.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await instagram.getById(makeRequest({ params: { id: "ig-auto-1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("create", () => {
  test("creates the automation for the caller's org on the handler's platform", async () => {
    const reply = makeReply();
    const body = {
      name: "Comment reply",
      matchData: { keywords: ["price"] },
      whatsappSettingsPhoneId: "phone-1",
    };

    await instagram.create(makeRequest({ body }), reply);

    expect(m.create).toHaveBeenCalledWith(IG, { orgId: "org-1", ...body });
    expect(reply.code).toHaveBeenCalledWith(201);
    expect(reply.payload).toEqual({ success: true, data: AUTOMATION });
  });

  test("creates a Messenger automation from the Messenger handlers", async () => {
    await messenger.create(makeRequest({ body: { name: "A", matchData: {} } }), makeReply());

    expect(m.create.mock.calls[0][0]).toBe(FB);
  });

  test("ignores an orgId smuggled into the body", async () => {
    await instagram.create(
      makeRequest({ body: { name: "A", matchData: {}, orgId: "org-victim" } }),
      makeReply(),
    );

    expect(m.create.mock.calls[0][1].orgId).toBe("org-1");
  });

  test("returns 500 when creation fails", async () => {
    m.create.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await instagram.create(makeRequest({ body: { name: "A" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toMatchObject({ error: "Failed to create Instagram automation" });
  });
});

describe("update", () => {
  test("checks ownership before applying the change", async () => {
    const reply = makeReply();

    await instagram.update(
      makeRequest({ params: { id: "ig-auto-1" }, body: { name: "Renamed" } }),
      reply,
    );

    expect(m.getById).toHaveBeenCalledWith("ig-auto-1", "org-1", IG);
    expect(m.update).toHaveBeenCalledWith("ig-auto-1", "org-1", IG, { name: "Renamed" });
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("returns 404 without updating when the org has no such automation", async () => {
    m.getById.mockResolvedValue(null);
    const reply = makeReply();

    await instagram.update(makeRequest({ params: { id: "ig-auto-9" }, body: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(m.update).not.toHaveBeenCalled();
  });

  test("returns 500 when the update throws", async () => {
    m.update.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await instagram.update(makeRequest({ params: { id: "ig-auto-1" }, body: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("remove", () => {
  test("checks ownership before deleting", async () => {
    const reply = makeReply();

    await instagram.remove(makeRequest({ params: { id: "ig-auto-1" } }), reply);

    expect(m.remove).toHaveBeenCalledWith("ig-auto-1", "org-1", IG);
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual({
      success: true,
      message: "Instagram automation deleted successfully",
    });
  });

  test("returns 404 without deleting when the org has no such automation", async () => {
    m.getById.mockResolvedValue(null);
    const reply = makeReply();

    await instagram.remove(makeRequest({ params: { id: "ig-auto-9" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(m.remove).not.toHaveBeenCalled();
  });

  test("returns 500 when the delete throws", async () => {
    m.remove.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await instagram.remove(makeRequest({ params: { id: "ig-auto-1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("initiate", () => {
  const body = { recipientId: "igs-1", accountId: "iba-1" };

  test("starts the flow for the recipient on the handler's channel", async () => {
    const reply = makeReply();

    await instagram.initiate(makeRequest({ params: { id: "ig-auto-1" }, body }), reply);

    expect(m.startFlow).toHaveBeenCalledWith("igs-1", AUTOMATION, "org-1", {
      platform: IG,
      accountId: "iba-1",
    });
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toMatchObject({ success: true });
  });

  test("starts a Messenger flow on the Page", async () => {
    await messenger.initiate(
      makeRequest({
        params: { id: "fb-auto-1" },
        body: { recipientId: "psid-1", accountId: "page-1" },
      }),
      makeReply(),
    );

    expect(m.startFlow).toHaveBeenCalledWith("psid-1", AUTOMATION, "org-1", {
      platform: FB,
      accountId: "page-1",
    });
  });

  test("returns 404 without starting anything when the org has no such automation", async () => {
    m.getById.mockResolvedValue(null);
    const reply = makeReply();

    await instagram.initiate(makeRequest({ params: { id: "missing" }, body }), reply);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(m.startFlow).not.toHaveBeenCalled();
  });

  test("returns 500 when starting the flow fails", async () => {
    m.startFlow.mockRejectedValue(new Error("meta down"));
    const reply = makeReply();

    await instagram.initiate(makeRequest({ params: { id: "ig-auto-1" }, body }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toMatchObject({ error: "Failed to initiate Instagram automation" });
  });
});

// The handler used to read `ibaId` while the schema only declared `igsId`.
describe("initiateMetaAutomationBodySchema", () => {
  test("accepts the platform-neutral names", () => {
    expect(
      initiateMetaAutomationBodySchema.parse({ recipientId: "psid-1", accountId: "page-1" }),
    ).toEqual({ recipientId: "psid-1", accountId: "page-1" });
  });

  test("still accepts the Instagram names", () => {
    expect(initiateMetaAutomationBodySchema.parse({ igsId: "igs-1", ibaId: "iba-1" })).toEqual({
      recipientId: "igs-1",
      accountId: "iba-1",
    });
  });

  test.each([
    ["no recipient", { accountId: "iba-1" }],
    ["no account", { igsId: "igs-1" }],
  ])("rejects a body with %s", (_label, body) => {
    expect(initiateMetaAutomationBodySchema.safeParse(body).success).toBe(false);
  });
});

describe("clone", () => {
  test("copies the automation within the caller's org and platform", async () => {
    m.clone.mockResolvedValue({ ...AUTOMATION, id: "copy-1" });
    const reply = makeReply();

    await messenger.clone(
      makeRequest({ params: { id: "ig-auto-1" }, body: { name: "Copy" } }),
      reply,
    );

    expect(m.clone).toHaveBeenCalledWith("ig-auto-1", "org-1", FB, "Copy");
    expect(reply.code).toHaveBeenCalledWith(201);
  });

  test("returns 404 when the org has no such automation", async () => {
    m.clone.mockResolvedValue(null);
    const reply = makeReply();

    await instagram.clone(makeRequest({ params: { id: "missing" }, body: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(404);
  });
});
