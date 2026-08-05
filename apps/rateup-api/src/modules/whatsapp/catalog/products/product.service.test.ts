import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/prisma.js", () => ({
  default: {
    waCatalogProduct: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  },
  excludeFields: vi.fn(),
}));

vi.mock("../../settings/wa_settings.service.js", () => ({
  getWaSettings: vi.fn(async () => ({ accessToken: "token-abc" })),
}));
vi.mock("../../wa_axios.js", () => ({ callMetaApi: vi.fn() }));
vi.mock("../catalog.service.js", () => ({ getWaCatalog: vi.fn() }));
vi.mock("../../../integrations/shopify/shopify.service.js", () => ({ getShopifyInfo: vi.fn() }));
vi.mock("../../../integrations/shopify/shopify.config.js", () => ({
  default: { clients: { Graphql: vi.fn() } },
}));
vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../../utils/prisma.js";
import { getWaSettings } from "../../settings/wa_settings.service.js";
import { callMetaApi } from "../../wa_axios.js";
import { getWaCatalog } from "../catalog.service.js";
import {
  createCatalogProductsBatch,
  deleteCatalogProducts,
  getCatalogProducts,
  sendProducts,
  updateCatalogProducts,
} from "./product.service.js";
import {
  CatalogHotelInput,
  CatalogProductCoreInput,
  CatalogProductTypes,
} from "./product.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const db = (
  prisma as unknown as {
    waCatalogProduct: { createMany: Mock; findMany: Mock; deleteMany: Mock; update: Mock };
  }
).waCatalogProduct;

const callMetaApiMock = callMetaApi as unknown as Mock;
const getWaSettingsMock = getWaSettings as unknown as Mock;
const getWaCatalogMock = getWaCatalog as unknown as Mock;

const ORG_ID = "org-1";
const CATALOG_ID = "cat-1";

/** A product item as the client sends it, before Meta formatting. */
type ProductItemInput = CatalogProductCoreInput & { shopifyVariantId?: string };
function productItem(overrides: Partial<ProductItemInput> = {}): ProductItemInput {
  return {
    retailer_id: "sku-1",
    title: "Running shoe",
    description: "A comfortable running shoe.",
    condition: "new",
    link: "https://example.com/products/sku-1",
    price: 99.5,
    sale_price: "89",
    currencyCode: "INR",
    availability: "in stock",
    brand: "Acme",
    internal_label: ["summer"],
    image: [{ url: "https://img/1.png" }],
    ...overrides,
  };
}

/** The Meta requests array built by whichever call is under test. */
function metaRequests() {
  return callMetaApiMock.mock.calls[0][3].requests;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.createMany.mockResolvedValue({ count: 1 });
  db.findMany.mockResolvedValue([]);
  db.deleteMany.mockResolvedValue({ count: 1 });
  db.update.mockResolvedValue({});
  callMetaApiMock.mockResolvedValue({ data: { handles: ["h1"] } });
  getWaSettingsMock.mockResolvedValue({ accessToken: "token-abc" });
  getWaCatalogMock.mockResolvedValue({ catalogId: CATALOG_ID, vertical: "commerce" });
});

describe("sendProducts", () => {
  test("posts the batch to the catalog's items_batch endpoint", async () => {
    const requests = [{ method: "CREATE" as const, data: { id: "sku-1" } }];

    await sendProducts(ORG_ID, requests, CatalogProductTypes.PRODUCT_ITEM, CATALOG_ID);

    const [url, method, token, body, , headers] = callMetaApiMock.mock.calls[0];
    expect(url).toBe(`/${CATALOG_ID}/items_batch`);
    expect(method).toBe("POST");
    expect(token).toBeNull();
    expect(body).toEqual({
      access_token: "token-abc",
      item_type: "PRODUCT_ITEM",
      requests,
    });
    expect(headers).toEqual({ "Content-Type": "application/json" });
  });

  test("returns Meta's response body", async () => {
    await expect(
      sendProducts(ORG_ID, [], CatalogProductTypes.PRODUCT_ITEM, CATALOG_ID),
    ).resolves.toEqual({
      handles: ["h1"],
    });
  });

  test("uses the org's own access token", async () => {
    await sendProducts(ORG_ID, [], CatalogProductTypes.PRODUCT_ITEM, CATALOG_ID);

    expect(getWaSettingsMock).toHaveBeenCalledWith(ORG_ID);
  });
});

