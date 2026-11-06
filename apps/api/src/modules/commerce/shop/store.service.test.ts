import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const gate = vi.hoisted(() => ({ getSubscriptionGate: vi.fn() }));
vi.mock("../../../utils/prisma.js", () => ({ default: {} }));
vi.mock("../../subscription/subscription.service.js", () => gate);

const { assertCommerceEnabled, commerceEnabled } = await import("./store.service.js");

const later = new Date(Date.now() + 86_400_000).toISOString();
const earlier = new Date(Date.now() - 86_400_000).toISOString();

describe("the Commerce plan gate", () => {
  beforeEach(() => vi.clearAllMocks());

  test("is open when the plan includes the catalog feature and has not expired", async () => {
    gate.getSubscriptionGate.mockResolvedValue({
      expiresAt: later,
      features: { whatsapp: { catalog: { active: true } } },
    });
    expect(await commerceEnabled("org")).toBe(true);
  });

  test("is closed when the feature is off, missing, or the plan expired", async () => {
    gate.getSubscriptionGate.mockResolvedValue({
      expiresAt: later,
      features: { whatsapp: { catalog: { active: false } } },
    });
    expect(await commerceEnabled("org")).toBe(false);
    gate.getSubscriptionGate.mockResolvedValue({ expiresAt: later, features: {} });
    expect(await commerceEnabled("org")).toBe(false);
    gate.getSubscriptionGate.mockResolvedValue({
      expiresAt: earlier,
      features: { whatsapp: { catalog: { active: true } } },
    });
    expect(await commerceEnabled("org")).toBe(false);
    gate.getSubscriptionGate.mockResolvedValue(null);
    expect(await commerceEnabled("org")).toBe(false);
  });

  test("refuses with a plan error the agent tools can report", async () => {
    gate.getSubscriptionGate.mockResolvedValue(null);
    await expect(assertCommerceEnabled("org")).rejects.toMatchObject({
      code: "PLAN_REQUIRED",
      statusCode: 403,
    });
  });
});
