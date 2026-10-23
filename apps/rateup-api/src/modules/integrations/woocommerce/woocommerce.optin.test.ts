import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: { contact: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("../../../utils/redisConnection.js", () => ({ default: {} }));
vi.mock("../../contact/contact.service.js", () => ({ createContact: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { createContact } from "../../contact/contact.service.js";
import { handleWooOrderOptIn, readWooOptIn } from "./woocommerce.optin.js";
import type { WooCredential } from "./woocommerce.types.js";

type Mock = ReturnType<typeof vi.fn>;
const findContact = prisma.contact.findUnique as unknown as Mock;
const updateContact = prisma.contact.update as unknown as Mock;

const NOW = Date.parse("2026-10-17T10:00:00Z");

const credential: WooCredential = {
  storeUrl: "https://shop.example.com",
  consumerKey: "ck",
  consumerSecret: "cs",
  webhookSecret: "secret",
  webhooks: [],
  store: { country: "IN:KL" },
  connectedAt: "2026-09-28T00:00:00.000Z",
};

const integration = { id: "int-1", orgId: "org-1", credential } as never;

const order = (optIn: "yes" | "no" | null, over: Record<string, unknown> = {}) => ({
  deliveryId: "d-1",
  webhookId: "101",
  payload: {
    id: 31,
    status: "processing",
    // WooCommerce's _gmt dates carry no zone marker.
    date_created_gmt: "2026-10-17T09:58:00",
    billing: {
      first_name: "Asha",
      last_name: "Nair",
      email: " asha@example.com ",
      phone: "098765 43210",
      country: "IN",
    },
    meta_data: [
      { id: 1, key: "_some_plugin", value: "x" },
      ...(optIn ? [{ id: 2, key: "rateup_whatsapp_optin", value: optIn }] : []),
    ],
    ...over,
  },
});

/** Redis as `SET NX` sees it: one claim per key. */
function fakeRedis() {
  const keys = new Set<string>();
  return {
    keys,
    set: vi.fn(async (key: string) => {
      if (keys.has(key)) return null;
      keys.add(key);
      return "OK";
    }),
    del: vi.fn(async (key: string) => (keys.delete(key) ? 1 : 0)),
  };
}

let redis: ReturnType<typeof fakeRedis>;
const run = (data = order("yes")) => handleWooOrderOptIn(integration, data, redis as never, NOW);

beforeEach(() => {
  vi.clearAllMocks();
  redis = fakeRedis();
  findContact.mockResolvedValue(null);
  (createContact as Mock).mockResolvedValue({ id: "contact-new" });
});

describe("the checkout opt-in on an order", () => {
  test("reads the plugin's answer, and nothing from an order without the box", () => {
    expect(readWooOptIn(order("yes").payload)).toBe(true);
    expect(readWooOptIn(order("no").payload)).toBe(false);
    expect(readWooOptIn(order(null).payload)).toBeNull();
  });

  test("an order without the box leaves contacts alone: stores without the plugin are unchanged", async () => {
    expect(await run(order(null))).toBe("no_field");
    expect(findContact).not.toHaveBeenCalled();
    expect(createContact).not.toHaveBeenCalled();
  });

  test("ticked, a new buyer becomes a contact with the billing name and consent on", async () => {
    expect(await run()).toBe("created");
    expect(createContact).toHaveBeenCalledWith({
      orgId: "org-1",
      phone: "919876543210",
      name: "Asha Nair",
      email: "asha@example.com",
      source: "WooCommerce",
      consent: true,
    });
  });

  test("unticked, a new buyer is still a contact, with consent off", async () => {
    expect(await run(order("no"))).toBe("created");
    expect(createContact).toHaveBeenCalledWith(expect.objectContaining({ consent: false }));
  });

  test("ticked, an existing contact is opted in, and only its blanks are filled", async () => {
    findContact.mockResolvedValue({ id: "c-1", name: "Asha N", email: null, consent: false });

    expect(await run()).toBe("updated");
    expect(updateContact).toHaveBeenCalledWith({
      where: { id: "c-1" },
      data: { email: "asha@example.com", consent: true },
    });
    expect(createContact).not.toHaveBeenCalled();
  });

  test("unticked, an existing contact keeps its consent", async () => {
    findContact.mockResolvedValue({ id: "c-1", name: "", email: null, consent: true });

    await run(order("no"));
    expect(updateContact).toHaveBeenCalledWith({
      where: { id: "c-1" },
      data: { name: "Asha Nair", email: "asha@example.com" },
    });
  });

  test("an existing contact with nothing to change is not written", async () => {
    findContact.mockResolvedValue({
      id: "c-1",
      name: "Asha",
      email: "a@example.com",
      consent: false,
    });
    await run(order("no"));
    expect(updateContact).not.toHaveBeenCalled();
  });

  test("applied once per order: order.created and order.updated arriving together", async () => {
    expect(await run()).toBe("created");
    expect(await run()).toBe("already_applied");
    expect(createContact).toHaveBeenCalledTimes(1);
  });

  test("an old order's update does not opt anyone back in", async () => {
    findContact.mockResolvedValue({ id: "c-1", name: "Asha", email: "a@b.c", consent: false });
    expect(await run(order("yes", { date_created_gmt: "2026-09-01T09:00:00" }))).toBe("too_old");
    expect(updateContact).not.toHaveBeenCalled();
  });

  test("a buyer without a usable number is skipped", async () => {
    expect(await run(order("yes", { billing: { first_name: "Asha", phone: "call me" } }))).toBe(
      "no_phone",
    );
    expect(redis.set).not.toHaveBeenCalled();
  });

  test("a contact created a moment ago by someone else is updated instead", async () => {
    (createContact as Mock).mockRejectedValue(Object.assign(new Error("dup"), { code: "P2002" }));
    findContact
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "c-2", name: "", email: null, consent: true });

    expect(await run()).toBe("updated");
    expect(updateContact).toHaveBeenCalledWith({
      where: { id: "c-2" },
      data: { name: "Asha Nair", email: "asha@example.com" },
    });
  });

  test("a failure frees the order for the retry", async () => {
    (createContact as Mock).mockRejectedValueOnce(new Error("db down"));
    await expect(run()).rejects.toThrow("db down");
    expect(redis.keys.size).toBe(0);

    expect(await run()).toBe("created");
  });
});
