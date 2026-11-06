import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/prisma.js", () => ({
  default: { dripStepSetting: { findMany: vi.fn(), update: vi.fn() } },
}));

import prisma from "../../../utils/prisma.js";
import { runTask } from "../task.js";
import { rewriteDashboardPath, rewriteDripEmailLinks } from "./rewriteDripEmailLinks.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as { dripStepSetting: Record<string, Mock> };

describe("rewriteDashboardPath", () => {
  test("moves rules and journeys under Automation", () => {
    expect(rewriteDashboardPath("/dashboard/automation")).toBe("/dashboard/automation/rules");
    expect(rewriteDashboardPath("/dashboard/automation/new?platform=instagram")).toBe(
      "/dashboard/automation/rules/new?platform=instagram",
    );
    expect(rewriteDashboardPath("/dashboard/journeys/j1")).toBe(
      "/dashboard/automation/journeys/j1",
    );
    expect(rewriteDashboardPath("/dashboard/chatbots")).toBe("/dashboard/automation/journeys");
  });

  test("leaves current addresses, other sites and look-alike paths alone", () => {
    expect(rewriteDashboardPath("/dashboard/automation/rules")).toBe("/dashboard/automation/rules");
    expect(rewriteDashboardPath("/dashboard/automation/journeys/j1")).toBe(
      "/dashboard/automation/journeys/j1",
    );
    expect(rewriteDashboardPath("/dashboard/campaigns/new")).toBe("/dashboard/campaigns/new");
    expect(rewriteDashboardPath("/dashboard/settings/teams")).toBe("/dashboard/settings/teams");
    expect(rewriteDashboardPath("/book-a-demo")).toBe("/book-a-demo");
    expect(rewriteDashboardPath("https://rateup.app/dashboard/campaign")).toBe(
      "https://rateup.app/dashboard/campaign",
    );
  });

  test("renames whole segments and keeps the query and hash", () => {
    expect(rewriteDashboardPath("/dashboard/campaign/new")).toBe("/dashboard/campaigns/new");
    expect(rewriteDashboardPath("/dashboard/settings/account#business-hours")).toBe(
      "/dashboard/settings/profile#business-hours",
    );
    expect(rewriteDashboardPath("/dashboard/settings/team/t1")).toBe(
      "/dashboard/settings/teams/t1",
    );
    expect(rewriteDashboardPath("/dashboard/contacts/groups")).toBe(
      "/dashboard/contacts/audiences",
    );
  });

  test("renames the old inbox tab values", () => {
    expect(rewriteDashboardPath("/dashboard/inbox?tab=mine")).toBe("/dashboard/inbox?tab=assigned");
    expect(rewriteDashboardPath("/dashboard/inbox?x=1&tab=new")).toBe(
      "/dashboard/inbox?x=1&tab=unassigned",
    );
    expect(rewriteDashboardPath("/dashboard/inbox?tab=open")).toBe("/dashboard/inbox?tab=open");
  });
});

describe("rewriteDripEmailLinks", () => {
  const saved = {
    subject: "Hi",
    body: "Body",
    cta: { label: "Set up", path: "/dashboard/automation" },
    highlights: [
      { title: "Hours", description: "d", path: "/dashboard/settings/account" },
      { title: "Help", description: "d" },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    db.dripStepSetting.findMany.mockResolvedValue([
      { key: "onb_automations", email: saved },
      {
        key: "onb_team",
        email: {
          subject: "x",
          body: "y",
          cta: { label: "Go", path: "/dashboard/settings/members" },
        },
      },
    ]);
  });

  test("a dry run lists the changes and writes nothing", async () => {
    const result = await runTask(rewriteDripEmailLinks, false);

    expect(db.dripStepSetting.update).not.toHaveBeenCalled();
    expect(result.summary).toBe("Would update 1 of 2 edited emails");
    expect(result.lines).toEqual([
      "[dry-run] onb_automations: /dashboard/automation → /dashboard/automation/rules",
      "[dry-run] onb_automations: /dashboard/settings/account → /dashboard/settings/profile",
    ]);
  });

  test("apply rewrites only the links, keeping the rest of the email", async () => {
    await runTask(rewriteDripEmailLinks, true);

    expect(db.dripStepSetting.update).toHaveBeenCalledTimes(1);
    expect(db.dripStepSetting.update).toHaveBeenCalledWith({
      where: { key: "onb_automations" },
      data: {
        email: {
          ...saved,
          cta: { label: "Set up", path: "/dashboard/automation/rules" },
          highlights: [
            { title: "Hours", description: "d", path: "/dashboard/settings/profile" },
            { title: "Help", description: "d" },
          ],
        },
      },
    });
  });
});
