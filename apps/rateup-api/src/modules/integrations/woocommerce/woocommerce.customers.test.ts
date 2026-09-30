import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: { contact: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("../shared/entityLink.js", () => ({
  findLinkByExternalId: vi.fn(),
  recordLink: vi.fn(),
}));
vi.mock("../../contact/contact.service.js", () => ({ createContact: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { createContact } from "../../contact/contact.service.js";
import { findLinkByExternalId, recordLink } from "../shared/entityLink.js";
import { handleWooCustomer } from "./woocommerce.customers.js";
import { toWooContact, type WooCustomerPayload } from "./woocommerce.mapping.js";
import type { WooCredential } from "./woocommerce.types.js";

type Mock = ReturnType<typeof vi.fn>;
const findContact = prisma.contact.findUnique as unknown as Mock;
const updateContact = prisma.contact.update as unknown as Mock;

const credential: WooCredential = {
  storeUrl: "https://shop.example.com",
  consumerKey: "ck",
  consumerSecret: "cs",
  webhookSecret: "secret",
  webhooks: [],
  store: { country: "IN:KL" },
  connectedAt: "2026-09-28T00:00:00.000Z",
  syncCustomers: true,
};

const customer = (over: Partial<WooCustomerPayload> = {}): WooCustomerPayload => ({
  id: 55,
  email: " asha@example.com ",
  first_name: "Asha",
  last_name: "Nair",
  billing: { phone: "098765 43210", country: "IN" },
  ...over,
});

const integration = (cred: Partial<WooCredential> = {}) =>
  ({ id: "int-1", orgId: "org-1", credential: { ...credential, ...cred } }) as never;

const delivery = (payload: WooCustomerPayload) => ({
  deliveryId: "d-1",
  webhookId: "102",
  payload: payload as Record<string, unknown>,
});

const LINK = { integrationId: "int-1", entityType: "contact" };

beforeEach(() => {
  vi.clearAllMocks();
  findContact.mockResolvedValue(null);
  (findLinkByExternalId as Mock).mockResolvedValue(null);
  (createContact as Mock).mockResolvedValue({ id: "contact-new" });
});

describe("a WooCommerce customer, as a contact", () => {
  test("keyed on the number as contacts store it, with the name and email", () => {
    expect(toWooContact(customer(), credential)).toEqual({
      externalId: "55",
      name: "Asha Nair",
      phone: "919876543210",
      email: "asha@example.com",
    });
  });

  test("falls back to the billing name, and to the store's country for the number", () => {
    expect(
      toWooContact(
        customer({
          first_name: "",
          last_name: "",
          billing: { first_name: "Ravi", phone: "98765 43210" },
        }),
        credential,
      ),
    ).toMatchObject({ name: "Ravi", phone: "919876543210" });
  });

  test("a customer with no usable number is not a contact", () => {
    expect(toWooContact(customer({ billing: {} }), credential)).toEqual({ skipped: "no_phone" });
    expect(toWooContact(customer({ billing: { phone: "call me" } }), credential)).toEqual({
      skipped: "no_phone",
    });
  });
});

describe("customer.created", () => {
  test("does nothing until the admin switches customer sync on", async () => {
    await expect(
      handleWooCustomer(integration({ syncCustomers: undefined }), delivery(customer())),
    ).resolves.toBe("sync_off");
    expect(createContact).not.toHaveBeenCalled();
  });

  test("a new number becomes a contact from WooCommerce, linked to the customer", async () => {
    await expect(handleWooCustomer(integration(), delivery(customer()))).resolves.toBe("created");

    expect(createContact).toHaveBeenCalledWith({
      orgId: "org-1",
      phone: "919876543210",
      name: "Asha Nair",
      email: "asha@example.com",
      source: "WooCommerce",
    });
    expect(recordLink).toHaveBeenCalledWith(LINK, { rateupId: "contact-new", externalId: "55" });
  });

  test("a number already in RateUp is linked, filling only what the contact lacks", async () => {
    findContact.mockResolvedValue({ id: "contact-1", name: "Asha N.", email: null });

    await expect(handleWooCustomer(integration(), delivery(customer()))).resolves.toBe("linked");

    expect(createContact).not.toHaveBeenCalled();
    expect(updateContact).toHaveBeenCalledWith({
      where: { id: "contact-1" },
      data: { email: "asha@example.com" },
    });
    expect(recordLink).toHaveBeenCalledWith(LINK, { rateupId: "contact-1", externalId: "55" });
  });

  test("a redelivery of a customer already linked changes nothing", async () => {
    (findLinkByExternalId as Mock).mockResolvedValue({ rateupId: "contact-1" });

    await expect(handleWooCustomer(integration(), delivery(customer()))).resolves.toBe(
      "already_linked",
    );
    expect(findContact).not.toHaveBeenCalled();
    expect(createContact).not.toHaveBeenCalled();
  });

  test("losing a race for the number links to the contact that won", async () => {
    (createContact as Mock).mockRejectedValue(
      Object.assign(new Error("unique"), { code: "P2002" }),
    );
    findContact
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "contact-2", name: null, email: null });

    await expect(handleWooCustomer(integration(), delivery(customer()))).resolves.toBe("linked");
    expect(recordLink).toHaveBeenCalledWith(LINK, { rateupId: "contact-2", externalId: "55" });
  });

  test("any other failure is thrown, so the job retries", async () => {
    (createContact as Mock).mockRejectedValue(new Error("database down"));
    await expect(handleWooCustomer(integration(), delivery(customer()))).rejects.toThrow(
      "database down",
    );
  });
});
