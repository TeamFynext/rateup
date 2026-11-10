import { beforeEach, expect, test, vi } from "vite-plus/test";

const db = vi.hoisted(() => ({
  shopStore: { findUnique: vi.fn() },
  shopOrder: { findMany: vi.fn() },
}));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("./events.js", () => ({ checkoutUrl: (t: string) => `https://shop.test/c/${t}` }));
vi.mock("./externalCheckout.service.js", () => ({
  checkoutLinkFor: vi.fn(),
  storeChecksOut: vi.fn(),
}));
vi.mock("./orders.service.js", () => ({ createDraftOrder: vi.fn(), repriceOrder: vi.fn() }));
vi.mock("./recovery.service.js", () => ({ subscribeBackInStock: vi.fn() }));
vi.mock("./orderAllowance.js", () => ({ assertCanTakeOrder: vi.fn() }));
vi.mock("./store.service.js", () => ({ assertCommerceEnabled: vi.fn() }));

const { agentOrderStatus } = await import("./agentShop.service.js");

beforeEach(() => {
  vi.clearAllMocks();
  db.shopStore.findUnique.mockResolvedValue({ id: "s1", orgId: "org", commerceEnabled: true });
  db.shopOrder.findMany.mockResolvedValue([]);
});

test("finds orders by the chatter's own contact or a number its owner confirmed, never a typed one", async () => {
  await agentOrderStatus("org", "+1 555 0100");
  expect(db.shopOrder.findMany.mock.calls[0][0].where.OR).toEqual([
    { contact: { identities: { some: { kind: "PHONE", value: "15550100" } } } },
    { customerPhone: "15550100", phoneVerifiedAt: { not: null } },
  ]);
});