describe("createCatalogProductsBatch - product items", () => {
  test("sends a CREATE request per item", async () => {
    await createCatalogProductsBatch(
      ORG_ID,
      "PRODUCT_ITEM" as any,
      [productItem(), productItem({ retailer_id: "sku-2" })],
      CATALOG_ID,
    );

    expect(metaRequests()).toHaveLength(2);
    expect(metaRequests()[0].method).toBe("CREATE");
  });

  test("sends the retailer id to Meta as `id`", async () => {
    await createCatalogProductsBatch(ORG_ID, "PRODUCT_ITEM" as any, [productItem()], CATALOG_ID);

    expect(metaRequests()[0].data.id).toBe("sku-1");
    expect(metaRequests()[0].data).not.toHaveProperty("retailer_id");
  });

  test("formats the price as an amount with its currency, to two decimals", async () => {
    await createCatalogProductsBatch(
      ORG_ID,
      "PRODUCT_ITEM" as any,
      [productItem({ price: 99.5 })],
      CATALOG_ID,
    );

    expect(metaRequests()[0].data.price).toBe("99.50 INR");
  });

  test("quotes each internal label, as Meta's batch format requires", async () => {
    await createCatalogProductsBatch(
      ORG_ID,
      "PRODUCT_ITEM" as any,
      [productItem({ internal_label: ["summer", "sale"] })],
      CATALOG_ID,
    );

    expect(metaRequests()[0].data.internal_label).toEqual(["'summer'", "'sale'"]);
  });

  test("stores the first image as the main one and all of them as extras", async () => {
    await createCatalogProductsBatch(
      ORG_ID,
      "PRODUCT_ITEM" as any,
      [productItem({ image: [{ url: "https://img/1.png" }, { url: "https://img/2.png" }] })],
      CATALOG_ID,
    );

    const stored = db.createMany.mock.calls[0][0].data[0];
    expect(stored.productProps.image_link).toBe("https://img/1.png");
    expect(stored.productProps.additional_image_link).toEqual([
      "https://img/1.png",
      "https://img/2.png",
    ]);
  });

  test("leaves the image links unset when the item has no images", async () => {
    await createCatalogProductsBatch(
      ORG_ID,
      "PRODUCT_ITEM" as any,
      [productItem({ image: [] })],
      CATALOG_ID,
    );

    const stored = db.createMany.mock.calls[0][0].data[0];
    expect(stored.productProps.image_link).toBeUndefined();
    expect(stored.productProps.additional_image_link).toBeUndefined();
  });

  test("files the stored row under the catalog and its type", async () => {
    await createCatalogProductsBatch(ORG_ID, "PRODUCT_ITEM" as any, [productItem()], CATALOG_ID);

    expect(db.createMany.mock.calls[0][0].data[0]).toMatchObject({
      type: "PRODUCT_ITEM",
      retailer_id: "sku-1",
      catalogId: CATALOG_ID,
    });
  });

  test("keeps the Shopify variant id out of the Meta payload but on the stored row", async () => {
    await createCatalogProductsBatch(
      ORG_ID,
      "PRODUCT_ITEM" as any,
      [productItem({ shopifyVariantId: "variant-1" })],
      CATALOG_ID,
    );

    expect(metaRequests()[0].data).not.toHaveProperty("shopifyVariantId");
    expect(db.createMany.mock.calls[0][0].data[0].shopifyVariantId).toBe("variant-1");
  });

  test("sends to Meta before storing anything locally", async () => {
    const order: string[] = [];
    callMetaApiMock.mockImplementation(async () => {
      order.push("meta");
      return { data: {} };
    });
    db.createMany.mockImplementation(async () => {
      order.push("db");
      return { count: 1 };
    });

    await createCatalogProductsBatch(ORG_ID, "PRODUCT_ITEM" as any, [productItem()], CATALOG_ID);

    expect(order).toEqual(["meta", "db"]);
  });

  test("stores nothing when Meta rejects the batch", async () => {
    callMetaApiMock.mockRejectedValue(new Error("meta rejected"));

    await expect(
      createCatalogProductsBatch(ORG_ID, "PRODUCT_ITEM" as any, [productItem()], CATALOG_ID),
    ).rejects.toThrow("meta rejected");
    expect(db.createMany).not.toHaveBeenCalled();
  });
});

