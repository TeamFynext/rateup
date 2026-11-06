import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const db = vi.hoisted(() => ({
  whatsappSettings: { findFirst: vi.fn() },
  shopPhoneVerification: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  shopStore: { findUnique: vi.fn() },
  shopOrder: { findFirst: vi.fn(), update: vi.fn(), count: vi.fn() },
}));
const notify = vi.hoisted(() => ({
  sendShopMessage: vi.fn(async () => ({ sent: true, channel: "WHATSAPP" })),
}));
const recovery = vi.hoisted(() => ({
  subscribeBackInStock: vi.fn(async () => ({ ok: true, message: "You're on the list." })),
}));
const checkout = vi.hoisted(() => ({ payPublicCheckout: vi.fn() }));
const redis = vi.hoisted(() => ({ incr: vi.fn(), expire: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("./notify.js", () => notify);
vi.mock("./recovery.service.js", () => recovery);
vi.mock("./checkout.service.js", () => checkout);
vi.mock("../../../utils/redisConnection.js", () => ({ default: redis }));

const {
  assertOfflineOrderAllowed,
  confirmShopPhone,
  customerReachable,
  readVerifyCode,
  startPhoneVerification,
} = await import("./phoneVerify.service.js");
const { ShopError } = await import("./shop.errors.js");

const store = { id: "s1", orgId: "org1" };
const who = { orgId: "org1", contactId: "c1", phone: "15550100", code: "ABC234" };

beforeEach(() => {
  vi.clearAllMocks();
  db.whatsappSettings.findFirst.mockResolvedValue({ phone: "+1 555 0199" });
  db.shopPhoneVerification.count.mockResolvedValue(0);
  db.shopPhoneVerification.findFirst.mockResolvedValue(null);
  db.shopPhoneVerification.create.mockResolvedValue({});
  db.shopPhoneVerification.updateMany.mockResolvedValue({ count: 1 });
  db.shopStore.findUnique.mockResolvedValue(store);
  redis.incr.mockResolvedValue(1);
  redis.expire.mockResolvedValue(1);
});

describe("who may be messaged", () => {
  test("a storefront number only once proven or paid", () => {
    const base = { channel: "STOREFRONT", phoneVerifiedAt: null, paidAt: null } as const;
    expect(customerReachable(base)).toBe(false);
    expect(customerReachable({ ...base, phoneVerifiedAt: new Date() })).toBe(true);
    expect(customerReachable({ ...base, paidAt: new Date() })).toBe(true);
    expect(customerReachable({ ...base, channel: "WHATSAPP" })).toBe(true);
  });
});

describe("the code in a message", () => {
  test("is read from the prefilled text, case-insensitively", () => {
    expect(readVerifyCode("Confirm my order #1001. RU-ABC234")).toBe("ABC234");
    expect(readVerifyCode("ru-abc234")).toBe("ABC234");
    expect(readVerifyCode("hello")).toBeNull();
    expect(readVerifyCode("RU-ABC23")).toBeNull();
  });
});

describe("starting a check", () => {
  test("links to the store's WhatsApp with the code prefilled", async () => {
    const link = await startPhoneVerification({ store, purpose: "back_in_stock", prompt: "Hi" });
    expect(link.code).toMatch(/^RU-[A-Z2-9]{6}$/);
    expect(link.waUrl).toBe(`https://wa.me/15550199?text=${encodeURIComponent(`Hi ${link.code}`)}`);
  });

  test("needs the store to have a WhatsApp number", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue(null);
    await expect(
      startPhoneVerification({ store, purpose: "back_in_stock", prompt: "Hi" }),
    ).rejects.toMatchObject({ code: "PAYMENT_UNAVAILABLE" });
  });

  test("refuses once the store holds too many unconfirmed codes", async () => {
    db.shopPhoneVerification.count.mockResolvedValue(300);
    await expect(
      startPhoneVerification({ store, purpose: "back_in_stock", prompt: "Hi" }),
    ).rejects.toMatchObject({ code: "LIMIT_REACHED" });
    expect(db.shopPhoneVerification.create).not.toHaveBeenCalled();
  });

  test("one visitor can't fill the store: codes are capped per IP", async () => {
    redis.incr.mockResolvedValue(6);
    await expect(
      startPhoneVerification({ store, purpose: "back_in_stock", prompt: "Hi", ip: "203.0.113.9" }),
    ).rejects.toMatchObject({ code: "LIMIT_REACHED" });
    expect(redis.incr).toHaveBeenCalledWith("shop:verify:s1:203.0.113.9");
    expect(db.shopPhoneVerification.create).not.toHaveBeenCalled();
  });

  test("the IP window starts with the first code", async () => {
    await startPhoneVerification({
      store,
      purpose: "back_in_stock",
      prompt: "Hi",
      ip: "203.0.113.9",
    });
    expect(redis.expire).toHaveBeenCalledWith("shop:verify:s1:203.0.113.9", 15 * 60);
  });

  test("a Redis outage doesn't stop people confirming", async () => {
    redis.incr.mockRejectedValue(new Error("down"));
    await expect(
      startPhoneVerification({ store, purpose: "back_in_stock", prompt: "Hi", ip: "203.0.113.9" }),
    ).resolves.toBeTruthy();
  });

  test("only recent unconfirmed codes hold the store's capacity, and codes live 15 minutes", async () => {
    const link = await startPhoneVerification({ store, purpose: "back_in_stock", prompt: "Hi" });
    const where = db.shopPhoneVerification.count.mock.calls[0][0].where;
    expect(Date.now() - where.createdAt.gt.getTime()).toBeLessThanOrEqual(5 * 60_000 + 1000);
    expect(link.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(15 * 60_000 + 1000);
  });

  test("reuses the live code for the same order", async () => {
    db.shopPhoneVerification.findFirst.mockResolvedValue({
      code: "QWE789",
      expiresAt: new Date(Date.now() + 60_000),
    });
    const link = await startPhoneVerification({
      store,
      purpose: "checkout",
      orderId: "o1",
      method: "cod",
      prompt: "Confirm",
    });
    expect(link.code).toBe("RU-QWE789");
    expect(db.shopPhoneVerification.create).not.toHaveBeenCalled();
  });
});

describe("confirming from WhatsApp", () => {
  test("ignores a code this store never issued", async () => {
    db.shopPhoneVerification.findUnique.mockResolvedValue(null);
    expect(await confirmShopPhone(who)).toBe(false);
  });

  test("tells the sender when the code has expired", async () => {
    db.shopPhoneVerification.findUnique.mockResolvedValue({
      id: "v1",
      confirmedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(await confirmShopPhone(who)).toBe(true);
    expect(db.shopPhoneVerification.updateMany).not.toHaveBeenCalled();
    expect(notify.sendShopMessage).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: "c1" }),
      { text: expect.stringContaining("expired") },
    );
  });

  test("signs the sender up for the restock", async () => {
    db.shopPhoneVerification.findUnique.mockResolvedValue({
      id: "v1",
      purpose: "back_in_stock",
      variantId: "var1",
      confirmedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await confirmShopPhone(who);
    expect(recovery.subscribeBackInStock).toHaveBeenCalledWith({
      storeId: "s1",
      variantId: "var1",
      contactId: "c1",
      channel: "WHATSAPP",
    });
  });

  test("places the order with the number the message came from", async () => {
    db.shopPhoneVerification.findUnique.mockResolvedValue({
      id: "v1",
      purpose: "checkout",
      orderId: "o1",
      method: "bank",
      confirmedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    db.shopOrder.findFirst.mockResolvedValue({
      id: "o1",
      status: "DRAFT",
      checkoutToken: "tok",
      contactId: null,
      number: 1001,
    });
    await confirmShopPhone(who);
    expect(db.shopOrder.update).toHaveBeenCalledWith({
      where: { id: "o1" },
      data: expect.objectContaining({ customerPhone: "15550100", contactId: "c1" }),
    });
    expect(checkout.payPublicCheckout).toHaveBeenCalledWith("tok", "bank");
  });

  test("a code is used once", async () => {
    db.shopPhoneVerification.findUnique.mockResolvedValue({
      id: "v1",
      purpose: "checkout",
      orderId: "o1",
      method: "cod",
      confirmedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    db.shopPhoneVerification.updateMany.mockResolvedValue({ count: 0 });
    expect(await confirmShopPhone(who)).toBe(true);
    expect(checkout.payPublicCheckout).not.toHaveBeenCalled();
  });
});

describe("unpaid cash and transfer orders", () => {
  test("are capped per number at a store", async () => {
    db.shopOrder.count.mockResolvedValue(3);
    await expect(assertOfflineOrderAllowed("s1", "15550100")).rejects.toBeInstanceOf(ShopError);
    db.shopOrder.count.mockResolvedValue(2);
    await expect(assertOfflineOrderAllowed("s1", "15550100")).resolves.toBeUndefined();
  });
});
