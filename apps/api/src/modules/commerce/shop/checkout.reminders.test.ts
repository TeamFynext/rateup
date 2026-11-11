import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const store = vi.hoisted(() => new Map<string, string>());
const redis = vi.hoisted(() => ({
  set: vi.fn(async (key: string, value: string, _ex: string, _ttl: number, _nx: string) => {
    if (store.has(key)) return null;
    store.set(key, value);
    return "OK";
  }),
  get: vi.fn(async (key: string) => store.get(key) ?? null),
  duplicate: () => ({ on: vi.fn(), subscribe: vi.fn(), publish: vi.fn() }),
  on: vi.fn(),
}));

vi.mock("../../../utils/prisma.js", () => ({ default: {} }));
vi.mock("../../../utils/redisConnection.js", () => ({ default: redis }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("../../../workers/bullmq/queues/shop.queue.js", () => ({ armShopReminder: vi.fn() }));
vi.mock("../catalogs/catalogSettings.service.js", () => ({
  sendAddressFlowToCustomer: vi.fn(),
}));

const { claimCartReminders } = await import("./checkout.service.js");

const order = (id: string, contactId: string | null = "c1") =>
  ({ id, storeId: "s1", contactId, customerPhone: null }) as never;

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

describe("cart reminders per customer", () => {
  test("one cart a day gets reminders, and it may re-arm them", async () => {
    await expect(claimCartReminders(order("o1"))).resolves.toBe(true);
    await expect(claimCartReminders(order("o1"))).resolves.toBe(true);
    await expect(claimCartReminders(order("o2"))).resolves.toBe(false);
  });

  test("another customer is unaffected", async () => {
    await claimCartReminders(order("o1"));
    await expect(claimCartReminders(order("o2", "c2"))).resolves.toBe(true);
  });

  test("fails open when Redis is down, as reminders did before", async () => {
    redis.set.mockRejectedValueOnce(new Error("down"));
    await expect(claimCartReminders(order("o1"))).resolves.toBe(true);
  });
});
