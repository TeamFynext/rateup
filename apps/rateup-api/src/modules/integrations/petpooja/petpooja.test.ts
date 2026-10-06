import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));

// One stored credential per integration id, read and written through the mock.
const store = vi.hoisted(() => ({ rows: new Map<string, { orgId: string; credential: any }>() }));
vi.mock("../../../utils/prisma.js", () => {
  const integration = {
    findUnique: vi.fn(async ({ where }: any) => {
      if (where.id) {
        const row = store.rows.get(where.id);
        return row ? { id: where.id, ...row } : null;
      }
      const { orgId } = where.orgid_integration_name_unique;
      for (const [id, row] of store.rows) if (row.orgId === orgId) return { id, ...row };
      return null;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const row = store.rows.get(where.id)!;
      row.credential = JSON.parse(JSON.stringify(data.credential));
      return row;
    }),
    upsert: vi.fn(async ({ where }: any) => {
      const { orgId } = where.orgid_integration_name_unique;
      for (const [id] of [...store.rows].filter(([, row]) => row.orgId === orgId)) return { id };
      const id = `int-${store.rows.size + 1}`;
      store.rows.set(id, { orgId, credential: {} });
      return { id };
    }),
    findFirst: vi.fn(async () => null),
    findMany: vi.fn(async () =>
      [...store.rows].map(([id, row]) => ({ id, orgId: row.orgId, credential: row.credential })),
    ),
  };
  const db: any = { integration, $queryRaw: vi.fn() };
  db.$transaction = vi.fn((fn: (tx: unknown) => unknown) => fn(db));
  return { default: db };
});
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
}));
vi.mock("../shopify/shopify.messages.js", () => ({
  sendWhatsAppTemplateToCustomer: vi.fn(async () => ({ status: true })),
}));

import prisma from "../../../utils/prisma.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import { sendWhatsAppTemplateToCustomer } from "../shopify/shopify.messages.js";
import { getIntegrationProvider } from "../providers/registry.js";
import { InboundWebhookRejected } from "../shared/inboundWebhookContract.js";
import { IntegrationConnectError } from "../shared/oauthConnectError.js";
import {
  getPetpoojaWebhookUrl,
  handlePetpoojaInbound,
  PETPOOJA_HISTORY_LIMIT,
  PETPOOJA_ORDER,
  petpoojaProvider,
  savePetpoojaSettings,
  updatePetpoojaHistory,
} from "./petpooja.js";
import { processPetpoojaOrder } from "./petpooja.send.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as { integration: Record<string, Mock> };
const send = sendWhatsAppTemplateToCustomer as unknown as Mock;

const ORG = "11111111-1111-1111-1111-111111111111";
const ID = "int-1";
const NOW = new Date("2026-10-06T10:00:00Z");
const orderEvent = () => ({ waTemplateId: "tpl-1", teamId: "team-1" });

function connect(credential: Record<string, unknown>) {
  store.rows.set(ID, { orgId: ORG, credential });
}
const stored = () => store.rows.get(ID)!.credential;

beforeEach(() => {
  vi.clearAllMocks();
  store.rows.clear();
  send.mockResolvedValue({ status: true });
});

describe("the registry entry", () => {
  test("is listed, needs a connected row, and takes its orders on the shared receiver", () => {
    expect(getIntegrationProvider("petpooja")).toBe(petpoojaProvider);
    expect(petpoojaProvider.connection).toBe("integration");
    expect(petpoojaProvider.events).toEqual([]);
    expect(petpoojaProvider.handleInbound).toBe(handlePetpoojaInbound);
  });
});

describe("handlePetpoojaInbound", () => {
  const integration = (credential: Record<string, unknown>) =>
    ({ id: ID, orgId: ORG, name: "petpooja", active: true, credential }) as never;
  const order = (over: Record<string, unknown> = {}) => ({
    properties: {
      Restaurant: { restID: "rest-1" },
      Customer: { name: "Ann", phone: "9876543210" },
      ...over,
    },
  });
  const request = (token: string | undefined, body: unknown = order()) =>
    ({ query: token === undefined ? {} : { token }, body }) as never;
  const configured = { restaurantId: "rest-1", inbound: { token: "tok-good" } };

  test("queues the order for the customer's number, country code first, no plus", async () => {
    await handlePetpoojaInbound(integration(configured), request("tok-good"));

    expect(integrationTriggerQueue.add).toHaveBeenCalledWith(
      PETPOOJA_ORDER,
      {
        integrationName: "petpooja",
        triggerKey: PETPOOJA_ORDER,
        orgId: ORG,
        data: { name: "Ann", phone: "919876543210" },
      },
      expect.objectContaining({ attempts: 3 }),
    );
  });

  test("refuses a delivery without the URL's token, or with another one", async () => {
    for (const token of [undefined, "", "tok-bad", "tok-good-but-longer"]) {
      await expect(handlePetpoojaInbound(integration(configured), request(token))).rejects.toThrow(
        InboundWebhookRejected,
      );
    }
    expect(integrationTriggerQueue.add).not.toHaveBeenCalled();
  });

  test("refuses everything while no URL has been issued", async () => {
    await expect(
      handlePetpoojaInbound(integration({ restaurantId: "rest-1" }), request("anything")),
    ).rejects.toThrow(InboundWebhookRejected);
  });

  test("ignores an order for a different restaurant", async () => {
    await handlePetpoojaInbound(
      integration(configured),
      request("tok-good", order({ Restaurant: { restID: "rest-2" } })),
    );

    expect(integrationTriggerQueue.add).not.toHaveBeenCalled();
  });

  test("ignores an order with no usable phone, without failing the delivery", async () => {
    for (const phone of ["", "12", "not a number"]) {
      await handlePetpoojaInbound(
        integration(configured),
        request("tok-good", order({ Customer: { name: "Ann", phone } })),
      );
    }
    expect(integrationTriggerQueue.add).not.toHaveBeenCalled();
  });
});