describe("createCatalogProductsBatch - hotels", () => {
  const hotel = (overrides: Partial<CatalogHotelInput> = {}): CatalogHotelInput => ({
    hotel_id: "hotel-1",
    name: "Grand",
    latitude: "12.34",
    longitude: "56.78",
    url: "https://example.com/hotels/hotel-1",
    address: { city: "Metropolis" },
    base_price: 5000,
    sale_price: "4500",
    currencyCode: "INR",
    tags: ["beach"],
    numbertags: [3],
    description: "A grand hotel by the beach.",
    image: [{ url: "https://img/h.png", tag: [] }],
    ...overrides,
  });

  // Money fields go through the shared formatMoney, so they carry two decimals on both
  // create and update. base_price/sale_price were previously unformatted on both paths.
  test("formats the base and sale prices with the currency, to two decimals", async () => {
    await createCatalogProductsBatch(ORG_ID, "HOTEL" as any, [hotel()], CATALOG_ID);

    expect(metaRequests()[0].data.base_price).toBe("5000.00 INR");
    expect(metaRequests()[0].data.sale_price).toBe("4500.00 INR");
  });

  test("spreads text tags into custom_label_N fields", async () => {
    await createCatalogProductsBatch(
      ORG_ID,
      "HOTEL" as any,
      [hotel({ tags: ["beach", "spa"] })],
      CATALOG_ID,
    );

    expect(metaRequests()[0].data.custom_label_0).toBe("beach");
    expect(metaRequests()[0].data.custom_label_1).toBe("spa");
  });

  test("spreads numeric tags into custom_number_N fields", async () => {
    await createCatalogProductsBatch(
      ORG_ID,
      "HOTEL" as any,
      [hotel({ numbertags: [3, 5] })],
      CATALOG_ID,
    );

    expect(metaRequests()[0].data.custom_number_0).toBe(3);
    expect(metaRequests()[0].data.custom_number_1).toBe(5);
  });

  test("stores the hotel under hotelProps rather than productProps", async () => {
    await createCatalogProductsBatch(ORG_ID, "HOTEL" as any, [hotel()], CATALOG_ID);

    const stored = db.createMany.mock.calls[0][0].data[0];
    expect(stored.hotelProps).toBeDefined();
    expect(stored.productProps).toBeUndefined();
  });

  test("stores a hotel room under hotelRoomProps", async () => {
    await createCatalogProductsBatch(
      ORG_ID,
      "HOTEL_ROOM" as any,
      [
        {
          name: "Grand - Room 1",
          url: "https://example.com/hotels/hotel-1/rooms/room-1",
          description: "A room with a view.",
          hotel_retailer_id: "hotel-1",
          hotel_room_id: "room-1",
          base_price: 2000,
          currencyCode: "INR",
          image: [],
        },
      ],
      CATALOG_ID,
    );

    const stored = db.createMany.mock.calls[0][0].data[0];
    expect(stored.hotelRoomProps).toBeDefined();
    expect(metaRequests()[0].data.base_price).toBe("2000.00 INR");
  });
});

