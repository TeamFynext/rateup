import { beforeEach, describe, expect, test, vi } from "vitest";

// Hook URLs are resolved before every call (src/utils/ssrf.ts); keep that off the network.
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async (host: string) => [
    { address: host.includes("internal") ? "10.0.0.5" : "203.0.113.10", family: 4 },
  ]),
}));

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    integration: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    $executeRaw: vi.fn(),
  },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
}));
vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  return {
    ...actual,
    default: { ...actual.default, post: vi.fn(), isAxiosError: actual.isAxiosError },
  };
});

import axios, { AxiosError, AxiosHeaders } from "axios";
import bcrypt from "bcrypt";
import type { Integration } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import { makeProvider } from "../external/make/make.provider.js";
import { ZapierTriggers } from "../external/zapier/zapier.types.js";
import { createIntegration } from "../integrations.service.js";
import { getIntegrationProvider } from "../providers/registry.js";
import { AUTOMATION_JOB_OPTIONS, queueAutomationTrigger } from "./automation.deliver.js";
import { addAutomationHook, removeAutomationHookById } from "./automation.hooks.js";
import { generateAutomationKey, orgIdFromAutomationKey } from "./automation.keys.js";
import { isAutomationPlatform } from "./automation.platforms.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  integration: { findUnique: Mock; update: Mock; create: Mock };
  $executeRaw: Mock;
};
const add = integrationTriggerQueue.add as unknown as Mock;

const ORG = "7bd6b9b9-02be-448e-9b7d-f72b5d8484d9";
const HOOK = "https://hook.eu1.make.com/abc";

const makeRow = (subscriptions: unknown[]) =>
  ({
    id: "int-make",
    orgId: ORG,
    name: "make",
    active: true,
    credential: { accessToken: "hash", triggerSubscriptions: subscriptions },
  }) as unknown as Integration;

/** The SQL text of a tagged-template `$executeRaw` call. */
const sqlOf = (call: unknown[]) => (call[0] as TemplateStringsArray).join("?");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("platforms", () => {
  test("Zapier and Make are automation platforms; other integrations are not", () => {
    expect(isAutomationPlatform("zapier")).toBe(true);
    expect(isAutomationPlatform("make")).toBe(true);
    expect(isAutomationPlatform("hubspot")).toBe(false);
  });

  test("Make is in the provider registry", () => {
    expect(getIntegrationProvider("make")).toBe(makeProvider);
    expect(makeProvider.label).toBe("Make");
  });
});

describe("API keys", () => {
  test("a Make key carries its org and the hash covers the whole key", async () => {
    const { key, hash } = await generateAutomationKey("make" as never, ORG);

    expect(key).toMatch(/^rk_7bd6b9b902be448e9b7df72b5d8484d9_[A-Za-z0-9_-]{32}$/);
    expect(orgIdFromAutomationKey(key)).toBe(ORG);
    await expect(bcrypt.compare(key, hash)).resolves.toBe(true);
  });

  test("the key fits bcrypt's 72 bytes, so a changed last character fails", async () => {
    const { key, hash } = await generateAutomationKey("make" as never, ORG);
    const last = key.at(-1) === "A" ? "B" : "A";

    expect(Buffer.byteLength(key)).toBeLessThanOrEqual(72);
    await expect(bcrypt.compare(`${key.slice(0, -1)}${last}`, hash)).resolves.toBe(false);
  });

  test("a Zapier key keeps its old format, with no org in it", async () => {
    const { key } = await generateAutomationKey("zapier" as never, ORG);

    expect(key.startsWith("rk_")).toBe(false);
    expect(orgIdFromAutomationKey(key)).toBeNull();
  });

  test("keys that are not org-carrying keys have no org", () => {
    expect(orgIdFromAutomationKey("rk_nothex_secret")).toBeNull();
    expect(orgIdFromAutomationKey(`rk_${"a".repeat(32)}_short`)).toBeNull();
    expect(orgIdFromAutomationKey("")).toBeNull();
  });

  test("connecting Make stores the hash and returns the plain key once", async () => {
    db.integration.create.mockImplementation(async ({ data }) => ({ id: "int-make", ...data }));

    const created = await createIntegration({ name: "make", credential: {} } as never, ORG);

    expect(created.apikey).toMatch(/^rk_/);
    const stored = db.integration.create.mock.calls[0][0].data.credential.accessToken;
    await expect(bcrypt.compare(created.apikey!, stored)).resolves.toBe(true);
  });
});

