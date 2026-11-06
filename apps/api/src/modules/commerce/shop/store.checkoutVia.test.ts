import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const db = vi.hoisted(() => ({
  shopStore: { findUnique: vi.fn(), update: vi.fn(async ({ data }) => data) },
  shopProduct: { count: vi.fn(async () => 0) },
  integration: { findFirst: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../subscription/subscription.service.js", () => ({ getSubscriptionGate: vi.fn() }));
vi.mock("../../org/modules.js", () => ({ revealModule: vi.fn() }));
const queue = vi.hoisted(() => ({ enqueueStoreMirror: vi.fn() }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => queue);
const notifications = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("../../notification/notify.js", () => notifications);

const { onOnlineStoreConnected, onOnlineStoreDisconnected, updateStore } =
  await import("./store.service.js");

const store = (mode: string) => ({ id: "s1", orgId: "org-1", mode, slug: "fern" });

beforeEach(() => vi.clearAllMocks());

describe("the store's checkout setting", () => {
  test("can't name a store the products don't follow", async () => {
    db.shopStore.findUnique.mockResolvedValue(store("NATIVE"));
    await expect(updateStore("org-1", { checkoutVia: "SHOPIFY" })).rejects.toMatchObject({
      code: "INVALID",
    });
    expect(db.shopStore.update).not.toHaveBeenCalled();
  });

  test("can name the connected store the products follow", async () => {
    db.shopStore.findUnique.mockResolvedValue(store("WOOCOMMERCE"));
    db.integration.findFirst.mockResolvedValue({ id: "int-1" });
    await updateStore("org-1", { checkoutVia: "WOOCOMMERCE" });
    expect(db.shopStore.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { checkoutVia: "WOOCOMMERCE" },
    });
  });

  test("RateUp needs nothing connected", async () => {
    db.shopStore.findUnique.mockResolvedValue(store("SHOPIFY"));
    await updateStore("org-1", { checkoutVia: "RATEUP" });
    expect(db.integration.findFirst).not.toHaveBeenCalled();
    expect(db.shopStore.update).toHaveBeenCalled();
  });
});

describe("connecting and disconnecting a store", () => {
  test("connecting never quietly turns a shop into a copy of the store", async () => {
    db.shopStore.findUnique.mockResolvedValue(store("NATIVE"));
    await onOnlineStoreConnected("org-1", "SHOPIFY");
    expect(db.shopStore.update).not.toHaveBeenCalled();
    expect(queue.enqueueStoreMirror).not.toHaveBeenCalled();
  });

  test("reconnecting the store a shop follows copies its products in again", async () => {
    db.shopStore.findUnique.mockResolvedValue(store("SHOPIFY"));
    await onOnlineStoreConnected("org-1", "SHOPIFY");
    expect(queue.enqueueStoreMirror).toHaveBeenCalledWith("s1", 0);
  });

  test("disconnecting the store a shop checks out in moves checkout to RateUp and says so", async () => {
    db.shopStore.findUnique.mockResolvedValue({ ...store("SHOPIFY"), checkoutVia: "SHOPIFY" });
    await onOnlineStoreDisconnected("org-1", "SHOPIFY");
    expect(db.shopStore.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { checkoutVia: "RATEUP" },
    });
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "integration.error",
        data: expect.objectContaining({ integration: "Shopify" }),
      }),
    );
  });

  test("disconnecting a store the shop doesn't check out in changes nothing", async () => {
    db.shopStore.findUnique.mockResolvedValue({ ...store("WOOCOMMERCE"), checkoutVia: "RATEUP" });
    await onOnlineStoreDisconnected("org-1", "WOOCOMMERCE");
    expect(db.shopStore.update).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });
});