describe("getCatalogProducts", () => {
  test("lists the catalog's products", async () => {
    db.findMany.mockResolvedValue([{ id: "prod-1" }]);

    const result = await getCatalogProducts(CATALOG_ID);

    expect(db.findMany).toHaveBeenCalledWith({ where: { catalogId: CATALOG_ID } });
    expect(result).toEqual([{ id: "prod-1" }]);
  });

  // The query parameter is gone. It used to be accepted, named `_query` and ignored, so
  // any search or filter a client sent silently did nothing and the full list came back
  // with no error. The dashboard sends none, so it was dead rather than unimplemented —
  // dropped instead of filled in, so a caller cannot pass something that does nothing.
  test("takes no filter argument at all", () => {
    expect(getCatalogProducts.length).toBe(1);
  });
});

describe("deleteCatalogProducts", () => {
  test("sends a DELETE request per product to Meta", async () => {
    await deleteCatalogProducts(ORG_ID, CATALOG_ID, [{ id: "sku-1" }, { id: "sku-2" }] as any);

    expect(metaRequests()).toEqual([
      { method: "DELETE", data: { id: "sku-1" } },
      { method: "DELETE", data: { id: "sku-2" } },
    ]);
  });

  test("addresses a hotel by hotel_id rather than id", async () => {
    getWaCatalogMock.mockResolvedValue({ vertical: "hotels" });

    await deleteCatalogProducts(ORG_ID, CATALOG_ID, [{ id: "hotel-1" }] as any);

    expect(metaRequests()[0].data).toEqual({ hotel_id: "hotel-1" });
  });

  test("deletes the matching rows locally after Meta accepts", async () => {
    await deleteCatalogProducts(ORG_ID, CATALOG_ID, [{ id: "sku-1" }] as any);

    expect(db.deleteMany).toHaveBeenCalled();
    expect(db.deleteMany.mock.calls[0][0].where.retailer_id).toEqual({ in: ["sku-1"] });
  });

  // Retailer ids are merchant-chosen SKUs, so two catalogs — in the same org or in
  // different ones — can hold the same id. Without catalogId the deleteMany reached
  // across all of them, so one org deleting a product deleted another org's row.
  test("confines the local delete to the catalog being deleted from", async () => {
    await deleteCatalogProducts(ORG_ID, CATALOG_ID, [{ id: "sku-1" }] as any);

    expect(db.deleteMany.mock.calls[0][0].where.catalogId).toBe(CATALOG_ID);
  });

  test("confines the hotel delete to the catalog too", async () => {
    getWaCatalogMock.mockResolvedValue({ vertical: "hotels" });

    await deleteCatalogProducts(ORG_ID, CATALOG_ID, [{ id: "hotel-1" }] as any);

    expect(db.deleteMany.mock.calls[0][0].where.catalogId).toBe(CATALOG_ID);
  });

  test("confines the hotel-room delete to the catalog too", async () => {
    getWaCatalogMock.mockResolvedValue({ vertical: "hotel_room" });

    await deleteCatalogProducts(ORG_ID, CATALOG_ID, [
      { id: "room-1", hotel_retailer_id: "hotel-1" },
    ] as any);

    expect(db.deleteMany.mock.calls[0][0].where.catalogId).toBe(CATALOG_ID);
  });

  test("does not delete locally when Meta rejects the batch", async () => {
    callMetaApiMock.mockRejectedValue(new Error("meta rejected"));

    await expect(
      deleteCatalogProducts(ORG_ID, CATALOG_ID, [{ id: "sku-1" }] as any),
    ).rejects.toThrow("meta rejected");
    expect(db.deleteMany).not.toHaveBeenCalled();
  });

  // The room id is `id.id`, as in every other branch. Sending the whole identifier
  // object matched nothing at Meta, so hotel-room deletes never actually reached it.
  test("sends the room id, not the whole identifier object", async () => {
    getWaCatalogMock.mockResolvedValue({ vertical: "hotel_room" });
    const identifier = { id: "room-1", hotel_retailer_id: "hotel-1" };

    await deleteCatalogProducts(ORG_ID, CATALOG_ID, [identifier] as any);

    expect(metaRequests()[0].data).toEqual({
      hotel_retailer_id: "hotel-1",
      hotel_room_id: "room-1",
    });
  });
});