describe("hooks", () => {
  test("a new hook is stored active, with an id to unsubscribe by", async () => {
    db.integration.findUnique.mockResolvedValue(makeRow([]));

    const hook = await addAutomationHook("make" as never, ORG, {
      hookUrl: HOOK,
      trigger: ZapierTriggers.CONTACT_CREATE,
    });

    expect(hook).toMatchObject({
      hookUrl: HOOK,
      subscribed_field: "new_contact_create",
      active: true,
    });
    expect(hook!.id).toMatch(/^[0-9a-f-]{36}$/);
    const saved = db.integration.update.mock.calls[0][0];
    expect(saved.where).toEqual({ orgid_integration_name_unique: { orgId: ORG, name: "make" } });
    expect(saved.data.credential).toEqual({ accessToken: "hash", triggerSubscriptions: [hook] });
  });

  test("subscribing the same URL to the same trigger reactivates it, keeping its id", async () => {
    db.integration.findUnique.mockResolvedValue(
      makeRow([
        { id: "h-1", hookUrl: HOOK, subscribed_field: "new_contact_create", active: false },
      ]),
    );

    const hook = await addAutomationHook("make" as never, ORG, {
      hookUrl: HOOK,
      trigger: ZapierTriggers.CONTACT_CREATE,
    });

    expect(hook).toMatchObject({ id: "h-1", active: true });
    expect(
      db.integration.update.mock.calls[0][0].data.credential.triggerSubscriptions,
    ).toHaveLength(1);
  });

  test("no hook is stored for an org that has not connected the platform", async () => {
    db.integration.findUnique.mockResolvedValue(null);

    await expect(
      addAutomationHook("make" as never, ORG, {
        hookUrl: HOOK,
        trigger: ZapierTriggers.NEW_MESSAGE,
      }),
    ).resolves.toBeNull();
    expect(db.integration.update).not.toHaveBeenCalled();
  });

  test("removing by id touches only that platform's row and reports whether it was there", async () => {
    db.$executeRaw.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(removeAutomationHookById("make" as never, ORG, "h-1")).resolves.toBe(true);
    await expect(removeAutomationHookById("make" as never, ORG, "h-x")).resolves.toBe(false);

    const [call] = db.$executeRaw.mock.calls;
    expect(sqlOf(call)).toContain(`name = ?`);
    expect(call.slice(1)).toEqual(["h-1", ORG, "make", "h-1"]);
  });
});

