import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    rateupPlan: { findFirst: vi.fn(), update: vi.fn() },
    subscription: { findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
}));

import prisma from "../../../utils/prisma.js";
import { CATALOG_TIERS } from "../../subscription/catalog.js";
import { UNLIMITED_COUNT } from "../../subscription/subscription.data.js";
import { runTask } from "../task.js";
import { refreshPlanFeatures } from "./refreshPlanFeatures.js";

const ENTERPRISE = CATALOG_TIERS.find((tier) => tier.name === "ENTERPRISE PLAN")!;

/** Only the Enterprise tier exists in these runs, so every other tier is skipped. */
function onlyEnterpriseInCatalog() {
  vi.mocked(prisma.rateupPlan.findFirst).mockImplementation((async (args: any) =>
    args?.where?.name === ENTERPRISE.name
      ? {
          id: "tier-enterprise",
          features: ENTERPRISE.features,
          description: [],
          usdYearlyPrice: null,
        }
      : null) as never);
}

/** An Enterprise subscription whose conversation allowance a contract has capped. */
function cappedAt(orgId: string, conversations: number) {
  const features = structuredClone(ENTERPRISE.features) as any;
  features.whatsapp.conversation.count.max = conversations;
  return { orgId, features };
}

function individualWrites() {
  return vi.mocked(prisma.subscription.update).mock.calls.map((call) => call[0] as any);
}

describe("refreshing plan features", () => {
  beforeEach(() => {
    vi.mocked(prisma.rateupPlan.findFirst).mockReset();
    vi.mocked(prisma.rateupPlan.update)
      .mockReset()
      .mockResolvedValue({} as never);
    vi.mocked(prisma.subscription.findMany)
      .mockReset()
      .mockResolvedValue([] as never);
    vi.mocked(prisma.subscription.update)
      .mockReset()
      .mockResolvedValue({} as never);
    vi.mocked(prisma.subscription.updateMany)
      .mockReset()
      .mockResolvedValue({} as never);
    onlyEnterpriseInCatalog();
  });

  test("keeps a contracted Enterprise cap instead of resetting it to unlimited", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      cappedAt("org-contracted", 200_000),
    ] as never);

    const result = await runTask(refreshPlanFeatures, true);

    // The bulk write has to exclude the org, or it would overwrite the cap moments later.
    expect(vi.mocked(prisma.subscription.updateMany).mock.calls[0][0]).toMatchObject({
      where: { orgId: { notIn: ["org-contracted"] } },
    });

    const written = individualWrites();
    expect(written).toHaveLength(1);
    expect(written[0].where.orgId).toBe("org-contracted");
    expect(written[0].data.features.whatsapp.conversation.count.max).toBe(200_000);
    // Everything the contract did not cap still comes from the tier.
    expect(written[0].data.features.team.count.max).toBe(UNLIMITED_COUNT);
    expect(result.lines.some((line) => line.includes("kept:"))).toBe(true);
  });

  test("an uncapped Enterprise org is refreshed in bulk like everyone else", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      { orgId: "org-unlimited", features: structuredClone(ENTERPRISE.features) },
    ] as never);

    await runTask(refreshPlanFeatures, true);

    expect(vi.mocked(prisma.subscription.updateMany).mock.calls[0][0]).toMatchObject({
      where: { orgId: { notIn: [] } },
    });
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  test("a dry run reports the cap it would keep and writes nothing", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      cappedAt("org-contracted", 200_000),
    ] as never);

    const result = await runTask(refreshPlanFeatures, false);

    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
    expect(result.lines.join("\n")).toContain(
      "org-contracted is contracted at 200,000 conversations / unlimited forms",
    );
  });
});