describe("updateCatalogProducts", () => {
  test("sends an UPDATE request per item", async () => {
    await updateCatalogProducts(
      ORG_ID,
      CATALOG_ID,
      [productItem()],
      CatalogProductTypes.PRODUCT_ITEM,
    );

    expect(metaRequests()[0].method).toBe("UPDATE");
  });

  // Create and update share formatMoney, so the same product sends the same string
  // either way. Update used to send the raw value: "99.50 INR" on create, "99.5 INR" on
  // update, and a price like 99.999 went through unrounded.
  test("formats the price the same way create does", async () => {
    await updateCatalogProducts(
      ORG_ID,
      CATALOG_ID,
      [productItem({ price: 99.5 })],
      CatalogProductTypes.PRODUCT_ITEM,
    );

    expect(metaRequests()[0].data.price).toBe("99.50 INR");
  });

  test("rounds a price with too many decimals", async () => {
    await updateCatalogProducts(
      ORG_ID,
      CATALOG_ID,
      [productItem({ price: 99.999 })],
      CatalogProductTypes.PRODUCT_ITEM,
    );

    expect(metaRequests()[0].data.price).toBe("100.00 INR");
  });

  test("quotes the internal labels as create does", async () => {
    await updateCatalogProducts(
      ORG_ID,
      CATALOG_ID,
      [productItem({ internal_label: ["sale"] })],
      CatalogProductTypes.PRODUCT_ITEM,
    );

    expect(metaRequests()[0].data.internal_label).toEqual(["'sale'"]);
  });

  test("leaves the labels alone when the update does not mention them", async () => {
    await updateCatalogProducts(
      ORG_ID,
      CATALOG_ID,
      [productItem({ internal_label: undefined })],
      CatalogProductTypes.PRODUCT_ITEM,
    );

    expect(metaRequests()[0].data.internal_label).toBeUndefined();
  });

  test("updates the local row by catalog and retailer id together", async () => {
    await updateCatalogProducts(
      ORG_ID,
      CATALOG_ID,
      [productItem()],
      CatalogProductTypes.PRODUCT_ITEM,
    );

    expect(db.update.mock.calls[0][0].where).toEqual({
      catalog_retailer_id_unique: { catalogId: CATALOG_ID, retailer_id: "sku-1" },
    });
  });

  test("writes the item's fields into productProps", async () => {
    await updateCatalogProducts(
      ORG_ID,
      CATALOG_ID,
      [productItem()],
      CatalogProductTypes.PRODUCT_ITEM,
    );

    expect(db.update.mock.calls[0][0].data.productProps).toMatchObject({
      title: "Running shoe",
      currency: "INR",
      image_link: "https://img/1.png",
    });
  });

  test("updates every item it was given", async () => {
    await updateCatalogProducts(
      ORG_ID,
      CATALOG_ID,
      [productItem(), productItem({ retailer_id: "sku-2" })],
      CatalogProductTypes.PRODUCT_ITEM,
    );

    expect(db.update).toHaveBeenCalledTimes(2);
  });

  test("does not touch the local rows when Meta rejects the batch", async () => {
    callMetaApiMock.mockRejectedValue(new Error("meta rejected"));

    await expect(
      updateCatalogProducts(ORG_ID, CATALOG_ID, [productItem()], CatalogProductTypes.PRODUCT_ITEM),
    ).rejects.toThrow("meta rejected");
    expect(db.update).not.toHaveBeenCalled();
  });
});
