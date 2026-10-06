import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));

// The org's one waPayment row, read and written through the mock.
const store = vi.hoisted(() => ({ row: null as null | { credential: unknown } }));
vi.mock("../../../utils/prisma.js", () => {
  const integration = {
    findUnique: vi.fn(async () => (store.row ? { id: "int-1", ...store.row } : null)),
    upsert: vi.fn(async ({ create, update }: any) => {
      store.row = { credential: (store.row ? update : create).credential };
      return { id: "int-1" };
    }),
  };
  const db: any = { integration, $queryRaw: vi.fn() };
  db.$transaction = vi.fn((fn: (tx: unknown) => unknown) => fn(db));
  return { default: db };
});
// callMetaApi throws on any non-2xx; a GraphApiError carries Meta's error.
vi.mock("../../whatsapp/wa_axios.js", () => ({
  callMetaApi: vi.fn(),
  GraphApiError: class GraphApiError extends Error {
    error: { message: string };
    constructor(res: { data: { error: { message: string } } }) {
      super("Something went wrong");
      this.error = res.data.error;
    }
  },
}));
vi.mock("../../whatsapp/settings/wa_settings.service.js", () => ({ getWaSettings: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { callMetaApi, GraphApiError } from "../../whatsapp/wa_axios.js";
import { getWaSettings } from "../../whatsapp/settings/wa_settings.service.js";
import { waPaymentProvider } from "./wapayment.provider.js";
import { regenerateWaPaymentOauthLink, syncWaPaymentConfigurations } from "./wapayment.service.js";
import { readWaPaymentConfigurations, WaPaymentError } from "./wapayment.types.js";

const meta = vi.mocked(callMetaApi);
const ORG = "11111111-1111-1111-1111-111111111111";

function metaList(...names: string[]) {
  return {
    status: 200,
    data: {
      data: [
        {
          payment_configurations: names.map((name) => ({
            configuration_name: name,
            provider_name: "razorpay",
            status: "Active",
          })),
        },
      ],
    },
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  store.row = null;
  vi.mocked(getWaSettings).mockResolvedValue({
    wabaId: "waba-1",
    accessToken: "tok",
    phone: "919999999999",
  } as never);
});

describe("syncWaPaymentConfigurations", () => {
  test("stores every configuration Meta lists, from the default number's account", async () => {
    meta.mockResolvedValueOnce(metaList("shop-a", "shop-b"));

    const view = await syncWaPaymentConfigurations(ORG);

    expect(meta).toHaveBeenCalledWith("/waba-1/payment_configurations", "GET", "tok", undefined);
    expect(view.phone).toBe("919999999999");
    expect(view.configurations.map((c) => c.configuration_name)).toEqual(["shop-a", "shop-b"]);
    expect(readWaPaymentConfigurations(store.row?.credential)).toHaveLength(2);
  });

  test("keeps the verification link generated earlier, and drops what Meta no longer lists", async () => {
    store.row = {
      credential: [
        { configuration_name: "shop-a", oauth_url: "https://link", expiration: 1900000000 },
        { configuration_name: "gone", oauth_url: "https://old" },
      ],
    };
    meta.mockResolvedValueOnce(metaList("shop-a"));

    const { configurations } = await syncWaPaymentConfigurations(ORG);

    expect(configurations).toEqual([
      expect.objectContaining({
        configuration_name: "shop-a",
        status: "Active",
        oauth_url: "https://link",
        expiration: 1900000000,
      }),
    ]);
  });

  test("an account with nothing set up does not become connected", async () => {
    meta.mockResolvedValueOnce(metaList());

    await expect(syncWaPaymentConfigurations(ORG)).resolves.toMatchObject({ configurations: [] });
    expect(prisma.integration.upsert).not.toHaveBeenCalled();
  });

  test("when Meta cannot be read, answers with the stored list and why", async () => {
    store.row = { credential: [{ configuration_name: "shop-a" }] };
    meta.mockRejectedValueOnce(
      new GraphApiError({ data: { error: { message: "Permissions error" } } } as never),
    );

    const view = await syncWaPaymentConfigurations(ORG);

    expect(view.configurations).toEqual([{ configuration_name: "shop-a" }]);
    expect(view.syncError).toContain("Permissions error");
    expect(prisma.integration.upsert).not.toHaveBeenCalled();
  });

  test("needs WhatsApp connected", async () => {
    vi.mocked(getWaSettings).mockResolvedValueOnce(null);
    await expect(syncWaPaymentConfigurations(ORG)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("regenerateWaPaymentOauthLink", () => {
  test("saves the new link beside its configuration", async () => {
    store.row = {
      credential: [{ configuration_name: "shop-a" }, { configuration_name: "shop-b" }],
    };
    meta.mockResolvedValueOnce({
      status: 200,
      data: { oauth_url: "https://new", expiration: 1900000001 },
    } as never);

    await regenerateWaPaymentOauthLink(ORG, "shop-b");

    expect(meta).toHaveBeenCalledWith(
      "/waba-1/generate_payment_configuration_oauth_link",
      "POST",
      "tok",
      { configuration_name: "shop-b" },
    );
    expect(store.row?.credential).toEqual([
      { configuration_name: "shop-a" },
      { configuration_name: "shop-b", oauth_url: "https://new", expiration: 1900000001 },
    ]);
  });

  test("refuses a name it does not know, without asking Meta", async () => {
    store.row = { credential: [{ configuration_name: "shop-a" }] };

    await expect(regenerateWaPaymentOauthLink(ORG, "nope")).rejects.toBeInstanceOf(WaPaymentError);
    expect(meta).not.toHaveBeenCalled();
  });

  test("passes Meta's refusal on as a 502", async () => {
    store.row = { credential: [{ configuration_name: "shop-a" }] };
    meta.mockRejectedValueOnce(new GraphApiError({ data: { error: { message: "Bad" } } } as never));

    await expect(regenerateWaPaymentOauthLink(ORG, "shop-a")).rejects.toMatchObject({
      statusCode: 502,
    });
  });
});

test("readWaPaymentConfigurations ignores anything that is not a configuration", () => {
  expect(readWaPaymentConfigurations(null)).toEqual([]);
  expect(readWaPaymentConfigurations({ configuration_name: "x" })).toEqual([]);
  expect(readWaPaymentConfigurations([{ configuration_name: "x" }, null, { a: 1 }])).toEqual([
    { configuration_name: "x" },
  ]);
});

test("the provider has nothing of its own to connect", () => {
  expect(waPaymentProvider.auth).toBe("custom");
  expect(waPaymentProvider.events).toEqual([]);
});
