import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: { integration: { findUnique: vi.fn(), upsert: vi.fn() } },
}));
vi.mock("axios", () => ({ default: { get: vi.fn() } }));
vi.mock("../woocommerce/woocommerce.url.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  assertPublicStore: vi.fn(async () => {}),
}));
vi.mock("../shared/integrationHealth.js", () => ({
  recordIntegrationFailure: vi.fn(),
  markIntegrationHealthy: vi.fn(),
}));

import axios from "axios";
import prisma from "../../../utils/prisma.js";
import { markIntegrationHealthy, recordIntegrationFailure } from "../shared/integrationHealth.js";
import { IntegrationConnectError } from "../shared/oauthConnectError.js";
import { assertPublicStore, WooStoreUrlError } from "../woocommerce/woocommerce.url.js";
import {
  AmeliaAddressError,
  ameliaProvider,
  connectAmeliaFromForm,
  fetchAmeliaSlots,
  getAmeliaSlots,
  normaliseAmeliaAddress,
} from "./amelia.js";

const db = prisma as unknown as {
  integration: { findUnique: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
};
const get = axios.get as unknown as ReturnType<typeof vi.fn>;

const API = "https://book.example.com/wp-admin/admin-ajax.php?action=wpamelia_api&call=/api/v1";
const CREDENTIAL = { apiKey: "key-1", baseUrl: API, serviceId: 4 };

function slotsAnswer(date: string, times: string[]) {
  return {
    status: 200,
    data: {
      message: "ok",
      data: { slots: { [date]: Object.fromEntries(times.map((t) => [t, []])) } },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("normaliseAmeliaAddress", () => {
  test("builds the API address from the site", () => {
    expect(normaliseAmeliaAddress("book.example.com")).toBe(API);
    expect(normaliseAmeliaAddress("https://Book.Example.com/")).toBe(API);
  });

  test("accepts a page from inside WordPress and the full API address", () => {
    expect(
      normaliseAmeliaAddress("https://book.example.com/wp-admin/admin.php?page=wpamelia"),
    ).toBe(API);
    expect(normaliseAmeliaAddress(API)).toBe(API);
  });

  test("keeps a WordPress installed in a folder", () => {
    expect(normaliseAmeliaAddress("https://example.com/blog/wp-admin/")).toBe(
      "https://example.com/blog/wp-admin/admin-ajax.php?action=wpamelia_api&call=/api/v1",
    );
  });

  test("refuses plain HTTP, credentials and nonsense", () => {
    expect(() => normaliseAmeliaAddress("http://book.example.com")).toThrow(AmeliaAddressError);
    expect(() => normaliseAmeliaAddress("https://a:b@book.example.com")).toThrow(
      AmeliaAddressError,
    );
    expect(() => normaliseAmeliaAddress("  ")).toThrow(AmeliaAddressError);
  });
});

describe("fetchAmeliaSlots", () => {
  test("asks for the service's slots with the key in the Amelia header", async () => {
    get.mockResolvedValueOnce(slotsAnswer("2026-10-07", ["09:00", "09:30"]));

    await expect(fetchAmeliaSlots(CREDENTIAL, "2026-10-07")).resolves.toEqual(["09:00", "09:30"]);

    const [url, config] = get.mock.calls[0];
    expect(url).toBe(
      `${API}/slots&locationId=&serviceId=4&serviceDuration=&providerIds=&persons=1&startDateTime=2026-10-07%2000%3A00&extras=`,
    );
    expect(config).toMatchObject({ headers: { Amelia: "key-1" }, maxRedirects: 0 });
    expect(config.timeout).toBeGreaterThan(0);
  });

  test("an empty day is an empty list", async () => {
    get.mockResolvedValueOnce(slotsAnswer("2026-10-08", ["10:00"]));
    await expect(fetchAmeliaSlots(CREDENTIAL, "2026-10-07")).resolves.toEqual([]);
  });

  test("says why it failed", async () => {
    get.mockResolvedValueOnce({ status: 401, data: { message: "Unauthorized" } });
    await expect(fetchAmeliaSlots(CREDENTIAL, "2026-10-07")).rejects.toMatchObject({
      reason: "unauthorized",
    });

    get.mockResolvedValueOnce({ status: 400, data: "0" });
    await expect(fetchAmeliaSlots(CREDENTIAL, "2026-10-07")).rejects.toMatchObject({
      reason: "not_amelia",
    });

    get.mockResolvedValueOnce({ status: 400, data: { message: "Service not found" } });
    await expect(fetchAmeliaSlots(CREDENTIAL, "2026-10-07")).rejects.toMatchObject({
      reason: "rejected",
      message: "Amelia answered: Service not found",
    });

    get.mockRejectedValueOnce(new Error("timeout of 5000ms exceeded"));
    await expect(fetchAmeliaSlots(CREDENTIAL, "2026-10-07")).rejects.toMatchObject({
      reason: "unreachable",
    });
  });

  test("never calls an address on a private network", async () => {
    vi.mocked(assertPublicStore).mockRejectedValueOnce(
      new WooStoreUrlError("That address is not reachable from the internet."),
    );
    await expect(fetchAmeliaSlots(CREDENTIAL, "2026-10-07")).rejects.toMatchObject({
      reason: "unreachable",
    });
    expect(get).not.toHaveBeenCalled();
  });
});

describe("connectAmeliaFromForm", () => {
  test("checks the details with a slot search, then saves the API address", async () => {
    db.integration.findUnique.mockResolvedValueOnce(null);
    get.mockResolvedValueOnce({ status: 200, data: { data: { slots: {} } } });

    await expect(
      connectAmeliaFromForm("org-1", {
        baseUrl: "book.example.com",
        apiKey: " key-1 ",
        serviceId: "4",
      }),
    ).resolves.toEqual({ baseUrl: API, serviceId: 4 });

    const saved = db.integration.upsert.mock.calls[0][0];
    expect(saved.create).toMatchObject({ orgId: "org-1", name: "amelia", credential: CREDENTIAL });
    expect(saved.update).toMatchObject({ credential: CREDENTIAL, consecutiveFailures: 0 });
  });

  test("a blank key keeps the saved one", async () => {
    db.integration.findUnique.mockResolvedValueOnce({ credential: { apiKey: "saved-key" } });
    get.mockResolvedValueOnce({ status: 200, data: { data: { slots: {} } } });

    await connectAmeliaFromForm("org-1", { baseUrl: API, apiKey: "", serviceId: "4" });

    expect(get.mock.calls[0][1].headers).toEqual({ Amelia: "saved-key" });
    expect(db.integration.upsert.mock.calls[0][0].update.credential.apiKey).toBe("saved-key");
  });

  test("refuses without saving when Amelia does", async () => {
    db.integration.findUnique.mockResolvedValueOnce(null);
    get.mockResolvedValueOnce({ status: 401, data: { message: "Unauthorized" } });

    await expect(
      connectAmeliaFromForm("org-1", { baseUrl: API, apiKey: "bad", serviceId: "4" }),
    ).rejects.toMatchObject({ statusCode: 400, message: "Amelia rejected the API key." });
    expect(db.integration.upsert).not.toHaveBeenCalled();
  });

  test("refuses a missing key, a bad service ID or a bad address", async () => {
    db.integration.findUnique.mockResolvedValue(null);
    await expect(
      connectAmeliaFromForm("org-1", { baseUrl: API, apiKey: "", serviceId: "4" }),
    ).rejects.toBeInstanceOf(IntegrationConnectError);
    await expect(
      connectAmeliaFromForm("org-1", { baseUrl: API, apiKey: "k", serviceId: "abc" }),
    ).rejects.toBeInstanceOf(IntegrationConnectError);
    await expect(
      connectAmeliaFromForm("org-1", { baseUrl: "http://x.com", apiKey: "k", serviceId: "4" }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(get).not.toHaveBeenCalled();
  });
});

describe("getAmeliaSlots", () => {
  const row = { id: "int-1", orgId: "org-1", active: true, consecutiveFailures: 0 };

  test("returns the times and marks the integration healthy", async () => {
    db.integration.findUnique.mockResolvedValueOnce({ ...row, credential: CREDENTIAL });
    get.mockResolvedValueOnce(slotsAnswer("2026-10-07", ["11:00"]));

    await expect(getAmeliaSlots("org-1", "2026-10-07")).resolves.toEqual(["11:00"]);
    expect(markIntegrationHealthy).toHaveBeenCalled();
  });

  test("a failure is no slots for the customer and a failure on the card", async () => {
    db.integration.findUnique.mockResolvedValueOnce({ ...row, credential: CREDENTIAL });
    get.mockResolvedValueOnce({ status: 500, data: { message: "boom" } });

    await expect(getAmeliaSlots("org-1", "2026-10-07")).resolves.toEqual([]);
    expect(recordIntegrationFailure).toHaveBeenCalledWith(
      expect.objectContaining({ id: "int-1" }),
      "Amelia",
      expect.anything(),
      { notifyAfter: 3 },
    );
  });

  test("not connected or switched off asks nothing", async () => {
    db.integration.findUnique.mockResolvedValueOnce(null);
    await expect(getAmeliaSlots("org-1", "2026-10-07")).resolves.toEqual([]);
    db.integration.findUnique.mockResolvedValueOnce({
      ...row,
      active: false,
      credential: CREDENTIAL,
    });
    await expect(getAmeliaSlots("org-1", "2026-10-07")).resolves.toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });
});

test("the provider connects with a pasted key", () => {
  expect(ameliaProvider.auth).toBe("apiKey");
  expect(ameliaProvider.apiKey?.connect).toBe(connectAmeliaFromForm);
});
