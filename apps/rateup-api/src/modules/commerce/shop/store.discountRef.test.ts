import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({
  shopStore: {
    findUnique: vi.fn(async () => ({ id: "s1", orgId: "org" })),
    findFirst: vi.fn(async () => null),
    update: vi.fn(async () => ({ id: "s1" })),
    upsert: vi.fn(async () => ({ id: "s1", orgId: "org" })),
    create: vi.fn(async () => ({ id: "s1", orgId: "org" })),
  },
  shopDiscount: { findFirst: vi.fn() },
}));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));

const { updateStore } = await import("./store.service.js");

beforeEach(() => vi.clearAllMocks());

describe("the cart reminder's coupon", () => {
  test("must be one of the store's own", async () => {
    db.shopDiscount.findFirst.mockResolvedValue(null);
    await expect(
      updateStore("org", { cartReminderDiscountId: "other-store-coupon" } as never),
    ).rejects.toMatchObject({ code: "INVALID" });
    expect(db.shopDiscount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "other-store-coupon", storeId: "s1" } }),
    );
    expect(db.shopStore.update).not.toHaveBeenCalled();
  });

  test("the store's own coupon is saved", async () => {
    db.shopDiscount.findFirst.mockResolvedValue({ id: "mine" });
    await updateStore("org", { cartReminderDiscountId: "mine" } as never);
    expect(db.shopStore.update).toHaveBeenCalled();
  });
});
