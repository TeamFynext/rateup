import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../../utils/prisma.js", () => ({
  default: { rateupPlan: { findMany: vi.fn(), update: vi.fn() } },
}));

import prisma from "../../../../utils/prisma.js";
import { runTask } from "../task.js";
import { renamePlanDescriptions } from "./renamePlanDescriptions.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as { rateupPlan: Record<string, Mock> };

const plans = [
  {
    id: "p1",
    name: "FREE PLAN",
    description: ["1 team · 1 user", "Automations, templates & chatbots"],
  },
  { id: "p2", name: "PLUS PLAN", description: ["Automations, templates & journeys"] },
  { id: "p3", name: "CUSTOM", description: ["Chatbots, hand-written by staff"] },
];

beforeEach(() => {
  vi.clearAllMocks();
  db.rateupPlan.findMany.mockResolvedValue(plans);
});

describe("renamePlanDescriptions", () => {
  test("a dry run reports the change and writes nothing", async () => {
    const result = await runTask(renamePlanDescriptions, false);

    expect(db.rateupPlan.update).not.toHaveBeenCalled();
    expect(result.summary).toBe("Would update 1 of 3 plans");
    expect(result.lines).toEqual([
      '[dry-run] FREE PLAN: "Automations, templates & chatbots" → "Automations, templates & journeys"',
    ]);
  });

  test("apply rewrites only exact matches, keeping the other lines in order", async () => {
    const result = await runTask(renamePlanDescriptions, true);

    expect(db.rateupPlan.update).toHaveBeenCalledTimes(1);
    expect(db.rateupPlan.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { description: ["1 team · 1 user", "Automations, templates & journeys"] },
    });
    expect(result.details).toEqual({ plans: 3, updated: 1, names: ["FREE PLAN"] });
  });

  test("re-running after apply changes nothing", async () => {
    db.rateupPlan.findMany.mockResolvedValue([
      { id: "p1", name: "FREE PLAN", description: ["Automations, templates & journeys"] },
    ]);
    const result = await runTask(renamePlanDescriptions, true);

    expect(db.rateupPlan.update).not.toHaveBeenCalled();
    expect(result.summary).toBe("Updated 0 of 1 plans");
  });
});