describe("processPetpoojaOrder", () => {
  const job = { name: "Ann", phone: "919876543210" };

  test("sends at once, and records it", async () => {
    connect({ restaurantId: "rest-1", orderEvent: orderEvent() });

    expect(await processPetpoojaOrder({ id: ID, orgId: ORG, credential: stored() }, job, NOW)).toBe(
      "sent",
    );

    expect(send).toHaveBeenCalledWith(ORG, "919876543210", "tpl-1", "team-1", "Ann");
    expect(stored().history).toEqual([
      expect.objectContaining({ phone: "919876543210", name: "Ann", status: "SENT" }),
    ]);
  });

  test("records a failed send with Meta's reason", async () => {
    connect({ orderEvent: orderEvent() });
    send.mockResolvedValueOnce({ status: false, message: "template paused" });

    expect(await processPetpoojaOrder({ id: ID, orgId: ORG, credential: stored() }, job, NOW)).toBe(
      "failed",
    );
    expect(stored().history[0].status).toBe("FAILED: template paused");
  });

  test("skips a second order message to the same phone within ten minutes", async () => {
    connect({ orderEvent: orderEvent() });
    const integration = () => ({ id: ID, orgId: ORG, credential: stored() });

    await processPetpoojaOrder(integration(), job, NOW);
    const again = await processPetpoojaOrder(
      integration(),
      job,
      new Date(NOW.getTime() + 5 * 60_000),
    );
    const later = await processPetpoojaOrder(
      integration(),
      job,
      new Date(NOW.getTime() + 11 * 60_000),
    );

    expect(again).toBe("duplicate");
    expect(later).toBe("sent");
    expect(send).toHaveBeenCalledTimes(2);
  });

  test("tries again after a failed send, rather than counting it as messaged", async () => {
    connect({ orderEvent: orderEvent() });
    send.mockResolvedValueOnce(false);
    const integration = () => ({ id: ID, orgId: ORG, credential: stored() });

    await processPetpoojaOrder(integration(), job, NOW);
    expect(await processPetpoojaOrder(integration(), job, NOW)).toBe("sent");
  });

  test("does nothing until the order message is set up", async () => {
    connect({ restaurantId: "rest-1" });

    expect(await processPetpoojaOrder({ id: ID, orgId: ORG, credential: stored() }, job, NOW)).toBe(
      "not_configured",
    );
    expect(send).not.toHaveBeenCalled();
  });
});

describe("history", () => {
  test("keeps only the newest entries", async () => {
    const old = Array.from({ length: PETPOOJA_HISTORY_LIMIT }, (_, i) => ({
      id: `s${i}`,
      name: "",
      phone: "",
      status: "SENT",
      createdAt: NOW,
    }));
    connect({ history: old });

    await updatePetpoojaHistory(ID, (history) => ({
      history: [...history, { ...old[0], id: "new" }],
      result: null,
    }));

    const ids = stored().history.map((h: any) => h.id);
    expect(ids).toHaveLength(PETPOOJA_HISTORY_LIMIT);
    expect(ids.at(-1)).toBe("new");
    expect(ids).not.toContain("s0");
  });
});

describe("settings", () => {
  test("merges into the stored credential, leaving history and token alone", async () => {
    connect({ restaurantId: "old", inbound: { token: "tok" }, history: [{ id: "h" }] });

    await savePetpoojaSettings(ORG, { restaurantId: " rest-9 ", orderEvent: orderEvent() });

    expect(stored()).toEqual({
      restaurantId: "rest-9",
      orderEvent: orderEvent(),
      inbound: { token: "tok" },
      history: [{ id: "h" }],
    });
  });

  test("clearing the order message removes only it", async () => {
    connect({ restaurantId: "rest-1", orderEvent: orderEvent() });

    await savePetpoojaSettings(ORG, { orderEvent: null });

    expect(stored()).toEqual({ restaurantId: "rest-1", history: [] });
  });

  test("refuses a restaurant another workspace already connected", async () => {
    db.integration.findFirst.mockResolvedValueOnce({ id: "other" });

    await expect(savePetpoojaSettings(ORG, { restaurantId: "rest-1" })).rejects.toThrow(
      IntegrationConnectError,
    );
  });

  test("issues the webhook URL once, and a new one only when asked", async () => {
    connect({ restaurantId: "rest-1" });

    const first = await getPetpoojaWebhookUrl(ORG);
    const second = await getPetpoojaWebhookUrl(ORG);
    const rotated = await getPetpoojaWebhookUrl(ORG, { rotate: true });

    expect(first.url).toMatch(
      /\/api\/public\/integrations\/webhooks\/petpooja\/int-1\?token=.{32}$/,
    );
    expect(second.url).toBe(first.url);
    expect(rotated.url).not.toBe(first.url);
    expect(stored().inbound.token).toBe(rotated.url.split("token=")[1]);
  });
});