describe("Make deliveries", () => {
  const contact = {
    id: "c1",
    name: "Ann",
    phone: "919000000001",
    email: null,
    source: "WHATSAPP",
    igsId: null,
  } as never;

  test("a Make hook gets a make job carrying the same payload a Zap gets", async () => {
    const row = makeRow([
      { id: "h-1", hookUrl: HOOK, subscribed_field: "new_contact_create", active: true },
    ]);

    await queueAutomationTrigger("make" as never, row, ZapierTriggers.CONTACT_CREATE, contact);

    expect(add).toHaveBeenCalledWith(
      "make-new_contact_create",
      {
        integrationName: "make",
        triggerKey: "make_delivery",
        orgId: ORG,
        data: {
          trigger: "new_contact_create",
          hookUrl: HOOK,
          payload: {
            id: "c1",
            name: "Ann",
            phone: "919000000001",
            email: null,
            source: "WHATSAPP",
            igsId: null,
          },
        },
      },
      AUTOMATION_JOB_OPTIONS,
    );
  });

  test("the Make provider fires only for triggers a scenario listens to", async () => {
    const row = makeRow([
      { id: "h-1", hookUrl: HOOK, subscribed_field: "conversation_closed", active: true },
    ]);

    expect(makeProvider.subscribedEvents!(row)).toEqual(["conversation.closed"]);
  });

  test("a 410 switches off the hook on the Make row only, without a retry", async () => {
    const row = makeRow([
      { id: "h-1", hookUrl: HOOK, subscribed_field: "new_contact_create", active: true },
    ]);
    (axios.post as unknown as Mock).mockRejectedValueOnce(
      new AxiosError("gone", "410", undefined, undefined, {
        status: 410,
        statusText: "Gone",
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: null,
      }),
    );

    await makeProvider.processJob!(
      row,
      {
        integrationName: "make",
        triggerKey: "make_delivery",
        orgId: ORG,
        data: { trigger: "new_contact_create", hookUrl: HOOK, payload: {} },
      },
      { finalAttempt: false } as never,
    );

    const [call] = db.$executeRaw.mock.calls;
    expect(call.slice(1)).toContain("make");
    expect(call.slice(1)).not.toContain("zapier");
  });

  test("a delivery to a hook switched off meanwhile sends nothing and says it skipped", async () => {
    const result = await makeProvider.processJob!(
      makeRow([
        { id: "h-1", hookUrl: HOOK, subscribed_field: "new_contact_create", active: false },
      ]),
      {
        integrationName: "make",
        triggerKey: "make_delivery",
        orgId: ORG,
        data: { trigger: "new_contact_create", hookUrl: HOOK, payload: {} },
      },
      { finalAttempt: false } as never,
    );

    expect(result).toBe("skipped");
    expect(axios.post).not.toHaveBeenCalled();
  });

  test("a hook on a private address is switched off and never called", async () => {
    const internal = "https://metadata.internal/hook";
    const result = await makeProvider.processJob!(
      makeRow([
        { id: "h-1", hookUrl: internal, subscribed_field: "new_contact_create", active: true },
      ]),
      {
        integrationName: "make",
        triggerKey: "make_delivery",
        orgId: ORG,
        data: { trigger: "new_contact_create", hookUrl: internal, payload: {} },
      },
      { finalAttempt: false } as never,
    );

    expect(result).toBe("skipped");
    expect(axios.post).not.toHaveBeenCalled();
    expect(db.$executeRaw).toHaveBeenCalled();
  });

  test("a delivery follows no redirects and has a timeout", async () => {
    (axios.post as unknown as Mock).mockResolvedValueOnce({ status: 200 });
    await makeProvider.processJob!(
      makeRow([{ id: "h-1", hookUrl: HOOK, subscribed_field: "new_contact_create", active: true }]),
      {
        integrationName: "make",
        triggerKey: "make_delivery",
        orgId: ORG,
        data: { trigger: "new_contact_create", hookUrl: HOOK, payload: {} },
      },
      { finalAttempt: false } as never,
    );

    expect((axios.post as unknown as Mock).mock.calls[0][2]).toMatchObject({
      maxRedirects: 0,
      timeout: 15_000,
    });
  });

  test("the Make provider ignores a Zapier delivery job", async () => {
    await makeProvider.processJob!(
      makeRow([{ id: "h-1", hookUrl: HOOK, subscribed_field: "new_contact_create", active: true }]),
      {
        integrationName: "make",
        triggerKey: "zapier_delivery",
        orgId: ORG,
        data: { trigger: "new_contact_create", hookUrl: HOOK, payload: {} },
      },
      { finalAttempt: false } as never,
    );

    expect(axios.post).not.toHaveBeenCalled();
  });
});
