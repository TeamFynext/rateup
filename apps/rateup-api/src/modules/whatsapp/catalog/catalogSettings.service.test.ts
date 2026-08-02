import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    whatsappCatalog: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    waFlow: { findFirst: vi.fn(), update: vi.fn() },
    contact: { findUnique: vi.fn() },
    whatsappSettings: { findUnique: vi.fn(), findFirst: vi.fn() },
    catalogOrder: { findUnique: vi.fn(), update: vi.fn() },
  },
  excludeFields: vi.fn(),
}));

vi.mock("../wa_axios.js", () => ({
  callMetaApi: vi.fn(),
  GraphApiError: class GraphApiError extends Error {},
}));
vi.mock("../flows/flow.service.js", () => ({
  createFlowInDb: vi.fn(),
  publishFlowInWa: vi.fn(),
  sendFlow: vi.fn(),
  updateFlowInDb: vi.fn(),
  getFlowById: vi.fn(),
}));
vi.mock("../settings/wa_settings.service.js", () => ({
  getWaSettings: vi.fn(),
  getWaSettingsWithAccessTokenDecrypted: vi.fn(() => ({ accessToken: "token-abc" })),
}));
vi.mock("../whatsappSurvey/wasurvey.service.js", () => ({
  sendMessage: vi.fn(),
  sendTextMessage: vi.fn(),
}));
vi.mock("../whatsappSurvey/wasurvey.utils.js", () => ({
  createNativePaymentMessage: vi.fn(),
  createListMessage: vi.fn(),
  createTextMessage: vi.fn(),
}));
vi.mock("../../integrations/shopify/shopify.service.js", () => ({
  buildShopifyCartUrl: vi.fn(),
  createShopifyDraftOrder: vi.fn(),
}));
vi.mock("../automatedReply/wa_automatedReply.utils.js", () => ({
  generateOrderReferenceId: vi.fn(() => "ord-1"),
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import { CatalogAddressFlowStatus } from "../../../types/enums.js";
import {
  calculateOrderTotal,
  DEFAULT_ADDRESS_FIELDS,
  getCatalogSettings,
  updateCatalogSettings,
} from "./catalogSettings.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  whatsappCatalog: { findUnique: Mock; findFirst: Mock; update: Mock };
};

const ORG_ID = "org-1";

const CATALOG_SETTINGS: {
  catalogId: string;
  orgId: string;
  storeType: string;
  paymentMethod: string;
  collectAddress: boolean;
  collectDelivery: boolean;
  addressFlowId: string | null;
  addressFlowStatus: CatalogAddressFlowStatus;
  addressFlowFields: unknown;
  deliveryOptions: unknown;
} = {
  catalogId: "cat-1",
  orgId: "org-1",
  storeType: "NATIVE",
  paymentMethod: "COD",
  collectAddress: true,
  collectDelivery: false,
  addressFlowId: null,
  addressFlowStatus: CatalogAddressFlowStatus.IDLE,
  addressFlowFields: null,
  deliveryOptions: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  db.whatsappCatalog.findUnique.mockResolvedValue({ ...CATALOG_SETTINGS });
  db.whatsappCatalog.findFirst.mockResolvedValue({ ...CATALOG_SETTINGS });
  db.whatsappCatalog.update.mockResolvedValue({ ...CATALOG_SETTINGS });
});

describe("DEFAULT_ADDRESS_FIELDS", () => {
  test("gives every field an id, a label and a Shopify key", () => {
    for (const field of DEFAULT_ADDRESS_FIELDS) {
      expect(field.id).toBeTruthy();
      expect(field.label).toBeTruthy();
      expect(field.shopifyKey).toBeTruthy();
    }
  });

  test("uses each id only once", () => {
    const ids = DEFAULT_ADDRESS_FIELDS.map((f) => f.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  test("enables every field out of the box", () => {
    expect(DEFAULT_ADDRESS_FIELDS.every((f) => f.enabled)).toBe(true);
  });

  test("marks the phone number fixed so it cannot be removed", () => {
    const phone = DEFAULT_ADDRESS_FIELDS.find((f) => f.id === "phone");

    expect(phone).toMatchObject({ required: true, fixed: true });
  });

  test("asks for a first name and a first address line, but not a second", () => {
    const required = DEFAULT_ADDRESS_FIELDS.filter((f) => f.required).map((f) => f.id);

    expect(required).toContain("first_name");
    expect(required).toContain("address1");
    expect(required).not.toContain("last_name");
    expect(required).not.toContain("address2");
  });
});

describe("calculateOrderTotal", () => {
  test("multiplies each line's price by its quantity", () => {
    const products = [
      { price: "10.00", quantity: "2" },
      { price: "5.50", quantity: "1" },
    ];

    expect(calculateOrderTotal(products)).toBe(25.5);
  });

  test("adds the delivery charge on top", () => {
    expect(calculateOrderTotal([{ price: "10", quantity: "1" }], { charge: 4.5 })).toBe(14.5);
  });

  test("treats a missing delivery option as no charge", () => {
    expect(calculateOrderTotal([{ price: "10", quantity: "1" }], null)).toBe(10);
    expect(calculateOrderTotal([{ price: "10", quantity: "1" }])).toBe(10);
  });

  test("totals an empty basket as nothing", () => {
    expect(calculateOrderTotal([])).toBe(0);
  });

  test("assumes a quantity of one when the line does not say", () => {
    expect(calculateOrderTotal([{ price: "10" }])).toBe(10);
  });

  test("treats a missing price as free", () => {
    expect(calculateOrderTotal([{ quantity: "3" }])).toBe(0);
  });

  test("treats an unparseable price or quantity as zero and one", () => {
    expect(calculateOrderTotal([{ price: "abc", quantity: "xyz" }])).toBe(0);
  });

  test("rounds to two decimal places so the total is a real money amount", () => {
    // 0.1 * 3 is 0.30000000000000004 in floating point.
    expect(calculateOrderTotal([{ price: "0.1", quantity: "3" }])).toBe(0.3);
  });

  test("handles prices given as numbers rather than strings", () => {
    expect(calculateOrderTotal([{ price: 10, quantity: 2 }])).toBe(20);
  });

  // NOTE: quantity is parsed with parseInt, so a fractional quantity is truncated —
  // 1.5kg of something priced per kg would be charged as 1.
  // parseInt is deliberate: WhatsApp catalog orders arrive from Meta with whole-unit
  // quantities, so a fraction cannot currently reach here. Pinned so that switching to
  // parseFloat — a change to order totals, i.e. to money — is a visible decision.
  test("truncates a fractional quantity, since quantities are whole units", () => {
    expect(calculateOrderTotal([{ price: "10", quantity: "1.5" }])).toBe(10);
  });

  test("charges delivery even on an empty basket", () => {
    expect(calculateOrderTotal([], { charge: 5 })).toBe(5);
  });
});

describe("getCatalogSettings", () => {
  test("returns the catalog's commerce settings", async () => {
    const result = await getCatalogSettings("cat-1", ORG_ID);

    expect(db.whatsappCatalog.findFirst.mock.calls[0][0].where).toEqual({
      catalogId: "cat-1",
      orgId: ORG_ID,
    });
    expect(result).toMatchObject({ catalogId: "cat-1", storeType: "NATIVE" });
  });

  // Same message whether the id does not exist or belongs to another org — the handler
  // turns it into a 404, so the endpoint cannot be used to probe for catalog ids.
  test("refuses a catalog that does not exist", async () => {
    db.whatsappCatalog.findFirst.mockResolvedValue(null);

    await expect(getCatalogSettings("missing", ORG_ID)).rejects.toThrow("Catalog not found");
  });

  test("refuses a catalog belonging to another org", async () => {
    db.whatsappCatalog.findFirst.mockResolvedValue(null);

    await expect(getCatalogSettings("cat-victim", "org-attacker")).rejects.toThrow(
      "Catalog not found",
    );
    expect(db.whatsappCatalog.findFirst.mock.calls[0][0].where.orgId).toBe("org-attacker");
  });

  test("falls back to the default address fields when none are configured", async () => {
    const result = await getCatalogSettings("cat-1", ORG_ID);

    expect(result.addressFlowFields).toEqual(DEFAULT_ADDRESS_FIELDS);
  });

  test("keeps the configured address fields when there are some", async () => {
    const custom = [{ id: "first_name", label: "Name", enabled: true }];
    db.whatsappCatalog.findFirst.mockResolvedValue({
      ...CATALOG_SETTINGS,
      addressFlowFields: custom,
    });

    const result = await getCatalogSettings("cat-1", ORG_ID);

    expect(result.addressFlowFields).toBe(custom);
  });

  test("reports no delivery options rather than null", async () => {
    const result = await getCatalogSettings("cat-1", ORG_ID);

    expect(result.deliveryOptions).toEqual([]);
  });

  test("does not consult Meta for a flow that is not awaiting review", async () => {
    const result = await getCatalogSettings("cat-1", ORG_ID);

    expect(result.addressFlowStatus).toBe(CatalogAddressFlowStatus.IDLE);
  });

  test.each([
    ["under review", CatalogAddressFlowStatus.REVIEW],
    ["still submitting", CatalogAddressFlowStatus.SUBMITTING],
  ])("checks Meta for a flow that is %s", async (_name, status) => {
    db.whatsappCatalog.findFirst.mockResolvedValue({
      ...CATALOG_SETTINGS,
      addressFlowId: "flow-1",
      addressFlowStatus: status,
    });

    const result = await getCatalogSettings("cat-1", ORG_ID);

    // The Meta check is best-effort and returns null here, so the stored status stands.
    expect(result.addressFlowStatus).toBe(status);
  });

  test("does not check Meta when there is no flow to check", async () => {
    db.whatsappCatalog.findFirst.mockResolvedValue({
      ...CATALOG_SETTINGS,
      addressFlowId: null,
      addressFlowStatus: CatalogAddressFlowStatus.REVIEW,
    });

    const result = await getCatalogSettings("cat-1", ORG_ID);

    expect(result.addressFlowStatus).toBe(CatalogAddressFlowStatus.REVIEW);
  });
});

describe("updateCatalogSettings", () => {
  test("applies only the settings the caller actually sent", async () => {
    await updateCatalogSettings("cat-1", ORG_ID, { paymentMethod: "PREPAID" } as any);

    expect(db.whatsappCatalog.update).toHaveBeenCalledWith({
      where: { catalogId: "cat-1" },
      data: { paymentMethod: "PREPAID" },
    });
  });

  test("issues an empty update when the caller sent nothing", async () => {
    await updateCatalogSettings("cat-1", ORG_ID, {} as any);

    expect(db.whatsappCatalog.update.mock.calls[0][0].data).toEqual({});
  });

  test.each([
    ["storeType", "SHOPIFY"],
    ["paymentMethod", "COD"],
    ["collectAddress", true],
    ["collectDelivery", true],
    ["fixedDeliveryCharge", true],
    ["fixedDeliveryAmount", 40],
  ])("carries %s through", async (key, value) => {
    await updateCatalogSettings("cat-1", ORG_ID, { [key]: value } as any);

    expect(db.whatsappCatalog.update.mock.calls[0][0].data).toEqual({ [key]: value });
  });

  // `!== undefined` rather than truthiness, so switching a flag off actually persists.
  test("persists a flag being switched off", async () => {
    await updateCatalogSettings("cat-1", ORG_ID, { collectAddress: false } as any);

    expect(db.whatsappCatalog.update.mock.calls[0][0].data).toEqual({ collectAddress: false });
  });

  test("persists a delivery amount of zero", async () => {
    await updateCatalogSettings("cat-1", ORG_ID, { fixedDeliveryAmount: 0 } as any);

    expect(db.whatsappCatalog.update.mock.calls[0][0].data).toEqual({ fixedDeliveryAmount: 0 });
  });

  test("replaces the delivery options wholesale", async () => {
    const options = [{ id: "std", label: "Standard", charge: 40 }];

    await updateCatalogSettings("cat-1", ORG_ID, { deliveryOptions: options } as any);

    expect(db.whatsappCatalog.update.mock.calls[0][0].data.deliveryOptions).toBe(options);
  });

  test("can clear the delivery options with an empty list", async () => {
    await updateCatalogSettings("cat-1", ORG_ID, { deliveryOptions: [] } as any);

    expect(db.whatsappCatalog.update.mock.calls[0][0].data.deliveryOptions).toEqual([]);
  });

  // Ownership is confirmed before the write. These are commerce settings — payment
  // method, delivery charges, address collection — so another org rewriting them is a
  // real change to how that org takes money.
  test("confirms the org owns the catalog before writing", async () => {
    await updateCatalogSettings("cat-1", ORG_ID, { paymentMethod: "COD" } as any);

    expect(db.whatsappCatalog.findFirst).toHaveBeenCalledWith({
      where: { catalogId: "cat-1", orgId: ORG_ID },
      select: { catalogId: true },
    });
  });

  test("refuses to rewrite another org's settings", async () => {
    db.whatsappCatalog.findFirst.mockResolvedValue(null);

    await expect(
      updateCatalogSettings("cat-victim", "org-attacker", { paymentMethod: "COD" } as any),
    ).rejects.toThrow("Catalog not found");
    expect(db.whatsappCatalog.update).not.toHaveBeenCalled();
  });
});
